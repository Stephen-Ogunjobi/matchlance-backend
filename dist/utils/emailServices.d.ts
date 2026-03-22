interface ProposalNotificationDetails {
    proposedBudget?: {
        min?: number;
        max?: number;
    } | number | string;
    estimatedTime?: string;
    coverLetter?: string;
}
interface ProposalAcceptanceDetails {
    proposedBudget?: {
        min?: number;
        max?: number;
    };
    estimatedTime?: string;
}
interface ContractDetails {
    _id: string;
    budget: {
        type: string;
        amount: number;
    };
    duration: {
        startDate: string | Date;
    };
}
export declare const generateToken: () => string;
export declare const sendVerificationEmail: (email: string, firstName: string, token: string) => Promise<{
    success: boolean;
    error?: never;
} | {
    success: boolean;
    error: unknown;
}>;
export declare const sendPasswordResetEmail: (email: string, firstName: string, token: string) => Promise<{
    success: boolean;
    error?: never;
} | {
    success: boolean;
    error: unknown;
}>;
export declare const sendProposalNotificationEmail: (email: string, firstName: string, jobTitle: string, freelancerName: string, proposalDetails: ProposalNotificationDetails) => Promise<{
    success: boolean;
    error?: never;
} | {
    success: boolean;
    error: unknown;
}>;
export declare const sendProposalAcceptanceEmail: (email: string, freelancerName: string, jobTitle: string, clientName: string, proposalDetails: ProposalAcceptanceDetails) => Promise<{
    success: boolean;
    error?: never;
} | {
    success: boolean;
    error: unknown;
}>;
export declare const sendFreelancerHiredEmail: (email: string, freelancerName: string, clientName: string, jobTitle: string, contractDetails: ContractDetails) => Promise<{
    success: boolean;
    error?: never;
} | {
    success: boolean;
    error: unknown;
}>;
export {};
//# sourceMappingURL=emailServices.d.ts.map