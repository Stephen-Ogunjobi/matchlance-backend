import { Schema, model, Document, Types } from "mongoose";

export interface IProposal extends Document {
  jobId: Types.ObjectId;
  freelancerId: Types.ObjectId;
  coverLetter: string;
  proposedBudget: {
    min: number;
    max: number;
  };
  estimatedTime:
    | "less-than-month"
    | "1-month"
    | "2-months"
    | "3-months"
    | "more-than-3-months";
  availability: "immediately" | "few-days" | "1-week" | "2-weeks";
  portfolioLinks?: string[];
  questions?: string;
  attachments?: string[];
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  createdAt: Date;
  updatedAt: Date;
}

const proposalSchema = new Schema<IProposal>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job ID is required"],
      index: true,
    },

    freelancerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Freelancer ID is required"],
      index: true,
    },

    coverLetter: {
      type: String,
      required: [true, "Cover letter is required"],
      trim: true,
      minlength: [100, "Cover letter must be at least 100 characters"],
      maxlength: [2000, "Cover letter cannot exceed 2000 characters"],
    },

    proposedBudget: {
      min: {
        type: Number,
        required: [true, "Minimum budget is required"],
        min: [0, "Minimum rate cannot be negative"],
      },
      max: {
        type: Number,
        required: [true, "Maximum budget is required"],
        min: [0, "Maximum rate cannot be negative"],
      },
    },

    estimatedTime: {
      type: String,
      required: [true, "Estimated time is required"],
      enum: {
        values: [
          "less-than-month",
          "1-month",
          "2-months",
          "3-months",
          "more-than-3-months",
        ],
        message: "{VALUE} is not a valid estimated time",
      },
    },

    availability: {
      type: String,
      required: [true, "Availability is required"],
      enum: {
        values: ["immediately", "few-days", "1-week", "2-weeks"],
        message: "{VALUE} is not a valid availability option",
      },
    },

    portfolioLinks: {
      type: [String],
      validate: {
        validator: function (links: string[]) {
          if (!links || links.length === 0) return true; // Optional field
          return links.every((link) => {
            try {
              new URL(link);
              return true;
            } catch {
              return false;
            }
          });
        },
        message: "All portfolio links must be valid URLs",
      },
      maxlength: [5, "Cannot exceed 5 portfolio links"],
    },

    questions: {
      type: String,
      trim: true,
      maxlength: [1000, "Questions cannot exceed 1000 characters"],
    },

    attachments: {
      type: [String],
      validate: {
        validator: function (attachments: string[]) {
          return !attachments || attachments.length <= 5;
        },
        message: "Cannot exceed 5 attachments",
      },
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for better query performance
proposalSchema.index({ jobId: 1, freelancerId: 1 }, { unique: true }); // One proposal per freelancer per job
proposalSchema.index({ jobId: 1, status: 1 }); // Query proposals by job and status
proposalSchema.index({ freelancerId: 1, status: 1 }); // Query freelancer's proposals by status
proposalSchema.index({ createdAt: -1 }); // Sort by most recent

proposalSchema.pre("validate", function (greater) {
  if (this.proposedBudget.max < this.proposedBudget.min) {
    throw new Error("Maximum budget cannot be less than minimum budget");
  }
});

// Virtual for proposal age in days
proposalSchema.virtual("ageInDays").get(function () {
  return Math.floor(
    (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
});

export const Proposal = model<IProposal>("Proposal", proposalSchema);
