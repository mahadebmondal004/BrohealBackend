const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const therapistController = require('../controllers/therapistController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validateRequest = require('../middleware/validator');

// All routes require therapist authentication
router.use(auth);
router.use(roleCheck('therapist'));

// Bookings
router.get('/bookings', therapistController.getBookings);
router.put('/bookings/:id/status',
    [body('status').isIn(['on_the_way', 'in_progress', 'completed', 'cancelled'])],
    validateRequest,
    therapistController.updateBookingStatus
);

// Live location updates
router.put('/bookings/:id/location',
    [body('lat').isFloat({ min: -90, max: 90 }), body('lng').isFloat({ min: -180, max: 180 })],
    validateRequest,
    therapistController.updateTherapistLocation
);

// KYC
router.post('/kyc',
    [
        body('idType').isIn(['aadhar', 'voter', 'passport', 'driving_licence']),
        body('idProofUrl').notEmpty(),
        body('certificateUrl').notEmpty(),
        body('permanentAddress.street').notEmpty(),
        body('permanentAddress.city').notEmpty(),
        body('permanentAddress.state').notEmpty(),
        body('permanentAddress.pincode').matches(/^[0-9]{6}$/),
        body('presentAddress.street').notEmpty(),
        body('presentAddress.city').notEmpty(),
        body('presentAddress.state').notEmpty(),
        body('presentAddress.pincode').matches(/^[0-9]{6}$/),
        body('reference.name').notEmpty(),
        body('reference.mobile').matches(/^[0-9]{10}$/)
    ],
    validateRequest,
    therapistController.submitKyc
);
router.get('/kyc/status', therapistController.getKycStatus);

// Wallet
router.get('/wallet', therapistController.getWallet);
router.get('/transactions', therapistController.getTransactions);
router.post('/wallet/withdraw',
    [
        body('amount').isNumeric().isFloat({ min: 100 }),
        body('bankDetails').notEmpty()
    ],
    validateRequest,
    therapistController.withdraw
);

// Slots
router.post('/slots',
    [body('slots').isArray()],
    validateRequest,
    therapistController.createSlots
);
router.get('/slots', therapistController.getSlots);

// Stats
router.get('/stats', therapistController.getStats);

module.exports = router;
