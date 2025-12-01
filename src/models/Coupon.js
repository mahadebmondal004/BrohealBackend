const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    maxDiscount: {
        type: Number,
        default: null
    },
    validFrom: {
        type: Date,
        required: true
    },
    validUntil: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        default: null
    },
    usageCount: {
        type: Number,
        default: 0
    },
    perUserLimit: {
        type: Number,
        default: 1
    },
    applicableServices: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired'],
        default: 'active'
    },
    description: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Auto-update status based on date
couponSchema.pre('save', function (next) {
    if (this.validUntil < new Date()) {
        this.status = 'expired';
    }
    next();
});

module.exports = mongoose.model('Coupon', couponSchema);
