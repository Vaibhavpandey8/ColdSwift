const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  parseHRListPDF,
  sendCampaignBatch,
  CONTACTS_FILE,
  PDF_FILE,
  RESUME_FILE
} = require('./hr-campaign');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing (with increased limit for PDF base64 uploads)
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Serve static frontend files from build directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API Status check
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running smoothly.' });
});

// Campaign Endpoint: Get status of files and sending progression
app.get('/api/campaign/status', (req, res) => {
  const hasHRList = fs.existsSync(PDF_FILE);
  const hasResume = fs.existsSync(RESUME_FILE);
  const hasContacts = fs.existsSync(CONTACTS_FILE);

  let stats = { total: 0, pending: 0, sent: 0, failed: 0 };
  
  if (hasContacts) {
    try {
      const contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
      stats.total = contacts.length;
      stats.pending = contacts.filter(c => c.status === 'pending').length;
      stats.sent = contacts.filter(c => c.status === 'sent').length;
      stats.failed = contacts.filter(c => c.status === 'failed').length;
    } catch (e) {
      console.error('Error reading contacts file', e);
    }
  }

  res.json({
    hasHRList,
    hasResume,
    hasContacts,
    stats
  });
});

// Campaign Endpoint: Upload PDF files via base64 raw string
app.post('/api/campaign/upload', (req, res) => {
  const { fileType, base64Data } = req.body; // fileType: 'hr_list' or 'resume'
  
  if (!fileType || !base64Data) {
    return res.status(400).json({ error: 'Missing fileType or base64Data.' });
  }

  let filePath;
  if (fileType === 'hr_list') {
    filePath = PDF_FILE;
  } else if (fileType === 'resume') {
    filePath = RESUME_FILE;
  } else {
    return res.status(400).json({ error: 'Invalid fileType. Must be "hr_list" or "resume".' });
  }

  try {
    // Strip base64 metadata headers if present (e.g. data:application/pdf;base64,...)
    const cleanBase64 = base64Data.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    fs.writeFileSync(filePath, buffer);
    res.json({ success: true, message: `${fileType === 'hr_list' ? 'hr_list.pdf' : 'resume.pdf'} uploaded successfully.` });
  } catch (error) {
    console.error('File Upload Error:', error);
    res.status(500).json({ error: 'Failed to save file: ' + error.message });
  }
});

// Campaign Endpoint: Parse PDF and extract contacts
app.post('/api/campaign/parse', async (req, res) => {
  try {
    const contacts = await parseHRListPDF();
    res.json({ success: true, count: contacts.length, contacts });
  } catch (error) {
    console.error('PDF Parse Error:', error);
    res.status(500).json({ error: 'Failed to parse PDF list: ' + error.message });
  }
});

// Campaign Endpoint: Get contacts list
app.get('/api/campaign/contacts', (req, res) => {
  if (!fs.existsSync(CONTACTS_FILE)) {
    return res.json({ contacts: [] });
  }

  try {
    const contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
    res.json({ contacts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read contacts: ' + error.message });
  }
});

// Campaign Endpoint: Send a batch of emails
app.post('/api/campaign/send', async (req, res) => {
  const { limit, delayMs } = req.body;
  
  try {
    const result = await sendCampaignBatch(
      limit ? parseInt(limit) : 10,
      delayMs ? parseInt(delayMs) : 5000
    );
    res.json(result);
  } catch (error) {
    console.error('Campaign Sending Error:', error);
    res.status(500).json({ error: 'Campaign sending failed: ' + error.message });
  }
});

// Campaign Endpoint: Reset campaign statistics
app.post('/api/campaign/reset', (req, res) => {
  const { action } = req.body; // 'all' (reset status to pending) or 'delete' (delete files)

  try {
    if (action === 'delete') {
      if (fs.existsSync(CONTACTS_FILE)) fs.unlinkSync(CONTACTS_FILE);
      if (fs.existsSync(PDF_FILE)) fs.unlinkSync(PDF_FILE);
      // We don't delete the resume by default since it might be re-used
      return res.json({ success: true, message: 'Campaign files deleted and reset completed.' });
    }

    // Default action: Reset status to pending
    if (fs.existsSync(CONTACTS_FILE)) {
      let contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
      contacts = contacts.map(c => ({
        ...c,
        status: 'pending',
        error: null,
        sentAt: null
      }));
      fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
      return res.json({ success: true, message: 'All contact statuses reset to pending.' });
    }
    
    res.status(400).json({ error: 'No contacts file found to reset.' });
  } catch (error) {
    res.status(500).json({ error: 'Reset failed: ' + error.message });
  }
});

// SPA routing fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
