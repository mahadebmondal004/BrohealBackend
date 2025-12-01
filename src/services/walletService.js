const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');

class WalletService {
    // Get commission percentage from settings
    async getCommissionPercentage() {
        const setting = await Setting.findOne({ key: 'commission_percentage' });
        return setting ? setting.value : parseFloat(process.env.COMMISSION_PERCENTAGE) || 10;
    }

    // Calculate commission
    async calculateCommission(amount) {
        const commissionPercentage = await this.getCommissionPercentage();
        const commission = (amount * commissionPercentage) / 100;
        const therapistAmount = amount - commission;

        return {
            totalAmount: amount,
            commission,
            therapistAmount
        };
    }

    // Credit wallet after successful payment
    async creditWallet(therapistId, bookingId, amount) {
        try {
            const { commission, therapistAmount } = await this.calculateCommission(amount);

            // Find or create wallet
            let wallet = await Wallet.findOne({ therapistId });

            if (!wallet) {
                wallet = await Wallet.create({
                    therapistId,
                    balance: 0,
                    totalEarned: 0,
                    totalWithdrawn: 0
                });
            }

            // Update wallet
            wallet.balance += therapistAmount;
            wallet.totalEarned += therapistAmount;
            wallet.lastUpdated = new Date();
            await wallet.save();

            // Create wallet credit transaction
            await Transaction.create({
                bookingId,
                userId: therapistId,
                therapistId,
                transactionType: 'wallet_credit',
                amount: therapistAmount,
                status: 'success'
            });

            // Create commission transaction
            await Transaction.create({
                bookingId,
                userId: therapistId,
                therapistId,
                transactionType: 'commission',
                amount: commission,
                status: 'success'
            });

            return {
                success: true,
                wallet,
                creditedAmount: therapistAmount,
                commission
            };
        } catch (error) {
            console.error('Wallet Credit Error:', error.message);
            throw error;
        }
    }

    // Process withdrawal request
    async processWithdrawal(therapistId, amount, bankDetails) {
        try {
            const wallet = await Wallet.findOne({ therapistId });

            if (!wallet) {
                throw new Error('Wallet not found');
            }

            if (wallet.balance < amount) {
                throw new Error('Insufficient balance');
            }

            // Deduct from wallet
            wallet.balance -= amount;
            wallet.totalWithdrawn += amount;
            wallet.lastUpdated = new Date();
            await wallet.save();

            // Create withdrawal transaction
            const transaction = await Transaction.create({
                userId: therapistId,
                therapistId,
                transactionType: 'withdrawal',
                amount,
                status: 'success',
                gatewayResponse: { bankDetails }
            });

            return {
                success: true,
                wallet,
                transaction
            };
        } catch (error) {
            console.error('Withdrawal Error:', error.message);
            throw error;
        }
    }

    // Get wallet balance
    async getBalance(therapistId) {
        let wallet = await Wallet.findOne({ therapistId });

        if (!wallet) {
            wallet = await Wallet.create({
                therapistId,
                balance: 0,
                totalEarned: 0,
                totalWithdrawn: 0
            });
        }

        return wallet;
    }

    // Get transaction history
    async getTransactions(therapistId, limit = 50) {
        const transactions = await Transaction.find({ therapistId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('bookingId', 'bookingDateTime status');

        return transactions;
    }
}

module.exports = new WalletService();
