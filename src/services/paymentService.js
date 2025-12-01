const axios = require('axios');
const PaytmChecksum = require('paytmchecksum');
const Setting = require('../models/Setting');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');

class PaymentService {
    constructor() {
        this.merchantId = process.env.PAYTM_MERCHANT_ID;
        this.merchantKey = process.env.PAYTM_MERCHANT_KEY;
        const envMode = process.env.PAYTM_MODE;
        const envWebsite = process.env.PAYTM_WEBSITE;
        this.website = envMode === 'staging' ? 'WEBSTAGING' : (envWebsite || 'WEB');
        this.channelId = process.env.PAYTM_CHANNEL_ID || 'WEB';
        this.industryType = process.env.PAYTM_INDUSTRY_TYPE || 'Retail';
        this.callbackUrl = process.env.PAYTM_CALLBACK_URL;
    }

    // Get Paytm settings from database (admin-configurable)
    async getSettings() {
        const settings = await Setting.find({
            key: { $in: ['paytm_merchant_id', 'paytm_merchant_key', 'paytm_enabled', 'paytm_mode'] }
        });

        const config = {};
        settings.forEach(setting => {
            config[setting.key] = setting.value;
        });

        return {
            merchantId: config.paytm_merchant_id || this.merchantId,
            merchantKey: config.paytm_merchant_key || this.merchantKey,
            enabled: config.paytm_enabled !== false,
            mode: process.env.PAYTM_MODE || config.paytm_mode || 'staging'
        };
    }

    // Generate Paytm checksum via official library
    async generateChecksum(params, merchantKey) {
        return PaytmChecksum.generateSignature(params, merchantKey);
    }

    // Initiate payment
    async initiatePayment(bookingId, userId, amount, clientOrigin) {
        try {
            const config = await this.getSettings();

            if (!config.enabled) {
                throw new Error('Payment gateway not configured');
            }

            const orderId = `BRO${Date.now()}${Math.floor(Math.random() * 1000)}`;

            // Create transaction record
            const transaction = await Transaction.create({
                bookingId,
                userId,
                transactionType: 'payment',
                amount,
                paymentMode: 'paytm',
                status: 'pending',
                gatewayOrderId: orderId
            });

            // Persist orderId on booking
            try {
                await Booking.findByIdAndUpdate(bookingId, {
                    paymentOrderId: orderId,
                    paymentMode: 'paytm'
                });
            } catch {}

            // In test mode, return a mock payment URL
            if (config.mode === 'test') {
                const frontendBase = (clientOrigin || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
                const mockPaymentUrl = `${frontendBase}/payment/mock?orderId=${orderId}&amount=${amount}`;
                return {
                    success: true,
                    orderId,
                    transactionId: transaction._id,
                    paymentUrl: mockPaymentUrl,
                    mockMode: true
                };
            }

            // Paytm payment initiation (production mode)
            const params = {
                MID: config.merchantId,
                WEBSITE: this.website,
                INDUSTRY_TYPE_ID: this.industryType,
                CHANNEL_ID: this.channelId,
                ORDER_ID: orderId,
                CUST_ID: userId.toString(),
                TXN_AMOUNT: Number(amount).toFixed(2),
                CALLBACK_URL: `${this.callbackUrl}?orderId=${orderId}`
            };

            const checksum = await this.generateChecksum(params, config.merchantKey);
            const gatewayBase = config.mode === 'production' ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in';

            return {
                success: true,
                orderId,
                transactionId: transaction._id,
                gatewayUrl: `${gatewayBase}/order/process`,
                fields: { ...params, CHECKSUMHASH: checksum }
            };
        } catch (error) {
            console.error('Payment Initiation Error:', error.message);
            throw error;
        }
    }

    // Verify payment callback
    async verifyPayment(params) {
        try {
            const config = await this.getSettings();

            // For test mode, simulate success
            if (config.mode === 'test' && params.STATUS === 'TXN_SUCCESS') {
                return {
                    success: true,
                    orderId: params.ORDERID || params.ORDER_ID,
                    transactionId: params.TXNID || `TXN${Date.now()}`,
                    amount: parseFloat(params.TXNAMOUNT)
                };
            }

            // Verify checksum
            const orderIdFallback = params.ORDERID || params.ORDER_ID || params.orderId;
            const checksumHash = params.CHECKSUMHASH;
            delete params.CHECKSUMHASH;

            if (!checksumHash) {
                return {
                    success: false,
                    orderId: orderIdFallback,
                    message: 'Missing CHECKSUMHASH'
                };
            }

            const cleanParams = {};
            for (const k of Object.keys(params)) {
                if (k === 'CHECKSUMHASH') continue;
                const v = params[k];
                cleanParams[k] = v == null ? '' : String(v);
            }

            let isValid = false;
            try {
                isValid = await this.verifyChecksum(cleanParams, checksumHash, config.merchantKey);
            } catch (e) {
                return {
                    success: false,
                    orderId: orderIdFallback,
                    message: e.message
                };
            }

            if (!isValid) {
                return {
                    success: false,
                    orderId: params.ORDERID || params.ORDER_ID,
                    message: 'Invalid checksum'
                };
            }

            if (params.STATUS === 'TXN_SUCCESS') {
                return {
                    success: true,
                    orderId: params.ORDERID || params.ORDER_ID,
                    transactionId: params.TXNID,
                    amount: parseFloat(params.TXNAMOUNT)
                };
            } else {
                return {
                    success: false,
                    orderId: params.ORDERID || params.ORDER_ID,
                    message: params.RESPMSG || 'Payment failed'
                };
            }
        } catch (error) {
            console.error('Payment Verification Error:', error.message);
            throw error;
        }
    }

    // Verify checksum via official library
    async verifyChecksum(params, checksum, merchantKey) {
        return PaytmChecksum.verifySignature(params, merchantKey, checksum);
    }

    // Update transaction status
    async updateTransaction(orderId, status, gatewayResponse) {
        try {
            const transaction = await Transaction.findOne({ gatewayOrderId: orderId });

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            transaction.status = status;
            transaction.gatewayTransactionId = gatewayResponse.transactionId || gatewayResponse.TXNID || null;
            transaction.gatewayResponse = gatewayResponse;

            await transaction.save();

            return transaction;
        } catch (error) {
            console.error('Transaction Update Error:', error.message);
            throw error;
        }
    }
}

module.exports = new PaymentService();
