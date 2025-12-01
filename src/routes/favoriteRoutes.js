const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const favoriteController = require('../controllers/favoriteController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validateRequest = require('../middleware/validator');

// All routes require user authentication
router.use(auth);
router.use(roleCheck('user'));

// Get user's favorites
router.get('/', favoriteController.getFavorites);

// Add to favorites
router.post('/',
    [body('therapistId').isMongoId().withMessage('Invalid therapist ID')],
    validateRequest,
    favoriteController.addFavorite
);

// Remove from favorites
router.delete('/:therapistId', favoriteController.removeFavorite);

// Check if therapist is favorited
router.get('/check/:therapistId', favoriteController.isFavorite);

// Toggle favorite status
router.post('/toggle',
    [body('therapistId').isMongoId().withMessage('Invalid therapist ID')],
    validateRequest,
    favoriteController.toggleFavorite
);

module.exports = router;
