import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDb = async () => {
  try {
    const url = process.env.MONGODB_URL;

    if (!url) {
      throw new Error("URL not found");
    }

    await mongoose.connect(url);
    console.log("connected");
  } catch (err) {
    console.log("Error connecting");
    process.exit(1);
  }
};

export default connectDb;
