import { Schema, model, Document, Types } from "mongoose";
const contractSchema = new Schema({
    // References
    jobId: {
        type: Schema.Types.ObjectId,
        ref: "Job",
        required: true,
        index: true,
    },
    clientId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    freelancerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    proposalId: {
        type: Schema.Types.ObjectId,
        ref: "Proposal",
        required: true,
    },
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
    },
    // Project details snapshot (from job at time of contract creation)
    projectDetails: {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
        },
        skills: {
            type: [String],
            required: true,
        },
    },
    // Budget (from proposal)
    budget: {
        type: {
            type: String,
            enum: ["fixed", "hourly"],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            required: true,
            enum: ["USD", "NGN", "EUR", "GBP"],
        },
    },
    // Timeline
    duration: {
        startDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        deadline: Date,
        estimatedDuration: {
            type: Number,
            required: true,
        },
    },
    // Status
    status: {
        type: String,
        enum: [
            "active",
            "in_progress",
            "under_review",
            "completed",
            "cancelled",
            "disputed",
        ],
        default: "active",
        index: true,
    },
    // Deliverables
    deliverables: [
        {
            description: {
                type: String,
                required: true,
            },
            submittedAt: Date,
            fileUrl: String,
            status: {
                type: String,
                enum: ["pending", "submitted", "approved", "revision_requested"],
                default: "pending",
            },
            feedback: String,
        },
    ],
    // Completion
    completionRequest: {
        requestedBy: {
            type: String,
            enum: ["client", "freelancer"],
        },
        requestedAt: Date,
        message: String,
    },
    completedAt: Date,
    completedBy: {
        type: String,
        enum: ["client", "freelancer", "mutual"],
    },
    // Cancellation
    cancellationRequest: {
        requestedBy: {
            type: String,
            enum: ["client", "freelancer"],
        },
        requestedAt: Date,
        reason: {
            type: String,
            maxlength: 500,
        },
        approvedBy: {
            type: String,
            enum: ["client", "freelancer"],
        },
        approvedAt: Date,
    },
    cancelledAt: Date,
    cancellationReason: {
        type: String,
        maxlength: 500,
    },
    // Dispute
    dispute: {
        isDisputed: {
            type: Boolean,
            default: false,
        },
        filedBy: {
            type: String,
            enum: ["client", "freelancer"],
        },
        filedAt: Date,
        reason: {
            type: String,
            maxlength: 1000,
        },
        status: {
            type: String,
            enum: ["open", "under_review", "resolved"],
        },
        resolution: String,
        resolvedAt: Date,
        resolvedBy: {
            type: String,
            enum: ["admin", "mutual_agreement"],
        },
    },
    // Reviews
    reviews: {
        clientReview: {
            rating: {
                type: Number,
                min: 1,
                max: 5,
            },
            comment: {
                type: String,
                maxlength: 1000,
            },
            reviewedAt: Date,
        },
        freelancerReview: {
            rating: {
                type: Number,
                min: 1,
                max: 5,
            },
            comment: {
                type: String,
                maxlength: 1000,
            },
            reviewedAt: Date,
        },
    },
}, {
    timestamps: true,
});
// Compound indexes for common queries
contractSchema.index({ clientId: 1, status: 1, createdAt: -1 });
contractSchema.index({ freelancerId: 1, status: 1, createdAt: -1 });
contractSchema.index({ status: 1, createdAt: -1 });
// Prevent duplicate active contracts for same job
contractSchema.index({ jobId: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: {
        status: { $in: ["active", "in_progress", "under_review"] },
    },
});
export const Contract = model("Contract", contractSchema);
//# sourceMappingURL=contract.js.map