const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

/**
 * Create Nodemailer Transporter with Brevo SMTP dynamically
 */
const getTransporter = () => {
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;

    if (!user || !pass) {
        throw new Error('Missing SMTP credentials: SMTP_USER and SMTP_PASSWORD must be defined in the server .env file.');
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
        port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587),
        secure: false, // Brevo uses port 587 with STARTTLS (secure: false)
        auth: {
            user,
            pass
        }
    });
};

/**
 * Send Email using Brevo SMTP
 * Supports both function signatures:
 *  1. sendEmail(to, subject, html)
 *  2. sendEmail({ bookingId, email, to, subject, html, message, type })
 */
async function sendEmail(targetOrOptions, maybeSubject, maybeHtml) {
    let to;
    let subject;
    let html;
    let text;
    let bookingId = null;
    let type = 'general';

    if (typeof targetOrOptions === 'object' && targetOrOptions !== null) {
        // Object options pattern
        to = targetOrOptions.to || targetOrOptions.email || targetOrOptions.patientEmail;
        subject = targetOrOptions.subject;
        html = targetOrOptions.html || (targetOrOptions.message ? `<div>${targetOrOptions.message.replace(/\n/g, '<br>')}</div>` : '');
        text = targetOrOptions.message || targetOrOptions.text || '';
        bookingId = targetOrOptions.bookingId || null;
        type = targetOrOptions.type || 'general';
    } else {
        // Positional arguments: sendEmail(to, subject, html)
        to = targetOrOptions;
        subject = maybeSubject;
        html = maybeHtml;
        text = typeof maybeHtml === 'string' ? maybeHtml.replace(/<[^>]+>/g, ' ') : '';
    }

    const fromAddress = process.env.MAIL_FROM || process.env.EMAIL_FROM || 'Siddhaka Ayurveda <no-reply@siddhaka.com>';

    try {
        console.log(`[Brevo SMTP] Sending Email to ${to}: [${subject}]`);

        const mailOptions = {
            from: fromAddress,
            to,
            subject,
            text,
            html
        };

        const transporter = getTransporter();
        const info = await transporter.sendMail(mailOptions);
        console.log('[Brevo SMTP] Email sent successfully:', info.messageId || info.response);

        // Optionally record in EmailLog if Mongoose is connected
        try {
            const emailLog = new EmailLog({
                bookingId: bookingId || undefined,
                patientEmail: to,
                subject,
                message: text || html,
                type: ['booking_created', 'booking_updated', 'booking_cancelled', 'booking_confirmed'].includes(type) ? type : 'booking_created',
                status: 'sent',
                providerResponse: info
            });
            await emailLog.save();
        } catch (logErr) {
            // Logging failure should not disrupt email execution
            console.warn('[Brevo SMTP] Could not save email log:', logErr.message);
        }

        return info;
    } catch (error) {
        console.error('[Brevo SMTP] Email Sending Error:', error);

        try {
            const emailLog = new EmailLog({
                bookingId: bookingId || undefined,
                patientEmail: to,
                subject,
                message: text || html || '',
                type: ['booking_created', 'booking_updated', 'booking_cancelled', 'booking_confirmed'].includes(type) ? type : 'booking_created',
                status: 'failed',
                providerResponse: { error: error.message }
            });
            await emailLog.save();
        } catch (logErr) {
            console.warn('[Brevo SMTP] Could not save failed email log:', logErr.message);
        }

        throw error;
    }
}

module.exports = {
    getTransporter,
    sendEmail,
    get transporter() {
        return getTransporter();
    }
};
