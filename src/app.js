require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const therapistRoutes = require('./routes/therapistRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const publicRoutes = require('./routes/publicRoutes');
const userManagementRoutes = require('./routes/userManagementRoutes');
const addonRoutes = require('./routes/addonRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const landingPageRoutes = require('./routes/landingPageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// CORS
const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const envOrigins = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use((req, res, next) => {
    const paytmOrigins = ['https://securegw.paytm.in', 'https://securegw-stage.paytm.in'];
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (req.path.startsWith('/api/payment/callback')) {
                return callback(null, true);
            }
            if (allowedOrigins.includes(origin) || paytmOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true
    })(req, res, next);
});

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static('src/uploads'));

// Routes
app.use('/api/public', publicRoutes);
app.use('/api', landingPageRoutes); // Landing page routes (public + admin)
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/therapist', therapistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', uploadRoutes); // Upload routes (admin only)
app.use('/api/admin/manage', userManagementRoutes);
app.use('/api/addons', addonRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/payment', paymentRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Bro Heal API is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
