const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    therapistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        senderRole: {
            type: String,
            enum: ['user', 'therapist'],
            required: true
        },
        message: {
            type: String,
            required: true
        },
        messageType: {
            type: String,
            enum: ['text', 'image', 'location'],
            default: 'text'
        },
        attachmentUrl: {
            type: String,
            default: null
        },
        read: {
            type: Boolean,
            default: false
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Index for chat queries
chatSchema.index({ bookingId: 1, 'messages.timestamp': -1 });

module.exports = mongoose.model('Chat', chatSchema);
