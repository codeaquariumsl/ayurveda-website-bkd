const WhatsappLog = require('../models/WhatsappLog');

/**
 * Send WhatsApp message and log the status in database
 * @param {Object} options
 * @param {string} options.bookingId - Booking ObjectId
 * @param {string} [options.phone] - Recipient phone number (defaults to process.env.OWNER_WHATSAPP_NUMBER)
 * @param {string} options.message - Message body
 * @param {string} options.type - Notification type (e.g. 'booking_created')
 */
const sendWhatsApp = async (options = {}) => {
    const { bookingId, phone, message, type, templateName, templateLanguage, templateComponents } = options;
    const rawRecipientPhone = phone || process.env.OWNER_WHATSAPP_NUMBER;
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    let apiUrl = process.env.WHATSAPP_API_URL;

    // Format phone number for Meta WhatsApp Cloud API (digits only, e.g. 94705488844)
    const cleanPhone = rawRecipientPhone ? rawRecipientPhone.replace(/[^0-9]/g, '') : '';

    if (!cleanPhone) {
        console.warn('[WhatsApp Service] Warning: No valid recipient phone number or OWNER_WHATSAPP_NUMBER defined.');
    }

    if (cleanPhone === '94705488844') {
        console.warn('[WhatsApp Service] Warning: Recipient number is set to business sender number (94705488844). Meta Cloud API does not allow sending a message to itself. Please update OWNER_WHATSAPP_NUMBER in .env to your personal mobile number.');
    }

    // Auto-construct Meta Graph API URL if WHATSAPP_API_URL is empty but PHONE_NUMBER_ID is provided
    if ((!apiUrl || apiUrl.trim() === '') && phoneNumberId) {
        apiUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    }

    try {
        console.log(`[WhatsApp Service] Preparing WhatsApp message for ${cleanPhone || 'unknown'}...`);

        let isSuccess = true;
        let providerResponse = null;

        if (apiUrl && apiUrl.trim() !== '' && apiToken) {
            console.log(`[WhatsApp Service] Sending message via Meta Cloud API (${apiUrl})...`);

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`
            };

            // Official Meta WhatsApp Cloud API payload format
            let payload;
            if (type === 'template' || templateName) {
                payload = {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanPhone,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: templateLanguage || 'en' },
                        components: templateComponents || []
                    }
                };
            } else {
                payload = {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanPhone,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: message
                    }
                };
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => ({ statusText: response.statusText }));
            providerResponse = data;

            if (!response.ok) {
                isSuccess = false;
                console.error('[WhatsApp Service] Meta Cloud API Error Response:', data);
                if (data.error && data.error.code === 100) {
                    console.warn('[WhatsApp Service] Note: Meta Cloud API does not allow sending a message from a WhatsApp Business number to itself. Please set OWNER_WHATSAPP_NUMBER in .env to your personal mobile number (e.g. +9477xxxxxxx).');
                }
            } else {
                console.log('[WhatsApp Service] WhatsApp message sent successfully via Meta API:', data);
            }
        } else {
            console.log(`[WhatsApp Service] Mock sending (Meta API token or Phone Number ID missing):`);
            console.log(message);
            providerResponse = { mockId: 'wa_mock_' + Date.now(), note: 'API URL or Token not configured' };
        }

        const whatsappLog = new WhatsappLog({
            bookingId,
            recipientPhone: rawRecipientPhone || 'N/A',
            message,
            type,
            status: isSuccess ? 'sent' : 'failed',
            providerResponse
        });

        await whatsappLog.save();
        return whatsappLog;
    } catch (error) {
        console.error('[WhatsApp Service] Exception:', error);

        const whatsappLog = new WhatsappLog({
            bookingId,
            recipientPhone: rawRecipientPhone || 'N/A',
            message,
            type,
            status: 'failed',
            providerResponse: { error: error.message }
        });

        await whatsappLog.save();
        throw error;
    }
};

module.exports = {
    sendWhatsApp
};
