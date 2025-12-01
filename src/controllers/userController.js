const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const TherapistSlot = require('../models/TherapistSlot');
const notificationService = require('../services/notificationService');
const { startOfDay, addDays } = require('date-fns');

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

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

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, profileImage } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { name, email, profileImage },
            { new: true, runValidators: true }
        ).select('-password');

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

// Get all active services
exports.getServices = async (req, res) => {
    try {
        const { category, search } = req.query;

        const filter = { status: 'active' };

        if (category) {
            filter.category = category;
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const services = await Service.find(filter).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: services.length,
            services
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get service by ID
exports.getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

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

// Get available therapists (supports nearest sorting)
exports.getTherapists = async (req, res) => {
    try {
        const { sort, lat, lng } = req.query;

        const therapists = await User.find({
            role: 'therapist',
            status: 'active'
        }).select('-password');

        const TherapistKyc = require('../models/TherapistKyc');
        const therapistsWithKyc = await Promise.all(
            therapists.map(async (therapist) => {
                const kyc = await TherapistKyc.findOne({ therapistId: therapist._id });
                return {
                    ...therapist.toObject(),
                    kycApproved: kyc?.approvalStatus === 'approved'
                };
            })
        );

        let finalTherapists = therapistsWithKyc.filter(t => t.kycApproved);
        if (finalTherapists.length === 0) {
            finalTherapists = therapistsWithKyc;
        }

        // Optional nearest sorting using latest slot location
        if (sort === 'nearest' && lat && lng) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);
            const toRad = (v) => (v * Math.PI) / 180;
            const haversine = (a, b) => {
                const R = 6371; // km
                const dLat = toRad(b.lat - a.lat);
                const dLng = toRad(b.lng - a.lng);
                const s1 = Math.sin(dLat / 2) ** 2;
                const s2 = Math.sin(dLng / 2) ** 2;
                const c = 2 * Math.atan2(Math.sqrt(s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2), Math.sqrt(1 - (s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2)));
                return R * c;
            };

            const enriched = await Promise.all(
                finalTherapists.map(async (t) => {
                    try {
                        const latestSlot = await TherapistSlot.findOne({
                            therapistId: t._id,
                            'location.lat': { $ne: null },
                            'location.lng': { $ne: null }
                        }).sort({ slotDate: -1, createdAt: -1 });
                        let distance = null;
                        if (latestSlot?.location?.lat != null && latestSlot?.location?.lng != null) {
                            distance = haversine(
                                { lat: userLat, lng: userLng },
                                { lat: latestSlot.location.lat, lng: latestSlot.location.lng }
                            );
                        }
                        return { ...t, distance };
                    } catch (e) {
                        return { ...t, distance: null };
                    }
                })
            );

            enriched.sort((a, b) => {
                const da = a.distance == null ? Number.POSITIVE_INFINITY : a.distance;
                const db = b.distance == null ? Number.POSITIVE_INFINITY : b.distance;
                return da - db;
            });
            finalTherapists = enriched;
        }

        res.status(200).json({
            success: true,
            count: finalTherapists.length,
            therapists: finalTherapists
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get therapist available slots
exports.getTherapistSlots = async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;

        const queryDate = date ? new Date(date) : new Date();
        const startDate = startOfDay(queryDate);
        const endDate = addDays(startDate, 7);

        const slots = await TherapistSlot.find({
            therapistId: id,
            slotDate: { $gte: startDate, $lt: endDate },
            status: 'available'
        }).sort({ slotDate: 1, slotTime: 1 });

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

// Create a booking
exports.createBooking = async (req, res) => {
    try {
        const { therapistId, serviceId, bookingDateTime, addons, address } = req.body;

        // Get service details
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Calculate total amount
        let totalAmount = service.price;
        if (addons && addons.length > 0) {
            totalAmount += addons.reduce((sum, addon) => sum + addon.price, 0);
        }

        // Create booking
        const booking = await Booking.create({
            userId: req.user._id,
            therapistId,
            serviceId,
            addons,
            bookingDateTime,
            address,
            amount: totalAmount,
            status: 'booked',
            paymentStatus: 'pending'
        });

        // Update slot status
        const slotDate = startOfDay(new Date(bookingDateTime));
        const slotTime = new Date(bookingDateTime).toTimeString().substring(0, 5);
        await TherapistSlot.findOneAndUpdate(
            { therapistId, slotDate, slotTime, status: 'available' },
            { status: 'booked', bookingId: booking._id }
        );

        // Send notifications
        await notificationService.notifyBookingCreated(booking);

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get user bookings
exports.getBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user._id })
            .populate('therapistId', 'name phone profileImage')
            .populate('serviceId', 'title price duration')
            .sort({ createdAt: -1 });

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

// Cancel a booking by user
exports.cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await Booking.findOne({ _id: id, userId: req.user._id });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (['completed', 'cancelled'].includes(booking.status)) {
            return res.status(400).json({ success: false, message: 'Cannot cancel this booking' });
        }

        booking.status = 'cancelled';
        await booking.save();

        try {
            const when = new Date(booking.bookingDateTime);
            const now = new Date();
            if (when > now) {
                const slotDate = startOfDay(when);
                const slotTime = when.toTimeString().substring(0, 5);
                await TherapistSlot.findOneAndUpdate(
                    { therapistId: booking.therapistId, slotDate, slotTime },
                    { status: 'available', bookingId: null }
                );
            }
        } catch {}

        try { await notificationService.notifyBookingCancelled(booking); } catch {}

        res.status(200).json({ success: true, booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findOne({
            _id: req.params.id,
            userId: req.user._id
        })
            .populate('therapistId', 'name phone profileImage')
            .populate('serviceId', 'title price duration description');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
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

// Submit a review
exports.submitReview = async (req, res) => {
    try {
        const { rating, review, images } = req.body;
        const { id: bookingId } = req.params;

        // Verify booking belongs to user and is completed
        const booking = await Booking.findOne({
            _id: bookingId,
            userId: req.user._id,
            status: 'completed',
            paymentStatus: 'success'
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found or not eligible for review'
            });
        }

        // Check if review already exists
        const existingReview = await Review.findOne({ bookingId });
        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'Review already submitted for this booking'
            });
        }

        // Create review
        const newReview = await Review.create({
            bookingId,
            userId: req.user._id,
            therapistId: booking.therapistId,
            rating,
            review,
            images: images || []
        });

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            review: newReview
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get user notifications
exports.getNotifications = async (req, res) => {
    try {
        const { limit = 50, seen } = req.query;

        const filter = { userId: req.user._id, type: 'inapp' };
        if (seen !== undefined) {
            filter.seen = seen === 'true';
        }

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        const unseenCount = await Notification.countDocuments({
            userId: req.user._id,
            type: 'inapp',
            seen: false
        });

        res.status(200).json({
            success: true,
            count: notifications.length,
            unseenCount,
            notifications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Mark notification as read
exports.markNotificationRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { seen: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.status(200).json({
            success: true,
            notification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
