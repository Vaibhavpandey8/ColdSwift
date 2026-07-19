const nodemailer = require('nodemailer');
require('dotenv').config();

console.log("Checking SMTP Configuration...");
console.log("Host:", process.env.SMTP_HOST);
console.log("Port:", process.env.SMTP_PORT);
console.log("User:", process.env.SMTP_USER);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Verification Failed!");
    console.error(error);
  } else {
    console.log("✅ SMTP Connection is successfully Verified and Ready!");
  }
  process.exit();
});
