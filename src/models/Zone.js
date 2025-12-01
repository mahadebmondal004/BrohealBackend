const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({

    // Parent Reference (Hierarchy)
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Zone',
        default: null
    },

    // Basic Details
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },

    description: {
        type: String,
        default: ''
    },

    // Zone Type
    type: {
        type: String,
        enum: ['country', 'state', 'city', 'zone'],
        required: true
    },

    // GeoJSON Polygon / MultiPolygon (First Schema)
    geometry: {
        type: {
            type: String,
            enum: ['Polygon', 'MultiPolygon']
        },
        coordinates: [[[Number]]]
    },

    // Map Center Coordinates
    center: {
        lat: Number,
        lng: Number
    },

    // Boundary Box
    bounds: {
        northeast: { lat: Number, lng: Number },
        southwest: { lat: Number, lng: Number }
    },

    // Text-Based Location Info (Second Schema)
    area: {
        type: String
    },
    city: {
        type: String
    },
    state: {
        type: String
    },

    // Optional: pincode list
    pincodes: [{
        type: String
    }],

    // Business Settings
    serviceAvailable: {
        type: Boolean,
        default: true
    },
    deliveryCharge: {
        type: Number,
        default: 0
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

    // Priority ordering for selection
    priority: {
        type: Number,
        default: 0
    },

    // Stats (Second schema fields)
    therapistsCount: {
        type: Number,
        default: 0
    },
    usersCount: {
        type: Number,
        default: 0
    },

    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true
});

// Geo-spatial index for advanced online queries
zoneSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('Zone', zoneSchema);


