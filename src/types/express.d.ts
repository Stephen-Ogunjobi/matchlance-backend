declare global {
  namespace Express {
    interface User {
      userId: string;
      email?: string;
      role?: string;
      iat?: number;
      exp?: number;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
