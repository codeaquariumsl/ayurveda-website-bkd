const SmsLog = require('../models/SmsLog');

/**
 * Send SMS and log the status
 * @param {Object} options 
 * @param {string} options.bookingId
 * @param {string} options.phone
 * @param {string} options.message
 * @param {string} options.type
 */
const sendSMS = async ({ bookingId, phone, message, type }) => {
    try {
        console.log(`Sending SMS to ${phone}: ${message}`);

        // Mocking SMS provider call
        // In a real scenario, you would call Twilio, Vonage, or another SMS gateway API here.
        // Example:
        // const response = await smsProvider.send({ to: phone, body: message });

        const isSuccess = true; // Assume success for this mock
        const providerResponse = { mockId: 'mock_' + Date.now() };

        const smsLog = new SmsLog({
            bookingId,
            patientPhone: phone,
            message,
            type,
            status: isSuccess ? 'sent' : 'failed',
            providerResponse
        });

        await smsLog.save();
        return smsLog;
    } catch (error) {
        console.error('SMS Sending Error:', error);

        const smsLog = new SmsLog({
            bookingId,
            patientPhone: phone,
            message,
            type,
            status: 'failed',
            providerResponse: { error: error.message }
        });

        await smsLog.save();
        throw error;
    }
};

module.exports = {
    sendSMS
};
