const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validateRequest = require('../middleware/validator');

// All routes require user authentication
router.use(auth);
router.use(roleCheck('user'));

// Profile
router.get('/profile', userController.getProfile);
router.put('/profile',
    [
        body('name').optional().trim().notEmpty(),
        body('email').optional().isEmail()
    ],
    validateRequest,
    userController.updateProfile
);

// Services
router.get('/services', userController.getServices);
router.get('/services/:id', userController.getServiceById);

// Therapists
router.get('/therapists', userController.getTherapists);
router.get('/therapists/:id/slots', userController.getTherapistSlots);

// Bookings
router.post('/bookings',
    [
        body('therapistId').isMongoId(),
        body('serviceId').isMongoId(),
        body('bookingDateTime').isISO8601(),
        body('address').notEmpty()
    ],
    validateRequest,
    userController.createBooking
);
router.get('/bookings', userController.getBookings);
router.get('/bookings/:id', userController.getBookingById);
router.put('/bookings/:id/cancel', userController.cancelBooking);

// Reviews
router.post('/bookings/:id/review',
    [
        body('rating').isInt({ min: 1, max: 5 }),
        body('review').trim().notEmpty()
    ],
    validateRequest,
    userController.submitReview
);

// Notifications
router.get('/notifications', userController.getNotifications);
router.put('/notifications/:id/read', userController.markNotificationRead);

module.exports = router;
