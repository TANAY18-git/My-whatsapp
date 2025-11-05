require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET || 'whatsapp_web_secret_key',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
