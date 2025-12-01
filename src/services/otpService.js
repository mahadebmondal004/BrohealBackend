const crypto = require('crypto');
const Otp = require('../models/Otp');

class OtpService {
    // Generate 6-digit OTP
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Hash OTP using SHA256
    hashOTP(otp) {
        return crypto.createHash('sha256').update(otp).digest('hex');
    }

    // Create and store OTP (supports both phone and email)
    async createOTP(phone, email = null) {
        const otp = this.generateOTP();
        const otpHash = this.hashOTP(otp);
        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

        // Delete any existing OTPs for this phone or email
        if (phone) {
            await Otp.deleteMany({ phone });
        }
        if (email) {
            await Otp.deleteMany({ email });
        }

        // Create new OTP
        const otpData = {
            otpHash,
            expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
            attempts: 0
        };

        if (phone) otpData.phone = phone;
        if (email) otpData.email = email;

        await Otp.create(otpData);

        return otp;
    }

    // Verify OTP (supports both phone and email)
    async verifyOTP(phone = null, otp, email = null) {
        const query = {
            expiresAt: { $gt: new Date() },
            verified: false
        };

        if (phone) {
            query.phone = phone;
        } else if (email) {
            query.email = email;
        } else {
            return {
                success: false,
                message: 'Phone or email is required'
            };
        }

        const otpRecord = await Otp.findOne(query);

        if (!otpRecord) {
            return {
                success: false,
                message: 'OTP expired or not found'
            };
        }

        // Check max attempts
        const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;
        if (otpRecord.attempts >= maxAttempts) {
            await Otp.deleteOne({ _id: otpRecord._id });
            return {
                success: false,
                message: 'Maximum verification attempts exceeded'
            };
        }

        // Verify OTP hash
        const otpHash = this.hashOTP(otp);

        if (otpHash !== otpRecord.otpHash) {
            // Increment attempts
            otpRecord.attempts += 1;
            await otpRecord.save();

            return {
                success: false,
                message: 'Invalid OTP',
                attemptsLeft: maxAttempts - otpRecord.attempts
            };
        }

        // Mark as verified and delete
        await Otp.deleteOne({ _id: otpRecord._id });

        return {
            success: true,
            message: 'OTP verified successfully'
        };
    }
}

module.exports = new OtpService();
