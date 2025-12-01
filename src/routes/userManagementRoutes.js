const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const userManagementController = require('../controllers/userManagementController');

// All routes require admin authentication
router.use(auth, roleCheck('admin'));

// User management routes
router.get('/users', userManagementController.getAllUsers);
router.get('/users/:id', userManagementController.getUserById);
router.post('/users', userManagementController.createUser);
router.put('/users/:id', userManagementController.updateUser);
router.delete('/users/:id', userManagementController.deleteUser);
router.post('/users/bulk-delete', userManagementController.bulkDeleteUsers);

// Admin role management routes
router.get('/roles', userManagementController.getAdminRoles);
router.post('/roles', userManagementController.createAdminRole);
router.put('/roles/:id', userManagementController.updateAdminRole);
router.delete('/roles/:id', userManagementController.deleteAdminRole);

module.exports = router;
