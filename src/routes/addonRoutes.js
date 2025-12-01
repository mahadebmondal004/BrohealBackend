const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const addonController = require('../controllers/addonController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validateRequest = require('../middleware/validator');

// Public routes - get addons
router.get('/', addonController.getAddons);
router.get('/:id', addonController.getAddonById);

// Admin routes - manage addons
router.post('/',
    auth,
    roleCheck('admin'),
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('price').isNumeric().withMessage('Price must be a number'),
        body('category').optional().isIn(['massage', 'spa', 'therapy', 'wellness', 'other'])
    ],
    validateRequest,
    addonController.createAddon
);

router.put('/:id',
    auth,
    roleCheck('admin'),
    addonController.updateAddon
);

router.delete('/:id',
    auth,
    roleCheck('admin'),
    addonController.deleteAddon
);

router.patch('/:id/toggle',
    auth,
    roleCheck('admin'),
    addonController.toggleAddonStatus
);

module.exports = router;
