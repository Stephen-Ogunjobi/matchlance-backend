import type { Request, Response, NextFunction } from "express";
declare const postSignup: (req: Request, res: Response) => Promise<Response>;
declare const verifyEmail: (req: Request, res: Response) => Promise<Response>;
declare const initiateGoogleAuth: (req: Request, res: Response, next: NextFunction) => void;
declare const handleGoogleCallback: (req: Request, res: Response) => Promise<Response | void>;
declare const postLogin: (req: Request, res: Response) => Promise<Response>;
declare const postRefresh: (req: Request, res: Response) => Promise<Response>;
declare const postLogout: (req: Request, res: Response) => Promise<Response>;
declare const postResetPassword: (req: Request, res: Response) => Promise<Response>;
declare const postNewPassword: (req: Request, res: Response) => Promise<Response>;
declare const verifyLogin: (req: Request, res: Response) => Promise<Response>;
declare const getCurrentUser: (req: Request, res: Response) => Promise<Response>;
declare const resendVerificationEmail: (req: Request, res: Response) => Promise<Response>;
export { postSignup, postLogin, postRefresh, postLogout, postResetPassword, postNewPassword, verifyLogin, initiateGoogleAuth, handleGoogleCallback, resendVerificationEmail, verifyEmail, getCurrentUser, };
//# sourceMappingURL=auth.d.ts.map