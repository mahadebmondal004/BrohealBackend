const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    phone: {
        type: String,
        index: true,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    email: {
        type: String,
        index: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    otpHash: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    attempts: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Validation: Ensure either phone or email is provided
otpSchema.pre('save', function (next) {
    if (!this.phone && !this.email) {
        next(new Error('Either phone or email is required'));
    } else {
        next();
    }
});

// TTL index to auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


module.exports = mongoose.model('Otp', otpSchema);
