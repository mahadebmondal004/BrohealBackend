// backend/src/models/Payout.js
const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
    therapistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'upi', 'wallet'],
        required: true
    },
    paymentDetails: {
        accountNumber: String,
        ifscCode: String,
        upiId: String,
        walletType: String
    },
    requestDate: {
        type: Date,
        default: Date.now
    },
    processedDate: Date,
    transactionId: String,
    notes: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Payout', payoutSchema);