const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    referrerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    referralCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        index: true
    },
    referredUsers: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        registeredAt: {
            type: Date,
            default: Date.now
        },
        rewardStatus: {
            type: String,
            enum: ['pending', 'earned', 'paid'],
            default: 'pending'
        },
        firstBookingCompleted: {
            type: Boolean,
            default: false
        }
    }],
    totalReferrals: {
        type: Number,
        default: 0
    },
    totalEarnings: {
        type: Number,
        default: 0
    },
    rewardType: {
        type: String,
        enum: ['wallet_credit', 'discount', 'cashback'],
        default: 'wallet_credit'
    },
    rewardAmount: {
        type: Number,
        default: 50
    }
}, {
    timestamps: true
});

// Generate unique referral code
referralSchema.statics.generateReferralCode = function (userName) {
    const prefix = userName.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
};

module.exports = mongoose.model('Referral', referralSchema);
