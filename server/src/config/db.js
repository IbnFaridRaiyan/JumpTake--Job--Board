const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jumptake';
    console.log('[DB] Attempting to connect to MongoDB at:', uri);
    
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB is down
    });

    isConnected = true;
    console.log(`[DB] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    isConnected = false;
    console.error(`[DB] Error connecting to MongoDB: ${error.message}`);
    console.error('[DB] Server will continue running without database. Resume parsing will still work via Gemini API.');
    // DO NOT call process.exit(1) — let the server keep running
  }
};

const getIsConnected = () => isConnected || mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.getIsConnected = getIsConnected;