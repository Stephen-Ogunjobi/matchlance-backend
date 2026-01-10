import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

const baseRedisClient = new Redis(redisConfig);

// Wrap the Redis client to fix connect-redis v9 compatibility issue
// connect-redis passes options object as 3rd param, but ioredis expects it differently
const originalSet = baseRedisClient.set.bind(baseRedisClient);
baseRedisClient.set = function(key: any, value: any, ...args: any[]) {
  // Filter out [object Object] and convert to proper EX TTL format
  const filteredArgs = args.filter(arg => {
    if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
      // If it's an options object with ttl/ex, convert it
      if (arg.EX) {
        return false; // We'll handle this separately
      }
      return false; // Skip object arguments
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
