const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { otpLimiter, loginLimiter } = require('../middleware/rateLimiter');
const validateRequest = require('../middleware/validator');

// Send OTP
router.post('/send-otp',
    otpLimiter,
    [
        body('phone').matches(/^[0-9]{10}$/).withMessage('Please provide a valid 10-digit phone number')
    ],
    validateRequest,
    authController.sendOTP
);

// Verify OTP
router.post('/verify-otp',
    [
        body('phone').matches(/^[0-9]{10}$/).withMessage('Please provide a valid 10-digit phone number'),
        body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
        body('name').optional().trim().notEmpty(),
        body('role').optional().isIn(['user', 'therapist']).withMessage('Invalid role')
    ],
    validateRequest,
    authController.verifyOTP
);

// Login with password
router.post('/login',
    loginLimiter,
    [
        body('phone').matches(/^[0-9]{10}$/).withMessage('Please provide a valid 10-digit phone number'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    validateRequest,
    authController.login
);

// Refresh token
router.post('/refresh-token',
    [
        body('refreshToken').notEmpty().withMessage('Refresh token is required')
    ],
    validateRequest,
    authController.refreshToken
);

// Admin OTP routes
router.post('/admin/send-otp',
    otpLimiter,
    [
        body('email').optional().isEmail().withMessage('Please provide a valid email'),
        body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Please provide a valid 10-digit phone number')
    ],
    validateRequest,
    authController.sendAdminOTP
);

router.post('/admin/verify-otp',
    [
        body('email').optional().isEmail().withMessage('Please provide a valid email'),
        body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Please provide a valid 10-digit phone number'),
        body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    ],
    validateRequest,
    authController.verifyAdminOTP
);

// Logout
router.post('/logout', authController.logout);

module.exports = router;
