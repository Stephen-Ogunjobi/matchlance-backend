import { redisClient } from "../../config/redis.js";

//redis key for online users
const ONLINE_USERS_KEY = "online_users";

/**
 * Add a user to the online users list
 * @param userId - The user's ID
 * @param socketId - The socket connection ID
 */
export const addOnlineUser = async (userId: string, socketId: string) => {
  await redisClient.hset(ONLINE_USERS_KEY, userId, socketId);
};

/**
 * Remove a user from the online users list
 * @param userId - The user's ID
 */
export const removeOnlineUser = async (userId: string) => {
  await redisClient.hdel(ONLINE_USERS_KEY, userId);
};

/**
 * Get a user's socket ID if they are online
 * @param userId - The user's ID
 * @returns The socket ID if online, null otherwise
 */
export const getOnlineUserSocketId = async (
  userId: string
): Promise<string | null> => {
  return await redisClient.hget(ONLINE_USERS_KEY, userId);
};

/**
 * Get all online user IDs
 * @returns Array of online user IDs
 */
export const getAllOnlineUsers = async (): Promise<string[]> => {
  const users = await redisClient.hkeys(ONLINE_USERS_KEY);
  return users;
};
