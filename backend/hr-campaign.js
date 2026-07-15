const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const { PDFParse } = require('pdf-parse');
const nodemailer = require('nodemailer');
const { getCampaignEmail } = require('./email-template');

const CONTACTS_FILE = path.join(__dirname, 'hr_contacts.json');
const PDF_FILE = path.join(__dirname, 'hr_list.pdf');
const RESUME_FILE = path.join(__dirname, 'resume.pdf');

// Helper sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Checks if the email domain is valid and reachable
 */
async function verifyEmailDomain(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1];
  try {
    const result = await dns.lookup(domain);
    return !!result.address;
  } catch (error) {
    return false;
  }
}

/**
 * Heuristic to separate Title and Company from OCR text after the email
 */
function parseTitleAndCompany(textAfterEmail, email) {
  const text = textAfterEmail.trim();
  if (!text) {
    // Fallback to domain name
    const domain = email.split('@')[1].split('.')[0];
    const company = domain.charAt(0).toUpperCase() + domain.slice(1);
    return { title: 'HR Manager', company };
  }

  // Keywords to split Title and Company
  const splitKeywords = [
    'Human Resources',
    'Talent Acquisition',
    'Recruitment',
    'Recruiter',
    'People & Culture',
    'Staffing',
    'HR - Global',
    'HR Manager',
    'HR Head',
    'HR',
    'Head',
    'VP',
    'Director',
    'AVP'
  ];

  // Try to find the last keyword position
  let splitIndex = -1;
  let matchedKeyword = '';

  for (const keyword of splitKeywords) {
    const idx = text.toLowerCase().lastIndexOf(keyword.toLowerCase());
    if (idx !== -1 && idx > splitIndex) {
      splitIndex = idx;
      matchedKeyword = keyword;
    }
  }

  if (splitIndex !== -1) {
    const title = text.slice(0, splitIndex + matchedKeyword.length).trim();
    const company = text.slice(splitIndex + matchedKeyword.length).trim();
    return {
      title: title || 'HR Professional',
      company: company || 'Their Company'
    };
  }

  // Default fallback if no keywords match
  // Take first half as title and second half as company, or split by space count
  const words = text.split(/\s+/);
  if (words.length > 2) {
    const mid = Math.ceil(words.length / 2);
    return {
      title: words.slice(0, mid).join(' '),
      company: words.slice(mid).join(' ')
    };
  }

  return { title: 'HR Professional', company: text };
}

/**
 * Parses hr_list.pdf and generates hr_contacts.json
 */
async function parseHRListPDF() {
  if (!fs.existsSync(PDF_FILE)) {
    throw new Error('hr_list.pdf not found. Please upload or place hr_list.pdf in the backend directory.');
  }

  const dataBuffer = fs.readFileSync(PDF_FILE);
  const pdfParser = new PDFParse({ data: dataBuffer });
  const pdfData = await pdfParser.getText();
  const text = pdfData.text;

  const lines = text.split('\n');
  const contacts = [];
  let idCounter = 1;

  // Regex to detect email address
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

  for (const line of lines) {
    if (line.includes('\t')) {
      const cols = line.split('\t').map(x => x.trim()).filter(x => x.length > 0);
      // Find the email index in the columns
      const emailIdx = cols.findIndex(col => emailRegex.test(col));
      
      if (emailIdx !== -1) {
        const email = cols[emailIdx];
        
        // Name is the element before the email, with SNo prefix stripped
        let nameRaw = cols[emailIdx - 1] || 'HR Manager';
        const name = nameRaw.replace(/^\d+\s+/, '').trim();
        
        // Title is usually after email
        const title = cols[emailIdx + 1] || 'HR Professional';
        
        // Company is usually after title
        const company = cols[emailIdx + 2] || 'Their Company';

        contacts.push({
          id: idCounter++,
          name,
          email,
          company,
          title,
          status: 'pending',
          error: null,
          sentAt: null
        });
      }
    } else {
      // Fallback: Parse space-separated or other layouts using regex
      const match = line.match(emailRegex);
      if (match) {
        const email = match[1];
        const emailIndex = line.indexOf(email);
        
        let textBefore = line.slice(0, emailIndex).trim();
        textBefore = textBefore.replace(/^\d+\s+/, '');
        const name = textBefore || 'HR Manager';

        const textAfter = line.slice(emailIndex + email.length).trim();
        const { title, company } = parseTitleAndCompany(textAfter, email);

        contacts.push({
          id: idCounter++,
          name,
          email,
          company,
          title,
          status: 'pending',
          error: null,
          sentAt: null
        });
      }
    }
  }

  // Save parsed contacts to file
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
  return contacts;
}

