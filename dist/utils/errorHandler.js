export function isMongoError(error) {
    return (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "number");
}
//# sourceMappingURL=errorHandler.js.map