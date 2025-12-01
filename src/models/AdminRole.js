const mongoose = require('mongoose');

const adminRoleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ['super_admin', 'admin', 'manager', 'support']
    },
    displayName: {
        type: String,
        required: true
    },
    permissions: {
        users: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        therapists: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            approveKyc: { type: Boolean, default: false }
        },
        admins: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        bookings: {
            view: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            cancel: { type: Boolean, default: false }
        },
        services: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        settings: {
            view: { type: Boolean, default: false },
            edit: { type: Boolean, default: false }
        },
        analytics: {
            view: { type: Boolean, default: false }
        },
        notifications: {
            send: { type: Boolean, default: false }
        }
    },
    description: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AdminRole', adminRoleSchema);
