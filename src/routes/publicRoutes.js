const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/settings', publicController.getPublicSettings);
router.get('/services', publicController.getPublicServices);

module.exports = router;
