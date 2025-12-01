const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Create indexes after connection
    await createIndexes();
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Import models
    const User = require('../models/User');
    const TherapistSlot = require('../models/TherapistSlot');
    const Zone = require('../models/Zone');
    const Notification = require('../models/Notification');
    const Otp = require('../models/Otp');
    const Review = require('../models/Review');

    // Create indexes
    await User.createIndexes();
    await TherapistSlot.createIndexes();
    await Zone.collection.createIndex({ geometry: '2dsphere' });
    await Notification.createIndexes();
    await Otp.createIndexes();
    await Review.createIndexes();

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('⚠️ Index creation warning:', error.message);
  }
};

module.exports = connectDB;
