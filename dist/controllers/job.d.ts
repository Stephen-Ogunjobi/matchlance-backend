import type { Request, Response } from "express";
export declare const postNewJob: (req: Request, res: Response) => Promise<Response>;
export declare const getJobs: (req: Request, res: Response) => Promise<Response>;
export declare const getJob: (req: Request, res: Response) => Promise<Response>;
export declare const updateJob: (req: Request, res: Response) => Promise<Response>;
export declare const deleteJob: (req: Request, res: Response) => Promise<Response>;
export declare const acceptJobProposal: (req: Request, res: Response) => Promise<Response>;
export declare const searchJobs: (req: Request, res: Response) => Promise<Response>;
export declare const rejectJobProposal: (req: Request, res: Response) => Promise<Response>;
//# sourceMappingURL=job.d.ts.map