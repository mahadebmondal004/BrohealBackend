const User = require('../models/User');
const AdminRole = require('../models/AdminRole');

// Get all users with filters
exports.getAllUsers = async (req, res) => {
    try {
        const { role, status, search, page = 1, limit = 10 } = req.query;

        const query = {};
        if (role) query.role = role;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .populate('adminRole', 'displayName')
            .select('-password')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const count = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            users,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('adminRole')
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create user
exports.createUser = async (req, res) => {
    try {
        const { name, phone, email, role, adminRole, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this phone already exists'
            });
        }

        const userData = {
            name,
            phone,
            role,
            status: 'active'
        };

        if (email) userData.email = email;
        if (password) userData.password = password;
        if (role === 'admin' && adminRole) userData.adminRole = adminRole;

        const user = await User.create(userData);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                _id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const { name, email, status, role, adminRole } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (status) updateData.status = status;
        if (role) updateData.role = role;
        if (role === 'admin' && adminRole) updateData.adminRole = adminRole;
        if (role !== 'admin') updateData.adminRole = null;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Bulk delete users
exports.bulkDeleteUsers = async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'User IDs array is required'
            });
        }

        const result = await User.deleteMany({
            _id: { $in: userIds }
        });

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} users deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all admin roles
exports.getAdminRoles = async (req, res) => {
    try {
        const roles = await AdminRole.find().sort({ name: 1 });

        res.status(200).json({
            success: true,
            roles
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create admin role
exports.createAdminRole = async (req, res) => {
    try {
        const role = await AdminRole.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Admin role created successfully',
            role
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update admin role
exports.updateAdminRole = async (req, res) => {
    try {
        const role = await AdminRole.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Role updated successfully',
            role
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete admin role
exports.deleteAdminRole = async (req, res) => {
    try {
        // Check if any admins are using this role
        const adminsWithRole = await User.countDocuments({
            role: 'admin',
            adminRole: req.params.id
        });

        if (adminsWithRole > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete role. ${adminsWithRole} admin(s) are assigned to this role`
            });
        }

        const role = await AdminRole.findByIdAndDelete(req.params.id);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Role deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
