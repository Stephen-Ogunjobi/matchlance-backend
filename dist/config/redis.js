import { Redis } from "ioredis";
import dotenv from "dotenv";
dotenv.config();
const redisConfig = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
};
const createRedis = () => process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : new Redis(redisConfig);
const baseRedisClient = createRedis();
const originalSet = baseRedisClient.set.bind(baseRedisClient);
baseRedisClient.set = function (key, value, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
...args) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
};
export const redisClient = baseRedisClient;
//socket.io adapter clients
export const pubClient = createRedis();
export const subClient = createRedis();
pubClient.on("error", (err) => console.log("redis pubClient error:", err));
subClient.on("error", (err) => console.log("redis subClient error:", err));
redisClient.on("error", (err) => console.log("redis client error:", err));
redisClient.on("connect", () => console.log("connected to redis"));
//# sourceMappingURL=redis.js.map