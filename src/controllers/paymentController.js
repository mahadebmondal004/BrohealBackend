const Booking = require('../models/Booking');
const paymentService = require('../services/paymentService');
const walletService = require('../services/walletService');
const notificationService = require('../services/notificationService');

// Initiate payment
exports.initiatePayment = async (req, res) => {
    try {
        const { bookingId } = req.body;

        // Get booking
        const booking = await Booking.findOne({
            _id: bookingId,
            userId: req.user._id,
            paymentStatus: 'pending',
            status: { $in: ['awaiting_payment', 'completed'] }
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found or not eligible for payment'
            });
        }

        // Initiate payment
        const paymentData = await paymentService.initiatePayment(
            bookingId,
            req.user._id,
            booking.amount,
            req.headers.origin
        );

        res.status(200).json({
            success: true,
            ...paymentData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Payment callback (from gateway)
exports.paymentCallback = async (req, res) => {
    try {
        const params = req.method === 'GET' ? req.query : req.body;
        const queryOrderId = req.query?.orderId;

        // Verify payment
        const verification = await paymentService.verifyPayment(params);

        const fallbackOrderId = params.ORDERID || params.ORDER_ID || verification.orderId || queryOrderId;

        if (!verification.success) {
            try {
                const txn = await paymentService.updateTransaction(fallbackOrderId, 'failed', params);
                try {
                    await Booking.findByIdAndUpdate(txn.bookingId, { paymentStatus: 'failed', status: 'awaiting_payment' });
                } catch {}
            } catch {}
            const orderId = fallbackOrderId || 'unknown';
            const reason = encodeURIComponent(params.RESPMSG || verification.message || 'Payment failed');
            const code = encodeURIComponent(params.RESPCODE || '');
            return res.redirect(`${process.env.FRONTEND_URL}/payment/failure/${orderId}?reason=${reason}&code=${code}`);
        }

        // Update transaction
        const transaction = await paymentService.updateTransaction(
            fallbackOrderId,
            'success',
            params
        );

        // Update booking
        const booking = await Booking.findByIdAndUpdate(
            transaction.bookingId,
            { paymentStatus: 'success', status: 'completed', paymentTransactionId: verification.transactionId },
            { new: true }
        );

        // Calculate commission and credit wallet
        const walletUpdate = await walletService.creditWallet(
            booking.therapistId,
            booking._id,
            booking.amount
        );

        // Update booking with commission
        booking.commission = walletUpdate.commission;
        await booking.save();

        // Send notifications
        await notificationService.notifyPaymentSuccess(booking);

        // Redirect to success page
        const orderId = fallbackOrderId || 'unknown';
        res.redirect(`${process.env.FRONTEND_URL}/payment/success/${orderId}`);
    } catch (error) {
        const orderId = req.query?.orderId || req.body?.ORDERID || req.body?.ORDER_ID || 'unknown';
        const reason = encodeURIComponent(error?.message || 'Unhandled error');
        const code = encodeURIComponent(req.body?.RESPCODE || req.query?.RESPCODE || '');
        res.redirect(`${process.env.FRONTEND_URL}/payment/failure/${orderId}?reason=${reason}&code=${code}`);
    }
};

// Verify payment status
exports.verifyPayment = async (req, res) => {
    try {
        const { orderId } = req.params;

        const Transaction = require('../models/Transaction');
        const transaction = await Transaction.findOne({ gatewayOrderId: orderId })
            .populate('bookingId');

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        res.status(200).json({
            success: true,
            transaction: {
                orderId: transaction.gatewayOrderId,
                transactionId: transaction.gatewayTransactionId,
                status: transaction.status,
                amount: transaction.amount,
                bookingId: transaction.bookingId?._id
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
