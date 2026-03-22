interface MongoError {
    code: number;
    keyPattern?: Record<string, number>;
    keyValue?: Record<string, unknown>;
}
export declare function isMongoError(error: unknown): error is MongoError;
export {};
//# sourceMappingURL=errorHandler.d.ts.map