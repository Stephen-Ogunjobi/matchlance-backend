import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
});

redisClient.on("error", (err: Error) =>
  console.log("redis client error:", err)
);

redisClient.on("connect", () => console.log("connected to redis"));
