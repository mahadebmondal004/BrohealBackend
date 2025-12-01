const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const otpService = require('../services/otpService');
const whatsappService = require('../services/whatsappService');
const emailService = require('../services/emailService');

// Send OTP
exports.sendOTP = async (req, res) => {
    try {
        const { phone } = req.body;

        // Generate and send OTP
        const otp = await otpService.createOTP(phone);

        // Send via WhatsApp
        await whatsappService.sendOTP(phone, otp);

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            // In development, include OTP in response
            ...(process.env.NODE_ENV === 'development' && { otp })
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Verify OTP and login/register
exports.verifyOTP = async (req, res) => {
    try {
        const { phone, otp, name, role = 'user' } = req.body;

        // Verify OTP
        const verification = await otpService.verifyOTP(phone, otp);

        if (!verification.success) {
            return res.status(400).json(verification);
        }

        // Check if user exists
        let user = await User.findOne({ phone });

        if (!user) {
            // Register new user
            user = await User.create({
                name: name || 'User',
                phone,
                role,
                whatsappVerified: true
            });
        } else {
            // Update verification status
            user.whatsappVerified = true;
            await user.save();
        }

        // Generate tokens
        const accessToken = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                _id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage
            },
            accessToken,
            refreshToken
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Password-based login (fallback)
exports.login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        const user = await User.findOne({ phone });

        if (!user || !user.password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive or suspended'
            });
        }

        // Generate tokens
        const accessToken = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                _id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage
            },
            accessToken,
            refreshToken
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Refresh token
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Generate new access token
        const accessToken = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );


        res.status(200).json({
            success: true,
            accessToken
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
};

// Send Admin OTP (supports email or phone)
exports.sendAdminOTP = async (req, res) => {
    try {
        const { email, phone } = req.body;

        // Ensure at least one identifier is provided
        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Email or phone number is required'
            });
        }

        // Check if admin user exists with provided email or phone
        const query = {};
        if (email) query.email = email;
        if (phone) query.phone = phone;

        const user = await User.findOne(query);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Admin account not found with provided credentials'
            });
        }

        // Verify user has admin role
        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin credentials required.'
            });
        }

        // Check if account is active
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive or suspended'
            });
        }

        // Generate and store OTP (admin: inline display, no external delivery)
        const otp = await otpService.createOTP(phone || null, email || null);

        res.status(200).json({
            success: true,
            message: 'OTP generated. Use the code shown on screen.',
            otp,
            delivery: 'inline'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Verify Admin OTP and login
exports.verifyAdminOTP = async (req, res) => {
    try {
        const { email, phone, otp } = req.body;

        // Ensure at least one identifier is provided
        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Email or phone number is required'
            });
        }

        // Verify OTP
        const verification = await otpService.verifyOTP(phone || null, otp, email || null);

        if (!verification.success) {
            return res.status(400).json(verification);
        }

        // Find admin user
        const query = {};
        if (email) query.email = email;
        if (phone) query.phone = phone;

        const user = await User.findOne(query);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access denied'
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive or suspended'
            });
        }

        // Update verification status
        if (email) {
            user.whatsappVerified = true; // Using same field for simplicity
        }
        await user.save();

        // Generate tokens
        const accessToken = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
        );

        res.status(200).json({
            success: true,
            message: 'Admin login successful',
            user: {
                _id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage
            },
            accessToken,
            refreshToken
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Logout
exports.logout = async (req, res) => {
    // In a stateless JWT system, logout is handled client-side
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};
