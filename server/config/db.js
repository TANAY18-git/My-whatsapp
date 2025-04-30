const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    const mongoURI = config.MONGODB_URI;
    console.log('MongoDB URI:', mongoURI); // For debugging

    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
