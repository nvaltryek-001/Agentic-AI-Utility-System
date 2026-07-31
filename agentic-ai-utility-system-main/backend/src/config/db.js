import mongoose from "mongoose";

const MAX_RETRIES = 5;
const RETRY_DELAY = 3000;

const connectDB = async (retries = 0) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed (Attempt ${retries + 1}/${MAX_RETRIES}):`, error.message);
    
    if (retries < MAX_RETRIES - 1) {
      console.log(`⏳ Retrying in ${RETRY_DELAY / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectDB(retries + 1);
    }
    
    throw error;
  }
};

export default connectDB;
