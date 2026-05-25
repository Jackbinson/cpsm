import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Mongoose sẽ lấy chuỗi kết nối từ file .env để gọi lên Atlas
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    console.log(`🟢 MongoDB Atlas đã kết nối thành công: ${conn.connection.host}`);
  } catch (error) {
    console.error(`🔴 Lỗi kết nối MongoDB: ${error.message}`);
    process.exit(1); 
  }
};

export default connectDB;