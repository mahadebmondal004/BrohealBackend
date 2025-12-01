const nodemailer = require('nodemailer');
const Setting = require('../models/Setting');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    // Initialize transporter with env variables
    initializeTransporter() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT),
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    // Get email settings from database (admin-configurable)
    async getSettings() {
        const settings = await Setting.find({
            key: { 
                $in: ['email_host', 'email_port', 'email_user', 'email_password', 'email_from', 'email_enabled'] 
            }
        });

        const config = {};
        settings.forEach(setting => {
            config[setting.key] = setting.value;
        });

        if (config.email_host && config.email_user) {
            this.transporter = nodemailer.createTransport({
                host: config.email_host,
                port: parseInt(config.email_port) || 587,
                secure: false,
                auth: {
                    user: config.email_user,
                    pass: config.email_password
                }
            });
        }

        return {
            from: config.email_from || process.env.EMAIL_FROM,
            enabled: config.email_enabled !== false
        };
    }

    // Send OTP email
    async sendOTP(email, otp) {
        try {
            const config = await this.getSettings();

            if (!config.enabled) {
                console.log('Email not configured. OTP:', otp);
                return { success: true };
            }

            const mailOptions = {
                from: config.from,
                to: email,
                subject: 'Your Bro Heal Verification Code',
                html: `
                    <div style="font-family: Arial; max-width: 600px;">
                        <h2 style="color:#3b82f6;">Bro Heal</h2>
                        <p>Your OTP is:</p>
                        <h1 style="background:#f3f4f6; padding:20px; text-align:center; letter-spacing:8px;">
                            ${otp}
                        </h1>
                    </div>
                `
            };

            await this.transporter.sendMail(mailOptions);
            return { success: true };
        } catch (error) {
            console.error('Email OTP Error:', error.message);
            return { success: false };
        }
    }

    // Send booking confirmation
    async sendBookingConfirmation(email, bookingData) {
        try {
            const config = await this.getSettings();

            if (!config.enabled) {
                console.log('Email not configured');
                return { success: true };
            }

            const mailOptions = {
                from: config.from,
                to: email,
                subject: 'Booking Confirmed - Bro Heal',
                html: `
                    <div style="font-family: Arial; max-width: 600px;">
                        <h2 style="color:#3b82f6;">Booking Confirmed! 🎉</h2>
                        <div style="background:#f9fafb; padding:20px; border-radius:8px;">
                            <p><strong>Service:</strong> ${bookingData.serviceName}</p>
                            <p><strong>Therapist:</strong> ${bookingData.therapistName}</p>
                            <p><strong>Date:</strong> ${bookingData.date}</p>
                            <p><strong>Time:</strong> ${bookingData.time}</p>
                            <p><strong>Amount:</strong> ₹${bookingData.amount}</p>
                        </div>
                    </div>
                `
            };

            await this.transporter.sendMail(mailOptions);
            return { success: true };
        } catch (error) {
            console.error('Email Booking Error:', error.message);
            return { success: false };
        }
    }

    // Send payment receipt
    async sendPaymentReceipt(email, paymentData) {
        try {
            const config = await this.getSettings();

            if (!config.enabled) {
                console.log('Email not configured');
                return { success: true };
            }

            const mailOptions = {
                from: config.from,
                to: email,
                subject: 'Payment Successful - Bro Heal',
                html: `
                    <div style="font-family: Arial; max-width: 600px;">
                        <h2 style="color:#10b981;">Payment Successful</h2>
                        <div style="background:#f9fafb; padding:20px; border-radius:8px;">
                            <p><strong>Amount:</strong> ₹${paymentData.amount}</p>
                            <p><strong>Transaction ID:</strong> ${paymentData.transactionId}</p>
                            <p><strong>Booking ID:</strong> ${paymentData.bookingId}</p>
                            <p><strong>Date:</strong> ${paymentData.date}</p>
                        </div>
                    </div>
                `
            };

            await this.transporter.sendMail(mailOptions);
            return { success: true };
        } catch (error) {
            console.error('Email Payment Error:', error.message);
            return { success: false };
        }
    }

    // Send generic email
    async sendEmail(to, subject, html) {
        try {
            const config = await this.getSettings();

            if (!config.enabled) {
                console.log('Email not configured');
                return { success: true };
            }

            const mailOptions = {
                from: config.from,
                to,
                subject,
                html
            };

            await this.transporter.sendMail(mailOptions);
            return { success: true };
        } catch (error) {
            console.error('Email Send Error:', error.message);
            return { success: false };
        }
    }
}

module.exports = new EmailService();
