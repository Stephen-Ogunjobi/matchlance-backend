interface MongoError {
  code: number;
  keyPattern?: Record<string, number>;
  keyValue?: Record<string, unknown>;
}

export function isMongoError(error: unknown): error is MongoError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as MongoError).code === "number"
  );
}


