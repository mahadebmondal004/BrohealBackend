const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'json', 'array'],
        default: 'string'
    },
    category: {
        type: String,
        enum: ['app', 'theme', 'social', 'seo', 'analytics', 'contact', 'payment', 'other'],
        default: 'other'
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        default: ''
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Setting', settingSchema);
