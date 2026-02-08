import mongoose from "mongoose";

const MONGO_URI: string =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/testdb";

async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected:", MONGO_URI);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("MongoDB connection error:", err.message);
    } else {
      console.error("MongoDB connection error:", err);
    }
    process.exit(1);
  }
}

export default connectDB;
