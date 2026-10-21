const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

admin.initializeApp();

const SMTP_HOST = defineSecret('SMTP_HOST');
const SMTP_PORT = defineSecret('SMTP_PORT');
const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');
const EMAIL_FROM = defineSecret('EMAIL_FROM');
const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = defineSecret('TWILIO_PHONE_NUMBER');

exports.notifyEmployeeRegistrationDecision = onDocumentUpdated(
  {
    document: 'employees/{employeeId}',
    secrets: [
      SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM,
      TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER,
    ],
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const oldStatus = String(before.status || '').toLowerCase();
    const newStatus = String(after.status || '').toLowerCase();
    if (oldStatus !== 'pending' || !['approved', 'rejected'].includes(newStatus)) return;

    const name = String(after.name || 'Employee').trim();
    const email = String(after.email || '').trim();
    const phone = String(after.phone || '').trim();
    const approved = newStatus === 'approved';
    const subject = approved
      ? 'Your Arshith Connect registration is approved'
      : 'Update on your Arshith Connect registration';
    const message = approved
      ? `Hello ${name}, your Arshith Connect registration has been approved. You can now log in using your registered account. Thank you.`
      : `Hello ${name}, your Arshith Connect registration request was not approved. Please contact your administrator for more information.`;

    const outcomes = [];

    if (email) {
      try {
        const port = Number(SMTP_PORT.value() || 587);
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST.value(),
          port,
          secure: port === 465,
          auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
        });
        await transporter.sendMail({
          from: EMAIL_FROM.value(),
          to: email,
          subject,
          text: message,
        });
        outcomes.push('email sent');
      } catch (error) {
        console.error('Registration notification email failed:', error);
      }
    } else {
      console.warn(`No email address on employee document ${event.params.employeeId}`);
    }

    if (phone) {
      try {
        const client = twilio(TWILIO_ACCOUNT_SID.value(), TWILIO_AUTH_TOKEN.value());
        await client.messages.create({
          body: message,
          from: TWILIO_PHONE_NUMBER.value(),
          to: phone,
        });
        outcomes.push('SMS sent');
      } catch (error) {
        console.error('Registration notification SMS failed:', error);
      }
    } else {
      console.warn(`No phone number on employee document ${event.params.employeeId}`);
    }

    console.log(`Registration decision notification for ${event.params.employeeId}: ${outcomes.join(', ') || 'no notifications sent'}`);
  }
);