/**
 * Sends a batch of cold emails to the parsed HR list
 */
async function sendCampaignBatch(limit = 10, delayMs = 5000, smtpSettings) {
  if (!fs.existsSync(CONTACTS_FILE)) {
    throw new Error('No parsed contacts found. Please parse the PDF first.');
  }

  // Load contacts
  let contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
  const pending = contacts.filter(c => c.status === 'pending');

  if (pending.length === 0) {
    return { sentCount: 0, message: 'All contacts have already been processed.' };
  }

  const batch = pending.slice(0, limit);

  // Setup SMTP Transporter
  const host = smtpSettings?.smtpHost || process.env.SMTP_HOST;
  const port = parseInt(smtpSettings?.smtpPort || process.env.SMTP_PORT || '587');
  const user = smtpSettings?.smtpUser || process.env.SMTP_USER;
  const pass = smtpSettings?.smtpPass || process.env.SMTP_PASS;
  const fromEmail = smtpSettings?.senderEmail || process.env.SENDER_EMAIL || user;

  if (!host || !user || !pass) {
    throw new Error('SMTP Configurations are missing. Please complete SMTP settings.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  // Verify transporter connectivity
  await transporter.verify();

  // Check if Resume attachment exists
  const attachments = [];
  if (fs.existsSync(RESUME_FILE)) {
    attachments.push({
      filename: 'Vaibhav_Pandey_Resume.pdf',
      path: RESUME_FILE
    });
  } else {
    console.warn('Warning: resume.pdf not found in backend directory. Sending email without attachment.');
  }

  const sentList = [];

  for (let i = 0; i < batch.length; i++) {
    const contact = batch[i];
    
    // Staggered delay between emails (except the first one)
    if (i > 0 && delayMs > 0) {
      await sleep(delayMs);
    }

    // Verify email domain first to catch bouncebacks (dead/inactive domains)
    const isValidDomain = await verifyEmailDomain(contact.email);
    if (!isValidDomain) {
      contact.status = 'invalid';
      contact.error = 'Domain inactive / No MX records found';
      console.warn(`Skipped sending to ${contact.name} (${contact.email}) - Invalid Domain`);
      
      sentList.push(contact);
      contacts = contacts.map(c => c.id === contact.id ? contact : c);
      fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
      continue;
    }

    const { subject, html, text: textBody } = getCampaignEmail(contact.name, contact.company);

    try {
      await transporter.sendMail({
        from: `"Vaibhav Pandey" <${fromEmail}>`,
        to: contact.email,
        subject,
        text: textBody,
        html,
        attachments
      });

      contact.status = 'sent';
      contact.sentAt = new Date().toISOString();
      contact.error = null;
      console.log(`Successfully sent email to ${contact.name} (${contact.email})`);
    } catch (err) {
      contact.status = 'failed';
      contact.error = err.message || 'Send failed';
      console.error(`Failed to send email to ${contact.name}:`, err);
    }

    sentList.push(contact);

    // Save progress after each email to prevent data loss or duplicate sends in case of crash
    // Update main contacts list and write to file
    contacts = contacts.map(c => c.id === contact.id ? contact : c);
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
  }

  return {
    sentCount: sentList.filter(c => c.status === 'sent').length,
    failedCount: sentList.filter(c => c.status === 'failed').length,
    invalidCount: sentList.filter(c => c.status === 'invalid').length,
    results: sentList
  };
}

module.exports = {
  parseHRListPDF,
  sendCampaignBatch,
  CONTACTS_FILE,
  PDF_FILE,
  RESUME_FILE
};
