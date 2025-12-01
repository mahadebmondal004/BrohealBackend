const Notification = require('../models/Notification');
const whatsappService = require('./whatsappService');
const emailService = require('./emailService');

class NotificationService {
    // Send multi-channel notification
    async sendNotification(userId, title, message, data = {}, channels = ['inapp']) {
        const promises = [];

        // In-app notification (always store)
        if (channels.includes('inapp')) {
            promises.push(this.createInAppNotification(userId, title, message, data));
        }

        // Get user details if needed for email/whatsapp/push
        if (channels.includes('email') || channels.includes('whatsapp') || channels.includes('push')) {
            const User = require('../models/User');
            const user = await User.findById(userId);

            if (user) {
                if (channels.includes('email') && user.email) {
                    promises.push(emailService.sendEmail(user.email, title, message));
                }

                if (channels.includes('whatsapp') && user.phone) {
                    promises.push(whatsappService.sendNotification(user.phone, `${title}\n\n${message}`));
                }

                // Push notification would go here (Firebase)
                if (channels.includes('push')) {
                    // promises.push(pushService.sendNotification(user.fcmToken, title, message));
                    console.log('Push notification would be sent here');
                }
            }
        }

        await Promise.allSettled(promises);
    }

    // Create in-app notification
    async createInAppNotification(userId, title, message, data = {}) {
        try {
            await Notification.create({
                userId,
                type: 'inapp',
                title,
                message,
                data,
                seen: false
            });
        } catch (error) {
            console.error('In-app notification error:', error.message);
        }
    }

    // Booking created notification (to therapist)
    async notifyBookingCreated(booking) {
        const Booking = require('../models/Booking');
        const Service = require('../models/Service');

        const populatedBooking = await Booking.findById(booking._id)
            .populate('userId', 'name phone')
            .populate('serviceId', 'title')
            .populate('therapistId', 'name phone email');

        if (!populatedBooking) return;

        const title = 'New Booking Request';
        const message = `You have a new booking for ${populatedBooking.serviceId.title} on ${new Date(populatedBooking.bookingDateTime).toLocaleString()}`;

        await this.sendNotification(
            populatedBooking.therapistId._id,
            title,
            message,
            { bookingId: booking._id, type: 'booking_created' },
            ['inapp', 'email', 'whatsapp', 'push']
        );
    }

    // Therapist on the way notification (to user)
    async notifyTherapistOnTheWay(booking) {
        const Booking = require('../models/Booking');

        const populatedBooking = await Booking.findById(booking._id)
            .populate('userId', 'name phone email')
            .populate('therapistId', 'name');

        if (!populatedBooking) return;

        const title = 'Therapist On The Way';
        const message = `${populatedBooking.therapistId.name} is on the way to your location`;

        await this.sendNotification(
            populatedBooking.userId._id,
            title,
            message,
            { bookingId: booking._id, type: 'on_the_way' },
            ['inapp', 'email', 'whatsapp', 'push']
        );
    }

    // Booking cancelled by user (notify therapist)
    async notifyBookingCancelled(booking) {
        const Booking = require('../models/Booking');

        const populatedBooking = await Booking.findById(booking._id)
            .populate('userId', 'name phone email')
            .populate('therapistId', 'name phone email')
            .populate('serviceId', 'title');

        if (!populatedBooking) return;

        const title = 'Booking Cancelled';
        const message = `${populatedBooking.userId.name} cancelled booking for ${populatedBooking.serviceId.title}`;

        await this.sendNotification(
            populatedBooking.therapistId._id,
            title,
            message,
            { bookingId: booking._id, type: 'booking_cancelled' },
            ['inapp', 'email', 'whatsapp', 'push']
        );
    }

    // Service completed notification (to user)
    async notifyServiceCompleted(booking, paymentUrl) {
        const Booking = require('../models/Booking');

        const populatedBooking = await Booking.findById(booking._id)
            .populate('userId', 'name phone email');

        if (!populatedBooking) return;

        const title = 'Service Completed';
        const message = `Your service has been completed. Please proceed with payment: ${paymentUrl}`;

        await this.sendNotification(
            populatedBooking.userId._id,
            title,
            message,
            { bookingId: booking._id, paymentUrl, type: 'service_completed' },
            ['inapp', 'email', 'whatsapp', 'push']
        );

        // Send payment link via WhatsApp
        if (populatedBooking.userId.phone) {
            await whatsappService.sendPaymentLink(populatedBooking.userId.phone, {
                amount: booking.amount,
                paymentUrl,
                bookingId: booking._id
            });
        }
    }

    // Payment success notification
    async notifyPaymentSuccess(booking) {
        const Booking = require('../models/Booking');

        const populatedBooking = await Booking.findById(booking._id)
            .populate('userId', 'name phone email')
            .populate('therapistId', 'name phone email');

        if (!populatedBooking) return;

        // Notify user
        await this.sendNotification(
            populatedBooking.userId._id,
            'Payment Successful',
            `Your payment of ₹${booking.amount} has been processed successfully`,
            { bookingId: booking._id, type: 'payment_success' },
            ['inapp', 'email']
        );

        // Notify therapist
        const commission = booking.commission || 0;
        const therapistAmount = booking.amount - commission;

        await this.sendNotification(
            populatedBooking.therapistId._id,
            'Payment Received',
            `₹${therapistAmount} has been credited to your wallet`,
            { bookingId: booking._id, amount: therapistAmount, type: 'wallet_credit' },
            ['inapp', 'email', 'whatsapp']
        );
    }

    // KYC status notification
    async notifyKycStatus(therapistId, status, reason = null) {
        const statusMessages = {
            approved: 'Your KYC has been approved. You can now start accepting bookings!',
            rejected: `Your KYC has been rejected. Reason: ${reason || 'Not specified'}`
        };

        await this.sendNotification(
            therapistId,
            `KYC ${status.toUpperCase()}`,
            statusMessages[status] || 'KYC status updated',
            { type: 'kyc_status', status, reason },
            ['inapp', 'email', 'whatsapp', 'push']
        );
    }

    // Broadcast notification to multiple users
    async broadcastNotification(userIds, title, message, data = {}, channels = ['inapp']) {
        const promises = userIds.map(userId =>
            this.sendNotification(userId, title, message, data, channels)
        );

        await Promise.allSettled(promises);
    }
}

module.exports = new NotificationService();
