const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

/**
 * Configure Nodemailer Transporter
 */
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Send Email and log the status
 * @param {Object} options 
 * @param {string} options.bookingId
 * @param {string} options.email
 * @param {string} options.subject
 * @param {string} options.message
 * @param {string} options.type
 */
const sendEmail = async ({ bookingId, email, subject, message, type }) => {
    try {
        console.log(`Sending Email to ${email}: [${subject}]`);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: subject,
            text: message,
            html: `<div>${message.replace(/\n/g, '<br>')}</div>`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);

        const emailLog = new EmailLog({
            bookingId,
            patientEmail: email,
            subject,
            message,
            type,
            status: 'sent',
            providerResponse: info
        });

        await emailLog.save();
        return emailLog;
    } catch (error) {
        console.error('Email Sending Error:', error);

        const emailLog = new EmailLog({
            bookingId,
            patientEmail: email,
            subject,
            message,
            type,
            status: 'failed',
            providerResponse: { error: error.message }
        });

        await emailLog.save();
        throw error;
    }
};

module.exports = {
    sendEmail
};

