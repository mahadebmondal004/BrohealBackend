const mongoose = require('mongoose');

const therapistKycSchema = new mongoose.Schema({
    therapistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    idType: {
        type: String,
        enum: ['aadhar', 'voter', 'passport', 'driving_licence'],
        required: [true, 'ID type is required']
    },
    idProofUrl: {
        type: String,
        required: [true, 'ID proof document is required']
    },
    certificateUrl: {
        type: String,
        required: [true, 'Certificate is required']
    },
    permanentAddress: {
        street: { type: String, required: [true, 'Permanent street is required'] },
        city: { type: String, required: [true, 'Permanent city is required'] },
        state: { type: String, required: [true, 'Permanent state is required'] },
        pincode: { type: String, required: [true, 'Permanent pincode is required'], match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pincode'] }
    },
    presentAddress: {
        street: { type: String, required: [true, 'Present street is required'] },
        city: { type: String, required: [true, 'Present city is required'] },
        state: { type: String, required: [true, 'Present state is required'] },
        pincode: { type: String, required: [true, 'Present pincode is required'], match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pincode'] }
    },
    reference: {
        name: {
            type: String,
            required: [true, 'Reference name is required']
        },
        relation: {
            type: String,
            required: [true, 'Reference relation is required']
        },
        mobile: {
            type: String,
            required: [true, 'Reference mobile is required'],
            match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
        }
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: {
        type: String,
        default: null
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TherapistKyc', therapistKycSchema);
