import { Schema, model, Document, Types } from "mongoose";
const clientProfileSchema = new Schema({
    clientId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    bio: {
        type: String,
        trim: true,
        maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    profilePicture: {
        type: String,
        default: null,
    },
    company: {
        name: {
            type: String,
            trim: true,
            maxlength: [100, "Company name cannot exceed 100 characters"],
        },
        website: {
            type: String,
            trim: true,
            validate: {
                validator: function (url) {
                    if (!url)
                        return true;
                    return /^https?:\/\/.+/.test(url);
                },
                message: "Website must be a valid URL starting with http:// or https://",
            },
        },
        size: {
            type: String,
            enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
        },
        industry: {
            type: String,
            trim: true,
            maxlength: [100, "Industry cannot exceed 100 characters"],
        },
    },
    location: {
        country: {
            type: String,
            required: [true, "Country is required"],
        },
        city: String,
        timezone: {
            type: String,
            required: [true, "Timezone is required"],
        },
    },
    hiringPreferences: {
        categories: {
            type: [String],
            enum: [
                "web-development",
                "mobile-development",
                "design",
                "writing",
                "marketing",
                "data-science",
                "other",
            ],
            validate: {
                validator: function (categories) {
                    return categories.length <= 5;
                },
                message: "You can select up to 5 categories",
            },
            default: [],
        },
        preferredExperienceLevel: {
            type: String,
            enum: ["entry", "intermediate", "expert"],
        },
        typicalBudget: {
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
                enum: ["USD", "NGN", "EUR", "GBP"],
                default: "USD",
            },
        },
    },
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        count: {
            type: Number,
            default: 0,
        },
        breakdown: {
            5: { type: Number, default: 0 },
            4: { type: Number, default: 0 },
            3: { type: Number, default: 0 },
            2: { type: Number, default: 0 },
            1: { type: Number, default: 0 },
        },
    },
    reviews: {
        type: [
            {
                freelancerId: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                contractId: {
                    type: Schema.Types.ObjectId,
                    ref: "Contract",
                    required: true,
                },
                rating: {
                    type: Number,
                    required: true,
                    min: [1, "Rating must be at least 1"],
                    max: [5, "Rating cannot exceed 5"],
                },
                comment: {
                    type: String,
                    trim: true,
                    maxlength: [1000, "Review comment cannot exceed 1000 characters"],
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        default: [],
    },
    totalJobsPosted: {
        type: Number,
        default: 0,
    },
    totalHires: {
        type: Number,
        default: 0,
    },
    totalSpent: {
        type: Number,
        default: 0,
    },
    hireRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    paymentVerified: {
        type: Boolean,
        default: false,
    },
    preferredCurrency: {
        type: String,
        enum: ["USD", "NGN", "EUR", "GBP"],
        default: "USD",
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    profileCompleteness: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    lastActive: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
clientProfileSchema.index({ "location.country": 1, "location.city": 1 });
clientProfileSchema.index({ "hiringPreferences.categories": 1 });
clientProfileSchema.index({ "rating.average": -1, totalJobsPosted: -1 });
clientProfileSchema.index({ lastActive: -1 });
clientProfileSchema.index({ paymentVerified: 1 });
// Validate budget range
clientProfileSchema.pre("validate", function () {
    const { min, max } = this.hiringPreferences.typicalBudget;
    if (min !== undefined && max !== undefined && max < min) {
        throw new Error("Maximum budget cannot be less than minimum budget");
    }
});
// Auto-calculate profile completeness before save
clientProfileSchema.pre("save", function () {
    let completeness = 0;
    // Location (required fields) — 20%
    if (this.location.country && this.location.timezone) {
        completeness += 20;
    }
    // Profile picture — 20%
    if (this.profilePicture) {
        completeness += 20;
    }
    // Bio — 20%
    if (this.bio) {
        completeness += 20;
    }
    // Company info (at least name or industry) — 20%
    if (this.company.name || this.company.industry) {
        completeness += 20;
    }
    // Hiring preferences (at least one category) — 20%
    if (this.hiringPreferences.categories.length > 0) {
        completeness += 20;
    }
    this.profileCompleteness = completeness;
});
export const ClientProfile = model("ClientProfile", clientProfileSchema);
//# sourceMappingURL=client.js.map