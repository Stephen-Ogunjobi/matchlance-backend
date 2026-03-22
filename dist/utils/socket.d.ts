import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
export declare const initializeSocket: (server: HttpServer) => SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const getOnlineUsers: () => Promise<string[]>;
//# sourceMappingURL=socket.d.ts.map