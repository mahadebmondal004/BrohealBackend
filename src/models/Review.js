const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    therapistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be between 1 and 5'],
        max: [5, 'Rating must be between 1 and 5']
    },
    review: {
        type: String,
        required: [true, 'Review text is required'],
        trim: true
    },
    images: [{
        type: String
    }]
}, {
    timestamps: true
});

// Index for therapist reviews
reviewSchema.index({ therapistId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
