import { Schema, model, Document, Types } from "mongoose";

export interface IFreelancerProfile extends Document {
  freelancerId: Types.ObjectId;
  bio: string;
  title: string;
  profilePicture?: string;

  skills: string[];
  categories: string[];
  experienceLevel: "entry" | "intermediate" | "expert";
  hourlyRate: {
    min: number;
    max: number;
    currency: string;
  };
  availability: {
    status: "available" | "busy" | "not-available";
    hoursPerWeek: number;
    startDate?: Date;
  };

  location: {
    country: string;
    city?: string;
    timezone: string;
    coordinates?: {
      type: string;
      coordinates: [number, number];
    };
  };

  // Reputation
  rating: {
    average: number;
    count: number;
    breakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };

  completedJobs: number;
  successRate: number;
  totalEarnings: number;

  languages: Array<{
    language: string;
    proficiency: "basic" | "conversational" | "fluent" | "native";
  }>;

  // System
  isVerified: boolean;
  profileCompleteness: number;
  isAvailableForHire: boolean;
  lastActive: Date;
  searchKeywords: string[];

  createdAt: Date;
  updatedAt: Date;
}

const freelancerProfileSchema = new Schema<IFreelancerProfile>(
  {
    freelancerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    bio: {
      type: String,
      required: [true, "Bio is required"],
      trim: true,
      minlength: [50, "Bio must be at least 50 characters"],
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },

    title: {
      type: String,
      required: [true, "Professional title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    profilePicture: {
      type: String,
      default: null,
    },

    skills: {
      type: [String],
      required: [true, "At least 3 skills are required"],
      validate: {
        validator: function (skills: string[]) {
          return skills.length >= 3 && skills.length <= 20;
        },
        message: "You must provide between 3 and 20 skills",
      },
    },

    categories: {
      type: [String],
      required: [true, "At least one category is required"],
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
        validator: function (categories: string[]) {
          return categories.length >= 1 && categories.length <= 3;
        },
        message: "You must select between 1 and 3 categories",
      },
    },

    experienceLevel: {
      type: String,
      required: [true, "Experience level is required"],
      enum: ["entry", "intermediate", "expert"],
    },

    hourlyRate: {
      min: {
        type: Number,
        required: true,
        min: [0, "Minimum rate cannot be negative"],
      },
      max: {
        type: Number,
        required: true,
        min: [0, "Maximum rate cannot be negative"],
      },
      currency: {
        type: String,
        required: true,
        enum: ["USD", "NGN", "EUR", "GBP"],
        default: "USD",
      },
    },

    availability: {
      status: {
        type: String,
        required: true,
        enum: ["available", "busy", "not-available"],
        default: "available",
      },
      hoursPerWeek: {
        type: Number,
        required: true,
        min: [1, "Hours per week must be at least 1"],
        max: [168, "Hours per week cannot exceed 168"],
      },
      startDate: {
        type: Date,
      },
    },

    location: {
      country: {
        type: String,
        required: true,
      },
      city: String,
      timezone: {
        type: String,
        required: true,
      },
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          validate: {
            validator: function (coords: number[]) {
              return coords.length === 2;
            },
            message: "Coordinates must be [longitude, latitude]",
          },
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

    completedJobs: {
      type: Number,
      default: 0,
    },

    successRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    totalEarnings: {
      type: Number,
      default: 0,
    },

    languages: {
      type: [
        {
          language: {
            type: String,
            required: true,
          },
          proficiency: {
            type: String,
            required: true,
            enum: ["basic", "conversational", "fluent", "native"],
          },
        },
      ],
      required: [true, "At least one language is required"],
      validate: {
        validator: function (langs: any[]) {
          return langs.length >= 1;
        },
        message: "At least one language is required",
      },
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

    isAvailableForHire: {
      type: Boolean,
      default: true,
    },

    lastActive: {
      type: Date,
      default: Date.now,
    },

    searchKeywords: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for matching and search
freelancerProfileSchema.index({ skills: 1 });
freelancerProfileSchema.index({ categories: 1 });
freelancerProfileSchema.index({ experienceLevel: 1 });
freelancerProfileSchema.index({ "availability.status": 1 });
freelancerProfileSchema.index({ "location.country": 1, "location.city": 1 });
freelancerProfileSchema.index({ "location.coordinates": "2dsphere" }); // Geospatial
freelancerProfileSchema.index({ "rating.average": -1, completedJobs: -1 });
freelancerProfileSchema.index({ lastActive: -1 });
freelancerProfileSchema.index({
  title: "text",
  bio: "text",
  searchKeywords: "text",
});

// Compound indexes for common queries
freelancerProfileSchema.index({
  categories: 1,
  experienceLevel: 1,
  "availability.status": 1,
});

// Validate hourly rate range
freelancerProfileSchema.pre("validate", function (next) {
  if (this.hourlyRate.max < this.hourlyRate.min) {
    throw new Error("Maximum rate cannot be less than minimum rate");
  }
});

// Auto-calculate profile completeness before save
freelancerProfileSchema.pre("save", function (next) {
  let completeness = 0;
  const weights = {
    basic: 40, // bio, title, skills, categories, experience, hourly rate
    profilePicture: 20,
    languages: 20,
    location: 20,
  };

  // Basic info (always required)
  if (this.bio && this.title && this.skills.length >= 3) {
    completeness += weights.basic;
  }

  if (this.profilePicture) {
    completeness += weights.profilePicture;
  }

  if (this.languages.length > 0) {
    completeness += weights.languages;
  }

  if (this.location.city && this.location.coordinates) {
    completeness += weights.location;
  }

  this.profileCompleteness = completeness;
});

// Generate search keywords before save
freelancerProfileSchema.pre("save", function (next) {
  const keywords = new Set<string>();

  // Add from title and bio
  this.title
    .toLowerCase()
    .split(/\s+/)
    .forEach((word) => keywords.add(word));
  this.bio
    .toLowerCase()
    .split(/\s+/)
    .forEach((word) => keywords.add(word));

  // Add skills
  this.skills.forEach((skill) => keywords.add(skill.toLowerCase()));

  // Add categories
  this.categories.forEach((cat) => keywords.add(cat));

  this.searchKeywords = Array.from(keywords);
});

export const FreelancerProfile = model<IFreelancerProfile>(
  "FreelancerProfile",
  freelancerProfileSchema
);
