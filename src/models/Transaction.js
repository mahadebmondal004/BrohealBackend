const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    therapistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    transactionType: {
        type: String,
        enum: ['payment', 'wallet_credit', 'commission', 'withdrawal'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentMode: {
        type: String,
        enum: ['paytm', 'razorpay', 'wallet'],
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending'
    },
    gatewayOrderId: {
        type: String,
        default: null
    },
    gatewayTransactionId: {
        type: String,
        default: null
    },
    gatewayResponse: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for transaction queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ therapistId: 1, createdAt: -1 });
transactionSchema.index({ gatewayOrderId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
