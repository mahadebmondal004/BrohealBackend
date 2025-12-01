module.exports = {
    USER_ROLES: {
        USER: 'user',
        THERAPIST: 'therapist',
        ADMIN: 'admin'
    },

    USER_STATUS: {
        ACTIVE: 'active',
        INACTIVE: 'inactive',
        SUSPENDED: 'suspended'
    },

    BOOKING_STATUS: {
        BOOKED: 'booked',
        ON_THE_WAY: 'on_the_way',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    },

    PAYMENT_STATUS: {
        PENDING: 'pending',
        SUCCESS: 'success',
        FAILED: 'failed'
    },

    KYC_STATUS: {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected'
    },

    SLOT_STATUS: {
        AVAILABLE: 'available',
        BOOKED: 'booked',
        BLOCKED: 'blocked'
    },

    NOTIFICATION_TYPES: {
        IN_APP: 'inapp',
        EMAIL: 'email',
        WHATSAPP: 'whatsapp',
        PUSH: 'push'
    },

    TRANSACTION_TYPES: {
        PAYMENT: 'payment',
        WALLET_CREDIT: 'wallet_credit',
        COMMISSION: 'commission',
        WITHDRAWAL: 'withdrawal'
    },

    ID_TYPES: {
        AADHAR: 'aadhar',
        VOTER: 'voter',
        PASSPORT: 'passport',
        DRIVING_LICENCE: 'driving_licence'
    },

    ZONE_TYPES: {
        COUNTRY: 'country',
        STATE: 'state',
        CITY: 'city',
        ZONE: 'zone'
    }
};
