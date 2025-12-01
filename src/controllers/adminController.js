const User = require('../models/User');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const TherapistKyc = require('../models/TherapistKyc');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
const TherapistSlot = require('../models/TherapistSlot');
const { startOfDay, addDays } = require('date-fns');
const TherapistSlotConfig = require('../models/TherapistSlotConfig');

// Optional models - handle if they don't exist
let Payout, AddonService, Zone;
try {
    Payout = require('../models/Payout');
} catch (error) {
    console.log('Payout model not found, some features will be disabled');
}
try {
    AddonService = require('../models/AddonService');
} catch (error) {
    console.log('AddonService model not found, some features will be disabled');
}
try {
    Zone = require('../models/Zone');
} catch (error) {
    console.log('Zone model not found, some features will be disabled');
}

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalTherapists = await User.countDocuments({ role: 'therapist' });
        const totalBookings = await Booking.countDocuments();
        const completedBookings = await Booking.countDocuments({ status: 'completed' });

        const revenueData = await Transaction.aggregate([
            { $match: { transactionType: 'commission', status: 'success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalRevenue = revenueData[0]?.total || 0;

        // Get pending KYC count
        const pendingKyc = await TherapistKyc.countDocuments({ approvalStatus: 'pending' });

        // Get active services count
        const activeServices = await Service.countDocuments({ status: 'active' });

        // Get zones count - handle if model doesn't exist
        let zonesCovered = 0;
        if (Zone) {
            zonesCovered = await Zone.countDocuments({ status: 'active' });
        }

        // Get pending payouts - handle if model doesn't exist
        let pendingPayouts = 0;
        if (Payout) {
            const pendingPayoutsData = await Payout.aggregate([
                { $match: { status: 'pending' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            pendingPayouts = pendingPayoutsData[0]?.total || 0;
        }

        // Recent activity
        const recentActivity = await Booking.find()
            .populate('userId', 'name')
            .populate('therapistId', 'name')
            .sort({ createdAt: -1 })
            .limit(5)
            .select('status createdAt userId therapistId');

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalTherapists,
                totalBookings,
                completedBookings,
                totalRevenue,
                pendingKyc,
                activeServices,
                zonesCovered,
                pendingPayouts
            },
            recentActivity: recentActivity.map(activity => ({
                type: 'booking_' + activity.status,
                message: `Booking ${activity.status}`,
                time: activity.createdAt,
                user: activity.userId?.name,
                therapist: activity.therapistId?.name
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all users with pagination
exports.getUsers = async (req, res) => {
    try {
        const { role, status, page = 1, limit = 10, search = '' } = req.query;
        const filter = {};

        if (role) filter.role = role;
        if (status) filter.status = status;

        // Search functionality
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).select('-password');

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

// Get therapists with KYC and pagination
exports.getTherapists = async (req, res) => {
    try {
        const { kycStatus, page = 1, limit = 10, search = '' } = req.query;
        const skip = (page - 1) * limit;

        // Build base query for therapists
        let therapistQuery = { role: 'therapist' };
        if (search) {
            therapistQuery.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { specialization: { $regex: search, $options: 'i' } }
            ];
        }

        const therapists = await User.find(therapistQuery)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get KYC data for each therapist
        const therapistsWithKyc = await Promise.all(
            therapists.map(async (therapist) => {
                const kyc = await TherapistKyc.findOne({ therapistId: therapist._id });

                // Filter by KYC status if specified
                if (kycStatus && kyc?.approvalStatus !== kycStatus) {
                    return null;
                }

                return {
                    ...therapist.toObject(),
                    kyc: kyc || { approvalStatus: 'not submitted' }
                };
            })
        );

        const filteredTherapists = therapistsWithKyc.filter(t => t !== null);
        const total = await User.countDocuments(therapistQuery);

        res.status(200).json({
            success: true,
            count: filteredTherapists.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            therapists: filteredTherapists
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create Therapist
exports.createTherapist = async (req, res) => {
    try {
        const { name, email, phone, specialization, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or phone already exists'
            });
        }

        // Create user with therapist role
        const therapist = await User.create({
            name,
            email,
            phone,
            specialization,
            password, // Will be hashed by pre-save hook
            role: 'therapist',
            status: 'active'
        });

        res.status(201).json({
            success: true,
            message: 'Therapist created successfully',
            therapist: {
                _id: therapist._id,
                name: therapist.name,
                email: therapist.email,
                phone: therapist.phone,
                specialization: therapist.specialization,
                role: therapist.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete Therapist
exports.deleteTherapist = async (req, res) => {
    try {
        const therapist = await User.findOneAndDelete({ _id: req.params.id, role: 'therapist' });

        if (!therapist) {
            return res.status(404).json({
                success: false,
                message: 'Therapist not found'
            });
        }

        // Delete associated KYC record if it exists
        await TherapistKyc.findOneAndDelete({ therapistId: req.params.id });

        res.status(200).json({
            success: true,
            message: 'Therapist deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// Addon Services Management
exports.createAddonService = async (req, res) => {
    try {
        if (!AddonService) throw new Error('AddonService model not found');
        const service = await AddonService.create(req.body);
        res.status(201).json({ success: true, service });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteAddonService = async (req, res) => {
    try {
        if (!AddonService) throw new Error('AddonService model not found');
        await AddonService.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Addon service deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Zone Management
exports.createZone = async (req, res) => {
    try {
        if (!Zone) throw new Error('Zone model not found');
        const zone = await Zone.create(req.body);
        res.status(201).json({ success: true, zone });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteZone = async (req, res) => {
    try {
        if (!Zone) throw new Error('Zone model not found');
        await Zone.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Zone deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin Management
exports.getAdmins = async (req, res) => {
    try {
        const admins = await User.find({ role: 'admin' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: admins.length,
            admins
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.createAdmin = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        const admin = await User.create({
            name,
            email,
            password,
            role: 'admin',
            // You might want to store the specific admin role (Content Manager, etc.) 
            // in a separate field or metadata if User schema supports it.
            // For now, we just create them as 'admin'.
            status: 'active'
        });

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            admin: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteAdmin = async (req, res) => {
    try {
        // Prevent deleting self
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete yourself'
            });
        }

        const admin = await User.findOneAndDelete({ _id: req.params.id, role: 'admin' });

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Admin deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get therapist KYC details
exports.getTherapistKyc = async (req, res) => {
    try {
        const kyc = await TherapistKyc.findOne({ therapistId: req.params.id })
            .populate('therapistId', 'name phone email specialization');

        if (!kyc) {
            return res.status(404).json({
                success: false,
                message: 'KYC not found'
            });
        }

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

// Approve KYC
exports.approveKyc = async (req, res) => {
    try {
        const kyc = await TherapistKyc.findOne({ therapistId: req.params.id });

        if (!kyc) {
            return res.status(404).json({
                success: false,
                message: 'KYC not found'
            });
        }

        kyc.approvalStatus = 'approved';
        kyc.approvedBy = req.user._id;
        kyc.approvedAt = new Date();
        await kyc.save();

        // Update therapist status to active
        await User.findByIdAndUpdate(req.params.id, { status: 'active' });

        res.status(200).json({
            success: true,
            message: 'KYC approved successfully',
            kyc
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Reject KYC
exports.rejectKyc = async (req, res) => {
    try {
        const { reason } = req.body;

        const kyc = await TherapistKyc.findOne({ therapistId: req.params.id });

        if (!kyc) {
            return res.status(404).json({
                success: false,
                message: 'KYC not found'
            });
        }

        kyc.approvalStatus = 'rejected';
        kyc.rejectionReason = reason;
        await kyc.save();

        res.status(200).json({
            success: true,
            message: 'KYC rejected',
            kyc
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all bookings with pagination
exports.getBookings = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (status) query.status = status;

        const bookings = await Booking.find(query)
            .populate('userId', 'name phone')
            .populate('therapistId', 'name phone')
            .populate('serviceId', 'title price')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Booking.countDocuments(query);

        res.status(200).json({
            success: true,
            count: bookings.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            bookings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all transactions with pagination
exports.getTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 10, type } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (type) query.transactionType = type;

        const transactions = await Transaction.find(query)
            .populate('userId', 'name phone')
            .populate('therapistId', 'name phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Transaction.countDocuments(query);

        res.status(200).json({
            success: true,
            count: transactions.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            transactions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Service Management
exports.getServices = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (status) query.status = status;

        const services = await Service.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Service.countDocuments(query);

        res.status(200).json({
            success: true,
            count: services.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            services
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.createService = async (req, res) => {
    try {
        const service = await Service.create(req.body);

        res.status(201).json({
            success: true,
            service
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateService = async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        res.status(200).json({
            success: true,
            service
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteService = async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Addon Services Management
exports.getAddonServices = async (req, res) => {
    try {
        if (!AddonService) {
            return res.status(200).json({
                success: true,
                count: 0,
                addonServices: []
            });
        }

        const addonServices = await AddonService.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: addonServices.length,
            addonServices
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Payout Management
exports.getPayouts = async (req, res) => {
    try {
        if (!Payout) {
            return res.status(200).json({
                success: true,
                count: 0,
                total: 0,
                totalPages: 0,
                currentPage: 1,
                payouts: []
            });
        }

        const { status, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (status) query.status = status;

        const payouts = await Payout.find(query)
            .populate('therapistId', 'name phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payout.countDocuments(query);

        res.status(200).json({
            success: true,
            count: payouts.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            payouts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Zone Management
exports.getZones = async (req, res) => {
    try {
        if (!Zone) {
            return res.status(200).json({
                success: true,
                count: 0,
                zones: []
            });
        }

        const zones = await Zone.find().sort({ name: 1 });

        res.status(200).json({
            success: true,
            count: zones.length,
            zones
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Settings
exports.getSettings = async (req, res) => {
    try {
        const settings = await Setting.find();

        res.status(200).json({
            success: true,
            settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { settings } = req.body;

        for (const setting of settings) {
            await Setting.findOneAndUpdate(
                { key: setting.key },
                {
                    ...setting,
                    updatedBy: req.user._id
                },
                { upsert: true, new: true }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Export data
exports.exportData = async (req, res) => {
    try {
        const { type, format = 'json' } = req.query;

        let data;
        let filename;

        switch (type) {
            case 'users':
                data = await User.find().select('-password');
                filename = 'users_export';
                break;
            case 'therapists':
                data = await User.find({ role: 'therapist' }).select('-password');
                filename = 'therapists_export';
                break;
            case 'bookings':
                data = await Booking.find().populate('userId therapistId serviceId');
                filename = 'bookings_export';
                break;
            case 'transactions':
                data = await Transaction.find().populate('userId therapistId');
                filename = 'transactions_export';
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid export type'
                });
        }

        if (format === 'csv') {
            // Simple CSV conversion
            if (data.length > 0) {
                const headers = Object.keys(data[0].toObject()).join(',');
                const rows = data.map(item =>
                    Object.values(item.toObject()).map(field =>
                        `"${String(field || '').replace(/"/g, '""')}"`
                    ).join(',')
                );
                const csv = [headers, ...rows].join('\n');

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=${filename}_${Date.now()}.csv`);
                res.send(csv);
            } else {
                res.status(200).json({
                    success: true,
                    message: 'No data to export',
                    data: []
                });
            }
        } else {
            res.status(200).json({
                success: true,
                data,
                filename: `${filename}_${Date.now()}.json`
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.createTherapistSlots = async (req, res) => {
    try {
        const { slots } = req.body;
        const therapistId = req.params.id;

        if (!Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({ success: false, message: 'Slots array is required' });
        }

        const createdSlots = [];
        const toMinutes = (s) => {
            const [h,m] = String(s).split(':').map(Number);
            return h*60 + m;
        };
        const toHHMM = (mins) => {
            const h = Math.floor(mins/60);
            const m = mins % 60;
            return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        };
        for (const slot of slots) {
            const existing = await TherapistSlot.findOne({
                therapistId,
                slotDate: new Date(slot.slotDate),
                slotTime: slot.slotTime
            });
            if (!existing) {
                const startTime = slot.startTime || slot.slotTime;
                const endTime = slot.endTime || toHHMM(toMinutes(startTime) + 60);
                const newSlot = await TherapistSlot.create({
                    therapistId,
                    slotDate: new Date(slot.slotDate),
                    slotTime: slot.slotTime,
                    startTime,
                    endTime,
                    status: slot.status || 'available'
                });
                createdSlots.push(newSlot);
            }
        }

        res.status(201).json({
            success: true,
            message: `${createdSlots.length} slots created`,
            slots: createdSlots
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.saveTherapistSlotConfig = async (req, res) => {
    try {
        const therapistId = req.params.id;
        const {
            slotDurationMinutes,
            slotAddonMinutes,
            slotGapMinutes,
            slotStartTime,
            slotEndTime,
            includeAddon,
            days,
            baseDate
        } = req.body;

        const config = await TherapistSlotConfig.findOneAndUpdate(
            { therapistId },
            {
                therapistId,
                slotDurationMinutes,
                slotAddonMinutes,
                slotGapMinutes,
                slotStartTime,
                slotEndTime,
                includeAddon: !!includeAddon,
                days: Array.isArray(days) ? days : [],
                baseDate: baseDate ? new Date(baseDate) : undefined,
                updatedBy: req.user._id
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ success: true, config });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getTherapistSlotConfig = async (req, res) => {
    try {
        const therapistId = req.params.id;
        const config = await TherapistSlotConfig.findOne({ therapistId });
        res.status(200).json({ success: true, config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get therapist slots (Admin)
exports.getTherapistSlots = async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;

        const filter = { therapistId: id };
        if (date) {
            const d = new Date(date);
            const start = startOfDay(d);
            const end = addDays(start, 1);
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
