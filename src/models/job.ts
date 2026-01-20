import { Schema, model, Document, Types } from "mongoose";

export interface IJob extends Document {
  title: string;
  description: string;
  category:
    | "web-development"
    | "mobile-development"
    | "design"
    | "writing"
    | "marketing"
    | "data-science"
    | "other";
  skills: string[];
  budget: {
    type: "fixed" | "hourly";
    amount?: number;
    min?: number;
    max?: number;
    currency: "USD";
  };
  experienceLevel: "entry" | "intermediate" | "expert";
  duration: {
    type: "short" | "medium" | "long";
    estimatedHours?: number;
  };
  clientId: Types.ObjectId;
  status:
    | "draft"
    | "open"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "closed";
  proposals: string[];
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      minlength: [10, "Title must be at least 10 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
      minlength: [100, "Description must be at least 100 characters"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "web-development",
          "mobile-development",
          "design",
          "writing",
          "marketing",
          "data-science",
          "other",
        ],
        message: "{VALUE} is not a valid category",
      },
    },

    skills: {
      type: [String],
      required: [true, "At least one skill is required"],
      validate: {
        validator: function (skills: string[]) {
          return skills.length >= 1 && skills.length <= 10;
        },
        message: "You must provide between 1 and 10 skills",
      },
    },

    budget: {
      type: {
        type: String,
        required: true,
        enum: ["fixed", "hourly"],
      },
      amount: {
        type: Number,
        min: [0, "Budget cannot be negative"],
      },
      min: {
        type: Number,
        min: [0, "Minimum budget cannot be negative"],
      },
      max: {
        type: Number,
        min: [0, "Maximum budget cannot be negative"],
      },
      currency: {
        type: String,
        required: true,
        default: "USD",
      },
    },

    experienceLevel: {
      type: String,
      required: [true, "Experience level is required"],
      enum: {
        values: ["entry", "intermediate", "expert"],
        message: "{VALUE} is not a valid experience level",
      },
    },

    duration: {
      type: {
        type: String,
        required: true,
        enum: ["short", "medium", "long"],
      },
      estimatedHours: {
        type: Number,
        min: [1, "Estimated hours must be at least 1"],
      },
    },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Client ID is required"],
    },

    status: {
      type: String,
      enum: [
        "draft",
        "open",
        "in_progress",
        "completed",
        "cancelled",
        "closed",
      ],
      default: "open",
    },
    proposals: [
      {
        type: Schema.Types.ObjectId,
        ref: "Proposal",
      },
    ],
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ title: "text", description: "text" });
jobSchema.index({ category: 1, status: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ clientId: 1 });
jobSchema.index({ createdAt: -1 });

// Custom validation for budget
jobSchema.pre("validate", function () {
  if (this.budget.type === "fixed" && !this.budget.amount) {
    throw new Error("Fixed budget requires an amount");
  }
  if (this.budget.type === "hourly" && (!this.budget.min || !this.budget.max)) {
    throw new Error("Hourly budget requires min and max rates");
  }
  if (this.budget.max && this.budget.min && this.budget.max < this.budget.min) {
    throw new Error("Maximum budget cannot be less than minimum budget");
  }
});

export const Job = model<IJob>("Job", jobSchema);
