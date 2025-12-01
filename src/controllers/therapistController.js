const Booking = require('../models/Booking');
const TherapistKyc = require('../models/TherapistKyc');
const TherapistSlot = require('../models/TherapistSlot');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const walletService = require('../services/walletService');
const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');
const { startOfDay, addDays } = require('date-fns');

// Get therapist bookings
exports.getBookings = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = { therapistId: req.user._id };

        if (status) {
            filter.status = status;
        }

        const bookings = await Booking.find(filter)
            .populate('userId', 'name phone')
            .populate('serviceId', 'title price duration')
            .sort({ bookingDateTime: -1 });

        res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
// Update booking status
exports.updateBookingStatus = async (req, res) => {
    try {
        const { status, location } = req.body;
        const { id } = req.params;

        const booking = await Booking.findOne({
            _id: id,
            therapistId: req.user._id
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Normalize status before save
        booking.status = (status === 'completed') ? 'awaiting_payment' : status;
        if (status === 'completed') {
            booking.paymentStatus = 'pending';
        }
        if (status === 'on_the_way' && location && typeof location.lat === 'number' && typeof location.lng === 'number') {
            booking.therapistLocation = {
                latitude: location.lat,
                longitude: location.lng,
                updatedAt: new Date()
            };
        }
        await booking.save();

        // Send notifications based on status
        if (status === 'on_the_way') {
            await notificationService.notifyTherapistOnTheWay(booking);
        } else if (status === 'completed') {
            const paymentData = await paymentService.initiatePayment(
                booking._id,
                booking.userId,
                booking.amount,
                req.headers.origin
            );
            await notificationService.notifyServiceCompleted(booking, paymentData.paymentUrl);
        }

        res.status(200).json({
            success: true,
            booking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Live location updates while on_the_way or in_progress
exports.updateTherapistLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const { id } = req.params;

        if (typeof lat !== 'number' || typeof lng !== 'number') {
            return res.status(400).json({ success: false, message: 'Invalid coordinates' });
        }

        const booking = await Booking.findOne({ _id: id, therapistId: req.user._id });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (!['on_the_way', 'in_progress'].includes(booking.status)) {
            return res.status(400).json({ success: false, message: 'Location updates allowed only on the way or in progress' });
        }

        booking.therapistLocation = { latitude: lat, longitude: lng, updatedAt: new Date() };
        await booking.save();

        res.status(200).json({ success: true, location: booking.therapistLocation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Submit KYC
exports.submitKyc = async (req, res) => {
    try {
        const { idType, idProofUrl, certificateUrl, permanentAddress, presentAddress, reference } = req.body;

        // Check if KYC already exists
        let kyc = await TherapistKyc.findOne({ therapistId: req.user._id });

        if (kyc) {
            // Update existing KYC
            kyc.idType = idType;
            kyc.idProofUrl = idProofUrl;
            kyc.certificateUrl = certificateUrl;
            kyc.permanentAddress = permanentAddress;
            kyc.presentAddress = presentAddress;
            kyc.reference = reference;
            kyc.approvalStatus = 'pending';
            kyc.rejectionReason = null;
            await kyc.save();
        } else {
            // Create new KYC
            kyc = await TherapistKyc.create({
                therapistId: req.user._id,
                idType,
                idProofUrl,
                certificateUrl,
                permanentAddress,
                presentAddress,
                reference
            });
        }

        res.status(201).json({
            success: true,
            message: 'KYC submitted successfully',
            kyc
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get KYC status
exports.getKycStatus = async (req, res) => {
    try {
        const kyc = await TherapistKyc.findOne({ therapistId: req.user._id });

        res.status(200).json({
            success: true,
            kyc
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
// Get wallet
exports.getWallet = async (req, res) => {
    try {
        const wallet = await walletService.getBalance(req.user._id);

        res.status(200).json({
            success: true,
            wallet
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get transactions
exports.getTransactions = async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const transactions = await walletService.getTransactions(req.user._id, parseInt(limit));

        res.status(200).json({
            success: true,
            count: transactions.length,
            transactions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create slots (bulk)
exports.createSlots = async (req, res) => {
    return res.status(403).json({
        success: false,
        message: 'Only admin can create slots'
    });
};

// Get slots
exports.getSlots = async (req, res) => {
    try {
        const { startDate, endDate, date } = req.query;

        const filter = { therapistId: req.user._id };

        if (date) {
            const d = new Date(date);
            const start = startOfDay(d);
            const end = addDays(start, 1);
            filter.slotDate = { $gte: start, $lt: end };
        } else if (startDate && endDate) {
            const start = startOfDay(new Date(startDate));
            const end = addDays(startOfDay(new Date(endDate)), 1);
            filter.slotDate = { $gte: start, $lt: end };
        }

        const slots = await TherapistSlot.find(filter).sort({ slotDate: 1, slotTime: 1 });

        res.status(200).json({
            success: true,
            count: slots.length,
            slots
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Withdraw request
exports.withdraw = async (req, res) => {
    try {
        const { amount, bankDetails } = req.body;

        const result = await walletService.processWithdrawal(req.user._id, amount, bankDetails);

        res.status(200).json({
            success: true,
            message: 'Withdrawal request processed',
            wallet: result.wallet,
            transaction: result.transaction
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
// Stats for therapist
exports.getStats = async (req, res) => {
    try {
        const kyc = await TherapistKyc.findOne({ therapistId: req.user._id });
        const wallet = await Wallet.findOne({ userId: req.user._id });
        const pendingJobs = await Booking.countDocuments({ therapistId: req.user._id, status: 'accepted' });
        const completedJobs = await Booking.countDocuments({ therapistId: req.user._id, status: 'completed' });
        const totalReviews = 0;
        const avgRating = 0;

        res.status(200).json({
            success: true,
            stats: {
                walletBalance: wallet?.balance || 0,
                pendingJobs,
                completedJobs,
                totalReviews,
                avgRating,
                kycApproved: kyc?.approvalStatus === 'approved'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
