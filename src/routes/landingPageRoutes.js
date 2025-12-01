const express = require('express');
const router = express.Router();
const landingPageController = require('../controllers/landingPageController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public route - get landing page content
router.get('/landing-content', landingPageController.getLandingContent);

// Admin routes - manage landing page
router.get('/admin/landing-content',
    auth,
    roleCheck('admin'),
    landingPageController.getAdminLandingContent
);

router.put('/admin/landing-content',
    auth,
    roleCheck('admin'),
    landingPageController.updateLandingContent
);

router.put('/admin/landing-content/:section',
    auth,
    roleCheck('admin'),
    landingPageController.updateSection
);

module.exports = router;
