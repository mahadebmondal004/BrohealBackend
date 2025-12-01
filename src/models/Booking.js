const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    therapistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    addons: [{
        addonId: mongoose.Schema.Types.ObjectId,
        title: String,
        price: Number
    }],
    bookingDateTime: {
        type: Date,
        required: [true, 'Booking date and time is required']
    },
    status: {
        type: String,
        enum: ['booked', 'on_the_way', 'in_progress', 'awaiting_payment', 'completed', 'cancelled'],
        default: 'booked'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending'
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    commission: {
        type: Number,
        default: 0
    },
    paymentOrderId: {
        type: String,
        index: true
    },
    paymentTransactionId: {
        type: String
    },
    paymentMode: {
        type: String,
        default: 'paytm'
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        latitude: Number,
        longitude: Number
    },
    therapistLocation: {
        latitude: Number,
        longitude: Number,
        updatedAt: Date
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ therapistId: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
