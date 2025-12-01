const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validateRequest = require('../middleware/validator');

// All routes require admin authentication
router.use(auth);
router.use(roleCheck('admin'));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Users
router.get('/users', adminController.getUsers);
router.put('/users/:id/status',
    [body('status').isIn(['active', 'inactive', 'suspended'])],
    validateRequest,
    adminController.updateUserStatus
);

// Admins
router.get('/admins', adminController.getAdmins);
router.post('/admins',
    [
        body('name').notEmpty(),
        body('email').isEmail(),
        body('password').isLength({ min: 6 })
    ],
    validateRequest,
    adminController.createAdmin
);
router.delete('/admins/:id', adminController.deleteAdmin);

// Therapists
router.get('/therapists', adminController.getTherapists);
router.post('/therapists',
    [
        body('name').notEmpty(),
        body('email').isEmail(),
        body('phone').notEmpty(),
        body('password').isLength({ min: 6 })
    ],
    validateRequest,
    adminController.createTherapist
);
router.delete('/therapists/:id', adminController.deleteTherapist);
router.get('/therapists/:id/kyc', adminController.getTherapistKyc);
router.put('/therapists/:id/kyc/approve', adminController.approveKyc);
router.put('/therapists/:id/kyc/reject',
    [body('reason').notEmpty()],
    validateRequest,
    adminController.rejectKyc
);

// Therapist Slots
router.get('/therapists/:id/slots', adminController.getTherapistSlots);
router.post('/therapists/:id/slots', adminController.createTherapistSlots);
router.get('/therapists/:id/slot-config', adminController.getTherapistSlotConfig);
router.post('/therapists/:id/slot-config', adminController.saveTherapistSlotConfig);

// Bookings
router.get('/bookings', adminController.getBookings);

// Transactions
router.get('/transactions', adminController.getTransactions);

// Services
router.get('/services', adminController.getServices);
router.post('/services',
    [
        body('title').notEmpty(),
        body('category').notEmpty(),
        body('price').isNumeric(),
        body('offerPrice').optional().isNumeric(),
        body('duration').isNumeric(),
        body('description').notEmpty(),
        body('image').optional().isString()
    ],
    validateRequest,
    adminController.createService
);
router.put('/services/:id', adminController.updateService);
router.delete('/services/:id', adminController.deleteService);

// Addon Services
router.get('/addon-services', adminController.getAddonServices);
router.post('/addon-services',
    [
        body('name').notEmpty(),
        body('price').isNumeric(),
        body('offerPrice').optional().isNumeric(),
        body('duration').isNumeric(),
        body('description').notEmpty()
    ],
    validateRequest,
    adminController.createAddonService
);
router.delete('/addon-services/:id', adminController.deleteAddonService);

// Payouts
router.get('/payouts', adminController.getPayouts);

// Zones
router.get('/zones', adminController.getZones);
router.post('/zones',
    [
        body('name').notEmpty()
    ],
    validateRequest,
    adminController.createZone
);
router.delete('/zones/:id', adminController.deleteZone);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings',
    [body('settings').isArray()],
    validateRequest,
    adminController.updateSettings
);

// Export data
router.get('/export', adminController.exportData);

module.exports = router;
