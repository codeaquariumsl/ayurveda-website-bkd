const EmailLog = require('../models/EmailLog');

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
        console.log(`Sending Email to ${email}: [${subject}] ${message}`);

        // Mocking Email provider call (e.g., Nodemailer, SendGrid, etc.)
        const isSuccess = true;
        const providerResponse = { mockId: 'email_mock_' + Date.now() };

        const emailLog = new EmailLog({
            bookingId,
            patientEmail: email,
            subject,
            message,
            type,
            status: isSuccess ? 'sent' : 'failed',
            providerResponse
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
