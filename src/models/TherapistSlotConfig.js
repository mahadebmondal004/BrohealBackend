const mongoose = require('mongoose')

const therapistSlotConfigSchema = new mongoose.Schema({
    therapistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    slotDurationMinutes: { type: Number, required: true, min: 0 },
    slotAddonMinutes: { type: Number, default: 0, min: 0 },
    slotGapMinutes: { type: Number, default: 0, min: 0 },
    slotStartTime: {
        type: String,
        required: true,
        match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be HH:MM']
    },
    slotEndTime: {
        type: String,
        required: true,
        match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be HH:MM']
    },
    includeAddon: { type: Boolean, default: false },
    days: { type: [String], default: [], enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
    baseDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

module.exports = mongoose.model('TherapistSlotConfig', therapistSlotConfigSchema)