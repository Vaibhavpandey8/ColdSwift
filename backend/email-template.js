/**
 * Generates a professional SDE job application cold email template.
 * @param {string} hrName - Name of the HR Coordinator.
 * @param {string} companyName - Name of the target company.
 * @returns {object} - Object containing email subject, HTML body, and plain text body.
 */
function getCampaignEmail(hrName = 'Hiring Team', companyName = 'your company') {
  const subject = `Application for Software Development Engineer (SDE) role - Vaibhav Pandey`;
  
  const text = `
Dear ${hrName},

I hope this email finds you well.

My name is Vaibhav Pandey. I am currently pursuing my M.Tech in Computer Science and Engineering at NSUT Delhi (GATE Score: 94.19 percentile) and holding a B.Tech in CSE. I am writing to express my strong interest in Software Development Engineer (SDE) / Software Developer roles at ${companyName}.

Key highlights of my profile include:
- Internship Experience: As a Software Engineer Intern at Ornate TechnoServices, I developed scalable RESTful APIs (Node.js/Express) and responsive front-end components (React.js), improving database efficiency and user interactions.
- Full-Stack Projects: 
  * YatraMitra (Bus Booking Platform): Next.js SSR portal and React CRM dashboard with Socket.io real-time seat sync. (Code: https://github.com/Vaibhavpandey8/YatraMitra)
  * MealCraft (AI Planner): Meal planning platform integrated with Stripe payment gateways. (Live: https://mealcraft-ai.vercel.app/)
- Technical Skills: JavaScript (ES6+), C++, Node.js, Express.js, React.js, Next.js, MongoDB, SQL, Data Structures & Algorithms (DSA), and OOPS.

I have attached my resume for your review. I would appreciate the opportunity to discuss how my technical skills and internship experience align with the SDE positions at ${companyName}.

Thank you for your time and consideration.

Best regards,

Vaibhav Pandey
Delhi, India
Phone: +91-8178847034
Email: vaibhavpandey729@gmail.com
LinkedIn: https://linkedin.com/in/vaibhav-pandey
GitHub: https://github.com/Vaibhavpandey8
`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #4f46e5; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">Opportunity Discussion: SDE Role</h2>
      
      <p>Dear ${hrName},</p>
      
      <p>I hope you are doing well.</p>
      
      <p>My name is <strong>Vaibhav Pandey</strong>. I am currently pursuing my <strong>M.Tech in Computer Science and Engineering at NSUT Delhi</strong> (secured <strong>94.19 percentile in GATE CSE</strong>) and hold a B.Tech in CSE. I am writing to explore potential opportunities for a <strong>Software Development Engineer (SDE)</strong> role at <strong>${companyName}</strong>.</p>
      
      <p>With hands-on experience in full-stack JavaScript development and algorithm design, here is a summary of what I can bring to your engineering team:</p>
      
      <ul style="padding-left: 20px; margin-bottom: 20px;">
        <li style="margin-bottom: 10px;">
          <strong>Internship Experience:</strong> As a Software Engineer Intern at <em>Ornate TechnoServices</em>, I built and maintained scalable server-side REST APIs (Node.js/Express) and responsive client components (React.js), optimizing database queries to boost speed and resource efficiency.
        </li>
        <li style="margin-bottom: 10px;">
          <strong>Full-Stack Architecture:</strong> Developed and deployed complex ecosystems:
          <ul style="padding-left: 20px; margin-top: 5px;">
            <li><strong>YatraMitra:</strong> Bus Booking System with Socket.io real-time seating sync and JWT role-based security. (<a href="https://github.com/Vaibhavpandey8/YatraMitra" style="color: #4f46e5; text-decoration: none;">GitHub Code</a>)</li>
            <li><strong>MealCraft:</strong> AI Meal Planner and Ordering site featuring custom GSAP animations and Stripe integration. (<a href="https://mealcraft-ai.vercel.app/" style="color: #4f46e5; text-decoration: none;">Live Demo</a>)</li>
          </ul>
        </li>
        <li style="margin-bottom: 10px;">
          <strong>Technical Stack:</strong> C++, JavaScript (ES6+), Node.js, Express.js, React.js, Next.js, MongoDB, SQL, Data Structures & Algorithms (DSA), and Object-Oriented Programming (OOPS).
        </li>
      </ul>
      
      <p>I have attached my resume to this email for your perusal. I would love the chance to discuss how my skill set and drive can add value to your projects at <strong>${companyName}</strong>.</p>
      
      <p>Thank you for your time and consideration.</p>
      
      <p style="margin-bottom: 0;">Warm regards,</p>
      <p style="margin-top: 5px; font-weight: bold; color: #4f46e5;">Vaibhav Pandey</p>
      
      <div style="font-size: 13px; color: #718096; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
        📍 Delhi, India &nbsp;|&nbsp; 📞 +91-8178847034 &nbsp;|&nbsp; ✉️ <a href="mailto:vaibhavpandey729@gmail.com" style="color: #4f46e5; text-decoration: none;">vaibhavpandey729@gmail.com</a><br>
        🔗 <a href="https://linkedin.com/in/vaibhav-pandey" style="color: #4f46e5; text-decoration: none;">LinkedIn Profile</a> &nbsp;|&nbsp; 🔗 <a href="https://github.com/Vaibhavpandey8" style="color: #4f46e5; text-decoration: none;">GitHub Portfolio</a>
      </div>
    </div>
  `;

  return {
    subject,
    text,
    html
  };
}

module.exports = { getCampaignEmail };
