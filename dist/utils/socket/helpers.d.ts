import type { Socket } from "socket.io";
export declare const parseCookies: (cookieString: string) => Record<string, string>;
export declare const handleRateLimitError: (socket: Socket, error: unknown, customMessage?: string) => boolean;
//# sourceMappingURL=helpers.d.ts.map