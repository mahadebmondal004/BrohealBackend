const Favorite = require('../models/Favorite');
const User = require('../models/User');

// Get user's favorite therapists
exports.getFavorites = async (req, res) => {
    try {
        const favorites = await Favorite.find({ userId: req.user._id })
            .populate({
                path: 'therapistId',
                select: 'name phone profileImage rating jobsCompleted',
                match: { role: 'therapist', status: 'active' }
            })
            .sort({ addedAt: -1 });

        // Filter out null therapists (deleted or inactive)
        const validFavorites = favorites.filter(fav => fav.therapistId);

        res.status(200).json({
            success: true,
            count: validFavorites.length,
            favorites: validFavorites
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add therapist to favorites
exports.addFavorite = async (req, res) => {
    try {
        const { therapistId } = req.body;

        // Check if therapist exists and is active
        const therapist = await User.findOne({
            _id: therapistId,
            role: 'therapist',
            status: 'active'
        });

        if (!therapist) {
            return res.status(404).json({
                success: false,
                message: 'Therapist not found or inactive'
            });
        }

        // Check if already favorited
        const existing = await Favorite.findOne({
            userId: req.user._id,
            therapistId
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Therapist already in favorites'
            });
        }

        // Create favorite
        const favorite = await Favorite.create({
            userId: req.user._id,
            therapistId
        });

        const populatedFavorite = await Favorite.findById(favorite._id)
            .populate('therapistId', 'name phone profileImage rating jobsCompleted');

        res.status(201).json({
            success: true,
            message: 'Therapist added to favorites',
            favorite: populatedFavorite
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Therapist already in favorites'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Remove therapist from favorites
exports.removeFavorite = async (req, res) => {
    try {
        const { therapistId } = req.params;

        const favorite = await Favorite.findOneAndDelete({
            userId: req.user._id,
            therapistId
        });

        if (!favorite) {
            return res.status(404).json({
                success: false,
                message: 'Favorite not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Therapist removed from favorites'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Check if therapist is favorited
exports.isFavorite = async (req, res) => {
    try {
        const { therapistId } = req.params;

        const favorite = await Favorite.findOne({
            userId: req.user._id,
            therapistId
        });

        res.status(200).json({
            success: true,
            isFavorite: !!favorite
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Toggle favorite status
exports.toggleFavorite = async (req, res) => {
    try {
        const { therapistId } = req.body;

        const existing = await Favorite.findOne({
            userId: req.user._id,
            therapistId
        });

        if (existing) {
            // Remove from favorites
            await Favorite.findByIdAndDelete(existing._id);
            return res.status(200).json({
                success: true,
                isFavorite: false,
                message: 'Removed from favorites'
            });
        } else {
            // Add to favorites
            const favorite = await Favorite.create({
                userId: req.user._id,
                therapistId
            });

            return res.status(200).json({
                success: true,
                isFavorite: true,
                message: 'Added to favorites'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
