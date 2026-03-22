import { Document, Types } from "mongoose";
export interface IProposal extends Document {
    jobId: Types.ObjectId;
    freelancerId: Types.ObjectId;
    coverLetter: string;
    proposedBudget: {
        min: number;
        max: number;
    };
    estimatedTime: "less-than-month" | "1-month" | "2-months" | "3-months" | "more-than-3-months";
    availability: "immediately" | "few-days" | "1-week" | "2-weeks";
    portfolioLinks?: string[];
    questions?: string;
    attachments?: string[];
    status: "pending" | "accepted" | "rejected" | "withdrawn";
    createdAt: Date;
    updatedAt: Date;
}
export declare const Proposal: import("mongoose").Model<IProposal, {}, {}, {}, Document<unknown, {}, IProposal, {}, import("mongoose").DefaultSchemaOptions> & IProposal & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any, IProposal>;
//# sourceMappingURL=proposal.d.ts.map