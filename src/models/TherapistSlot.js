const mongoose = require('mongoose');

const therapistSlotSchema = new mongoose.Schema({
    therapistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    slotDate: {
        type: Date,
        required: true,
        index: true
    },
    slotTime: {
        type: String,
        required: true,
        match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time in HH:MM format']
    },
    startTime: {
        type: String,
        match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time in HH:MM format']
    },
    endTime: {
        type: String,
        match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time in HH:MM format']
    },
    displayLabel: {
        type: String
    },
    status: {
        type: String,
        enum: ['available', 'booked', 'blocked'],
        default: 'available'
    },
    location: {
        address: String,
        city: String,
        pincode: String,
        lat: Number,
        lng: Number
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    }
}, {
    timestamps: true
});

// Compound index for slot queries
therapistSlotSchema.index({ therapistId: 1, slotDate: 1, status: 1 });

module.exports = mongoose.model('TherapistSlot', therapistSlotSchema);
