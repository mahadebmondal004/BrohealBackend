const mongoose = require('mongoose');

const serviceAddonSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    duration: {
        type: Number, // in minutes
        default: 0,
        min: 0
    },
    icon: {
        type: String, // emoji or icon name
        default: '➕'
    },
    category: {
        type: String,
        enum: ['massage', 'spa', 'therapy', 'wellness', 'other'],
        default: 'other'
    },
    applicableServices: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
    }], // Empty array means applicable to all services
    isActive: {
        type: Boolean,
        default: true
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    image: {
        type: String
    }
}, {
    timestamps: true
});

// Index for efficient queries
serviceAddonSchema.index({ isActive: 1, displayOrder: 1 });
serviceAddonSchema.index({ category: 1 });

module.exports = mongoose.model('ServiceAddon', serviceAddonSchema);
