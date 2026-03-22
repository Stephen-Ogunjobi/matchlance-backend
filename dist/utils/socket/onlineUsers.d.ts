/**
 * Add a user to the online users list
 * @param userId - The user's ID
 * @param socketId - The socket connection ID
 */
export declare const addOnlineUser: (userId: string, socketId: string) => Promise<void>;
/**
 * Remove a user from the online users list
 * @param userId - The user's ID
 */
export declare const removeOnlineUser: (userId: string) => Promise<void>;
/**
 * Get a user's socket ID if they are online
 * @param userId - The user's ID
 * @returns The socket ID if online, null otherwise
 */
export declare const getOnlineUserSocketId: (userId: string) => Promise<string | null>;
/**
 * Get all online user IDs
 * @returns Array of online user IDs
 */
export declare const getAllOnlineUsers: () => Promise<string[]>;
//# sourceMappingURL=onlineUsers.d.ts.map