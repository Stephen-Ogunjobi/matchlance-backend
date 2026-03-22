//Parses cookie string into key value pairs
export const parseCookies = (cookieString) => {
    const cookies = {};
    if (!cookieString)
        return cookies;
    cookieString.split(";").forEach((cookie) => {
        const [name, ...rest] = cookie.trim().split("=");
        if (name && rest.length > 0) {
            cookies[name] = decodeURIComponent(rest.join("="));
        }
    });
    return cookies;
};
export const handleRateLimitError = (socket, error, customMessage) => {
    const rateLimitError = error;
    if (rateLimitError.remainingPoints !== undefined) {
        socket.emit("error", {
            message: customMessage || "Rate limit exceeded. Please slow down.",
            retryAfter: Math.ceil((rateLimitError.msBeforeNext || 1000) / 1000),
        });
        return true;
    }
    return false;
};
//# sourceMappingURL=helpers.js.map