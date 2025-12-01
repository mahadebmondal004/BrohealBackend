const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const validateRequest = require('../middleware/validator');

// Initiate payment (requires user auth)
router.post('/initiate',
    auth,
    [body('bookingId').isMongoId()],
    validateRequest,
    paymentController.initiatePayment
);

// Payment callback (public - from gateway)
router.post('/callback', paymentController.paymentCallback);
router.get('/callback', paymentController.paymentCallback);

// Verify payment
router.get('/verify/:orderId', auth, paymentController.verifyPayment);

module.exports = router;
