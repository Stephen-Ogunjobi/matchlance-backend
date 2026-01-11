import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

const baseRedisClient = new Redis(redisConfig);

const originalSet = baseRedisClient.set.bind(baseRedisClient);
baseRedisClient.set = function (
  key: string | Buffer,
  value: string | Buffer | number,
  ...args: any[]
) {
  const filteredArgs = args.filter((arg) => {
    if (typeof arg === "object" && arg !== null && !Array.isArray(arg)) {
      if ("EX" in arg) {
        return false;
      }
      return false;
    }
    return true;
  });
  return originalSet(key, value, ...filteredArgs);
} as any;

export const redisClient = baseRedisClient;

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
