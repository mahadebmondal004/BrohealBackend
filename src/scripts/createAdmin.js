require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

const createAdminUser = async () => {
    try {
        // Connect to database
        await connectDB();

        // Admin credentials
        const adminData = {
            name: 'Admin User',
            phone: '9999999999',
            email: 'admin@broheal.com',
            password: 'Admin@123',
            role: 'admin',
            status: 'active',
            whatsappVerified: true
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({
            $or: [
                { email: adminData.email },
                { phone: adminData.phone }
            ]
        });

        if (existingAdmin) {
            if (existingAdmin.role !== 'admin') {
                existingAdmin.role = 'admin';
                existingAdmin.status = 'active';
                await existingAdmin.save();
                console.log('\n✅ Existing user upgraded to admin successfully!');
            } else {
                console.log('\n⚠️  Admin user already exists!');
            }

            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📋 ADMIN CREDENTIALS');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('👤 Name:', existingAdmin.name);
            console.log('📱 Phone:', existingAdmin.phone);
            console.log('📧 Email:', existingAdmin.email);
            console.log('🆔 User ID:', existingAdmin._id);
            console.log('👑 Role:', existingAdmin.role);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('\n🔗 Admin Login URL: http://localhost:5173/admin');
            console.log('🔑 Use email or phone with OTP to login\n');
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create(adminData);

        console.log('\n✅ Admin user created successfully!');
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 ADMIN CREDENTIALS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👤 Name:', admin.name);
        console.log('📱 Phone:', admin.phone);
        console.log('📧 Email:', admin.email);
        console.log('🆔 User ID:', admin._id);
        console.log('👑 Role:', admin.role);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🔗 Admin Login URL: http://localhost:5173/admin');
        console.log('\n💡 Login Instructions:');
        console.log('   1. Visit: http://localhost:5173/admin');
        console.log('   2. Choose Email or Phone login');
        console.log('   3. Enter email (admin@broheal.com) or phone (9999999999)');
        console.log('   4. Click "Send OTP"');
        console.log('   5. Enter the OTP received');
        console.log('   6. You will be redirected to Admin Dashboard\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error creating admin user:', error.message);
        process.exit(1);
    }
};

createAdminUser();
