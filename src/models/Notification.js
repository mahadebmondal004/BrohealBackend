const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['inapp', 'email', 'whatsapp', 'push'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    seen: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for user notifications query
notificationSchema.index({ userId: 1, seen: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
