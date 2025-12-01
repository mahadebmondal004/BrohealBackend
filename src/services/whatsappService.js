const axios = require('axios');
const Setting = require('../models/Setting');

class WhatsAppService {
    constructor() {
        this.apiUrl = process.env.WHATSAPP_API_URL;
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    }

    // Get WhatsApp settings from database (admin-configurable)
    async getSettings() {
        const settings = await Setting.find({
            key: { $in: ['whatsapp_api_url', 'whatsapp_phone_number_id', 'whatsapp_access_token', 'whatsapp_enabled'] }
        });

        const config = {};
        settings.forEach(setting => {
            config[setting.key] = setting.value;
        });

        return {
            apiUrl: config.whatsapp_api_url || this.apiUrl,
            phoneNumberId: config.whatsapp_phone_number_id || this.phoneNumberId,
            accessToken: config.whatsapp_access_token || this.accessToken,
            enabled: config.whatsapp_enabled !== false
        };
    }

    // Send OTP via WhatsApp
    async sendOTP(phone, otp) {
        try {
            const config = await this.getSettings();

            if (!config.enabled || !config.accessToken) {
                console.log('WhatsApp not configured. OTP:', otp);
                return { success: true, message: 'WhatsApp not configured (dev mode)' };
            }

            const message = `Your Bro Heal verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nDo not share this code with anyone.`;

            const response = await axios.post(
                `${config.apiUrl}/${config.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: `91${phone}`,
                    type: 'text',
                    text: { body: message }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${config.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                messageId: response.data.messages[0].id
            };
        } catch (error) {
            console.error('WhatsApp OTP Error:', error.response?.data || error.message);
            // Don't fail the request if WhatsApp fails
            return { success: false, error: error.message };
        }
    }

    // Send booking confirmation
    async sendBookingConfirmation(phone, bookingData) {
        try {
            const config = await this.getSettings();

            if (!config.enabled || !config.accessToken) {
                console.log('WhatsApp not configured');
                return { success: true };
            }

            const message = `🎉 Booking Confirmed!\n\n` +
                `Service: ${bookingData.serviceName}\n` +
                `Therapist: ${bookingData.therapistName}\n` +
                `Date: ${bookingData.date}\n` +
                `Time: ${bookingData.time}\n` +
                `Amount: ₹${bookingData.amount}\n\n` +
                `Your therapist will arrive at the scheduled time.\n\n` +
                `Booking ID: ${bookingData.bookingId}`;

            await axios.post(
                `${config.apiUrl}/${config.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: `91${phone}`,
                    type: 'text',
                    text: { body: message }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${config.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return { success: true };
        } catch (error) {
            console.error('WhatsApp Booking Confirmation Error:', error.message);
            return { success: false };
        }
    }

    // Send payment link
    async sendPaymentLink(phone, paymentData) {
        try {
            const config = await this.getSettings();

            if (!config.enabled || !config.accessToken) {
                console.log('WhatsApp not configured');
                return { success: true };
            }

            const message = `✅ Service Completed!\n\n` +
                `Amount: ₹${paymentData.amount}\n\n` +
                `Please complete the payment:\n` +
                `${paymentData.paymentUrl}\n\n` +
                `Booking ID: ${paymentData.bookingId}`;

            await axios.post(
                `${config.apiUrl}/${config.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: `91${phone}`,
                    type: 'text',
                    text: { body: message }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${config.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return { success: true };
        } catch (error) {
            console.error('WhatsApp Payment Link Error:', error.message);
            return { success: false };
        }
    }

    // Send generic notification
    async sendNotification(phone, message) {
        try {
            const config = await this.getSettings();

            if (!config.enabled || !config.accessToken) {
                console.log('WhatsApp not configured');
                return { success: true };
            }

            await axios.post(
                `${config.apiUrl}/${config.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: `91${phone}`,
                    type: 'text',
                    text: { body: message }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${config.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return { success: true };
        } catch (error) {
            console.error('WhatsApp Notification Error:', error.message);
            return { success: false };
        }
    }
}

module.exports = new WhatsAppService();
