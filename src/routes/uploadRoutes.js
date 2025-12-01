const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Admin only - upload image
router.post('/upload-image',
    auth,
    roleCheck('admin'),
    uploadController.upload.single('image'),
    uploadController.uploadImage
);

// Admin only - delete image
router.delete('/delete-image/:fileName',
    auth,
    roleCheck('admin'),
    uploadController.deleteImage
);

module.exports = router;
