import type { Socket } from "socket.io";
import type { RateLimitError } from "./types.js";

//Parses cookie string into key value pairs

export const parseCookies = (
  cookieString: string
): Record<string, string> => {
  const cookies: Record<string, string> = {};
  if (!cookieString) return cookies;

  cookieString.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name && rest.length > 0) {
      cookies[name] = decodeURIComponent(rest.join("="));
    }
  });

  return cookies;
};


export const handleRateLimitError = (
  socket: Socket,
  error: unknown,
  customMessage?: string
): boolean => {
  const rateLimitError = error as RateLimitError;
  if (rateLimitError.remainingPoints !== undefined) {
    socket.emit("error", {
      message: customMessage || "Rate limit exceeded. Please slow down.",
      retryAfter: Math.ceil((rateLimitError.msBeforeNext || 1000) / 1000),
    });
    return true;
  }
  return false;
};
