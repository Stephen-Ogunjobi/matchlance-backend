import type { Request, Response } from "express";
import { deleteFile, getFilePathFronUrl } from "../config/upload.js";
import { FreelancerProfile } from "../models/freelancer.js";
import { Job } from "../models/job.js";
import User from "../models/users.js";
import { Proposal } from "../models/proposal.js";
import mongoose from "mongoose";
import {
  getCachedMatchedJobs,
  setMatchedJobsCache,
  invalidateMatchedJobsCache,
} from "../utils/jobCache.js";
import {
  getCachedFreelancerProfile,
  invalidateFreelancerCache,
  updateFreelancerCache,
  setFreelancerCache,
} from "../utils/freelancerCache.js";

export const postFreelancerProfile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const freelancerId = new mongoose.Types.ObjectId(req.params.freelancerId);

    const {
      title,
      bio,
      skills,
      categories,
      experienceLevel,
      hourlyRate,
      availability,
      location,
      languages,
    } = req.body;

    const user = await User.findById(freelancerId);

    if (!user) {
      return res.status(400).json({ error: "Invalid Request" });
    }

    if (user.role !== "freelancer") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const newProfile = await FreelancerProfile.create({
      freelancerId,
      bio,
      title,
      skills,
      categories,
      experienceLevel,
      hourlyRate,
      availability,
      location,
      languages,
    });

    // Cache the newly created profile
    await setFreelancerCache(newProfile.toObject() as any);

    return res.status(201).json({ message: "Profile created" });
  } catch (err) {
    console.error("Error creating profile", err);
    return res.status(500).json({
      error: "Error creating profile",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getFreelancerProfile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const freelancerId = req.params.freelancerId;

    if (!userId || !freelancerId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    if (userId.toString() !== freelancerId.toString()) {
      return res.status(400).json({ error: "Unauthorized" });
    }

    // Try to get from cache first
    const cachedProfile = await getCachedFreelancerProfile(freelancerId);
    if (cachedProfile) {
      return res.status(200).json({ freelancerProfile: cachedProfile });
    }

    const profile = await FreelancerProfile.findOne({ freelancerId });
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Cache the profile for future requests
    await setFreelancerCache(profile.toObject() as any);

    return res.status(200).json({ freelancerProfile: profile });
  } catch (err) {
    console.error("Cannot get profile", err);
    return res.status(500).json({
      error: "Cannot get profile",
    });
  }
};

export const updateFreelancerProfile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const freelancerId = req.params.freelancerId;

    if (!userId || !freelancerId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    if (userId.toString() !== freelancerId.toString()) {
      return res.status(400).json({ error: "Unauthorized" });
    }

    const {
      title,
      bio,
      skills,
      categories,
      experienceLevel,
      hourlyRate,
      availability,
      location,
      languages,
    } = req.body;

    const updates = Object.fromEntries(
      Object.entries({
        title,
        bio,
        skills,
        categories,
        experienceLevel,
        hourlyRate,
        availability,
        location,
        languages,
      }).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const updateProfile = await FreelancerProfile.findOneAndUpdate(
      { freelancerId },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    // Update the cache with the new profile data
    if (updateProfile) {
      await setFreelancerCache(updateProfile.toObject() as any);
    }

    // If skills, categories, or other matching-related fields were updated, invalidate matched jobs cache
    if (updates.skills || updates.categories || updates.experienceLevel) {
      await invalidateMatchedJobsCache(freelancerId);
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      profile: updateProfile,
    });
  } catch (err) {
    console.error("Error uppdating profile", err);
    return res.status(500).json({
      error: "Error updating profile",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export const uploadProfilePicture = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user?.userId;
    const freelancerId = req.params.freelancerId;

    if (!userId || !freelancerId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    if (userId.toString() !== freelancerId.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const profile = await FreelancerProfile.findOne({ freelancerId });

    if (!profile) {
      await deleteFile(req.file.path);
      return res.status(404).json({ error: "Profile not found" });
    }

    if (profile.profilePicture) {
      try {
        const oldFilePath = getFilePathFronUrl(profile.profilePicture);
        await deleteFile(oldFilePath);
      } catch (err) {
        console.log("Failed to delete profile picture:", err);
      }
    }

    const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;

    const updatedProfile = await FreelancerProfile.findOneAndUpdate(
      { freelancerId },
      { profilePicture: profilePictureUrl },
      {
        new: true,
        runValidators: true,
      }
    );

    // Update the cache with the new profile picture
    if (updatedProfile) {
      await setFreelancerCache(updatedProfile.toObject() as any);
    }

    return res.status(200).json({
      message: "Profile picture uploaded successfully",
      profilePicture: profilePictureUrl,
      profile: updatedProfile,
    });
  } catch (err) {
    console.error("Error uploading profile picture:", err);

    // If file was uploaded but DB update failed, clean it up
    if (req.file) {
      try {
        await deleteFile(req.file.path);
      } catch (deleteErr) {
        console.error("Failed to cleanup uploaded file:", deleteErr);
      }
    }

    return res.status(500).json({
      error: "Error uploading profile picture",
    });
  }
};

export const getFreelancerMatchJobs = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const freelancerId = req.params.freelancerId;

    if (!userId || !freelancerId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const user = await User.findById(userId);

    if (user?.role !== "freelancer") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Try to get from cache first
    const cachedJobs = await getCachedMatchedJobs(freelancerId);
    if (cachedJobs) {
      return res.status(200).json({ jobs: cachedJobs });
    }

    const existingProposals = await Proposal.find({ freelancerId })
      .select("jobId")
      .lean();

    const appliedJobIds = existingProposals.map((p) => p.jobId.toString());

    // Try to get from cache first
    let freelancerProfile = await getCachedFreelancerProfile(freelancerId);

    if (!freelancerProfile) {
      const profile = await FreelancerProfile.findOne({ freelancerId });
      if (!profile) {
        return res.status(404).json({ error: "Profile could not be found" });
      }
      const profileData = profile.toObject() as any;
      freelancerProfile = profileData;
      // Cache the profile for future requests
      await setFreelancerCache(profileData);
    }

    // TypeScript guard: ensure freelancerProfile is not null
    if (!freelancerProfile) {
      return res.status(404).json({ error: "Profile could not be found" });
    }

    const freelancerSkills = freelancerProfile.skills;

    const matchJobs = await Job.aggregate([
      {
        $match: {
          status: "open",
          _id: {
            $nin: appliedJobIds.map((id) => new mongoose.Types.ObjectId(id)),
          },

          $or: [
            {
              skills: {
                $in: freelancerSkills.map((s) => new RegExp(`^${s}$`, "i")),
              },
            },
            //match by text search
            { $text: { $search: freelancerSkills.join(" ") } },
          ],
        },
      },
      {
        $addFields: {
          //calc relevance score
          score: {
            $add: [
              //skill match count
              { $size: { $setIntersection: ["$skills", freelancerSkills] } },

              //text search score
              { $ifNull: [{ $meta: "textScore" }, 0] },
            ],
          },
        },
      },
      { $sort: { score: -1 } },
    ]);

    // Cache the results
    await setMatchedJobsCache(freelancerId, matchJobs as any);

    return res.status(200).json({ jobs: matchJobs });
  } catch (err) {
    console.error("Error fetching job", err);
    return res.status(500).json({
      error: "Error fetching job",
    });
  }
};

export const getFreelancerAcceptedJobs = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const freelancerId = req.user?.userId;

    if (!freelancerId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const acceptedProposals = await Proposal.find({
      freelancerId,
      status: "accepted",
    }).populate("jobId");

    const acceptedJobs = acceptedProposals.map((proposal) => {
      const job = proposal.jobId as any;
      return {
        ...job.toObject(),
        proposalId: proposal._id,
      };
    });

    return res.status(200).json({ jobs: acceptedJobs });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Error fetching accepted jobs",
    });
  }
};
