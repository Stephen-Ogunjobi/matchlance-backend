import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

export const redisClient = new Redis(redisConfig);

//socket.io adapter clients
export const pubClient = new Redis(redisConfig);
export const subClient = new Redis(redisConfig);

pubClient.on("error", (err: Error) =>
  console.log("redis pubClient error:", err)
);

subClient.on("error", (err: Error) =>
  console.log("redis subClient error:", err)
);

redisClient.on("error", (err: Error) =>
  console.log("redis client error:", err)
);

redisClient.on("connect", () => console.log("connected to redis"));
