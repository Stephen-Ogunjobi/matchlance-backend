import type { Request, Response } from "express";
import { Job } from "../models/job.js";
import User from "../models/users.js";
import { Proposal } from "../models/proposal.js";
import { sendProposalAcceptanceEmail } from "../utils/emailServices.js";
import mongoose from "mongoose";
import {
  getCachedJob,
  getCachedJobsByClient,
  invalidateJobCache,
  invalidateClientJobsCache,
} from "../utils/jobCache.js";
import { error } from "console";

export const postNewJob = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const {
      title,
      description,
      category,
      skills,
      budget,
      experienceLevel,
      duration,
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ error: "Invalid request" });
    }
    if (user.role !== "client") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await Job.create({
      clientId: userId,
      title,
      description,
      category,
      skills,
      budget,
      experienceLevel,
      duration,
      status: "open",
    });

    // Invalidate client's job list cache
    await invalidateClientJobsCache(userId);
    // Note: Matched jobs cache will refresh via TTL when freelancers query

    return res.status(201).json({ message: "New job created" });
  } catch (err) {
    console.error("Error creating job:", err);
    return res.status(500).json({
      error: "Error creating Job post",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getJobs = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userJobs = await getCachedJobsByClient(userId);
    if (!userJobs || userJobs.length === 0) {
      return res.status(404).json({ error: "No job found" });
    }

    return res.status(200).json({ userJobs });
  } catch (err) {
    console.error("Error fetching jobs:", err);
    return res.status(500).json({
      error: "Error fetching Job",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getJob = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const jobId = req.params.jobId;
    if (!jobId) {
      return res.status(401).json({ error: "Invalid Request" });
    }

    const job = await getCachedJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    return res.status(200).json({ job });
  } catch (err) {
    console.error("Error fetching job:", err);
    return res.status(500).json({
      error: "Error fetching Job",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export const updateJob = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const jobId = req.params.jobId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      title,
      description,
      category,
      skills,
      budget,
      experienceLevel,
      duration,
    } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.clientId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updates = Object.fromEntries(
      Object.entries({
        title,
        description,
        category,
        skills,
        budget,
        experienceLevel,
        duration,
      }).filter(([_, value]) => value !== undefined) //using array distructuring extracting just the value ignoring key with "_"
    );

    // Check if at least one field is being updated
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const updatedJob = await Job.findByIdAndUpdate(jobId, updates, {
      new: true,
      runValidators: true,
    });

    // Invalidate both caches
    await invalidateJobCache(jobId);
    await invalidateClientJobsCache(userId);
    // Note: Matched jobs cache will refresh via TTL when freelancers query

    return res
      .status(200)
      .json({ message: "Job updated successfully", job: updatedJob });
  } catch (err) {
    console.error("Error uppdating job", err);
    return res.status(500).json({
      error: "Error updating Job",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export const deleteJob = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const jobId = req.params.jobId;

    if (!jobId || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.clientId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Job.findByIdAndDelete(jobId);

    // Invalidate both caches
    await invalidateJobCache(jobId);
    await invalidateClientJobsCache(userId);
    // Note: Matched jobs cache will refresh via TTL when freelancers query

    return res.status(200).json({ message: "Job deleted successfully" });
  } catch (err) {
    console.error("Error deleting job:", err);
    return res.status(500).json({
      error: "Error deleting Job",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export const acceptJobProposal = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const proposalId = req.params.proposalId;

    if (!userId || !proposalId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Optimized: Single query with nested populate to fetch proposal, job, freelancer, and client
    const proposal = await Proposal.findById(proposalId)
      .populate("freelancerId", "firstName email")
      .populate({
        path: "jobId",
        populate: {
          path: "clientId",
          select: "firstName",
        },
      });

    if (!proposal) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    if (!proposal.jobId) {
      return res.status(404).json({ error: "Job not found" });
    }
    if (!proposal.freelancerId) {
      return res.status(404).json({ error: "Freelancer not found" });
    }

    const job = proposal.jobId as any;
    const freelancer = proposal.freelancerId as any;
    const client = job.clientId as any;

    const freelancerId =
      typeof proposal.freelancerId === "object"
        ? (proposal.freelancerId as any)._id
        : proposal.freelancerId;

    // Authorization check
    if (client._id.toString() !== userId.toString()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate status
    if (proposal.status !== "pending") {
      return res.status(400).json({ error: "Proposal is not pending" });
    }
    if (job.status !== "open") {
      return res
        .status(400)
        .json({ error: "Job is no longer accepting proposals" });
    }

    // Update proposal status
    proposal.status = "accepted";
    await proposal.save();

    //create conversation
    const { Conversation } = await import("../models/chat.js");

    let conversation;
    try {
      // First check if conversation already exists
      conversation = await Conversation.findOne({
        proposalId: proposal._id,
      });

      if (!conversation) {
        // Try to create - unique index on proposalId prevents duplicates
        conversation = await Conversation.create({
          participants: [
            new mongoose.Types.ObjectId(userId),
            new mongoose.Types.ObjectId(freelancerId),
          ],
          jobId: job._id,
          proposalId: proposal._id,
          unreadCount: {
            [userId.toString()]: 0,
            [freelancerId.toString()]: 0,
          },
        });
        console.log("chat room created");
      }
    } catch (error) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000) {
        // Race condition: another request created the conversation
        // Fetch the existing one (idempotent response)
        conversation = await Conversation.findOne({
          proposalId: proposal._id,
        });
      } else {
        return res.status(400).json({ error: "chat room could not be created" });
      }
    }

    // Send acceptance email (non-blocking)
    try {
      await sendProposalAcceptanceEmail(
        freelancer.email,
        freelancer.firstName,
        job.title,
        client.firstName,
        proposal
      );
    } catch (emailError) {
      console.error("Failed to send acceptance email:", emailError);
    }

    return res.status(200).json({
      message: "Proposal accepted successfully",
      proposal,
      conversation,
    });
  } catch (error) {
    
    console.error("Error accepting proposal:", error);
    return res.status(500).json({
      error: "Failed to accept proposal",
    });
  }
};

export const rejectJobProposal = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const proposalId = req.params.proposalId;

    if (!userId || !proposalId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Optimized: Single query with nested populate to fetch proposal, job, and client
    const proposal = await Proposal.findById(proposalId).populate({
      path: "jobId",
      populate: {
        path: "clientId",
        select: "firstName",
      },
    });

    if (!proposal) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    if (!proposal.jobId) {
      return res.status(404).json({ error: "Job not found" });
    }

    const job = proposal.jobId as any;
    const client = job.clientId as any;

    // Authorization check
    if (client._id.toString() !== userId.toString()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate status
    if (proposal.status !== "pending") {
      return res.status(400).json({ error: "Proposal is not pending" });
    }
    if (job.status !== "open") {
      return res
        .status(400)
        .json({ error: "Job is no longer accepting proposals" });
    }

    // Update proposal status
    proposal.status = "rejected";
    await proposal.save();

    return res.status(200).json({
      message: "Proposal rejected successfully",
      proposal,
    });
  } catch (error) {
    console.error("Error rejecting proposal:", error);
    return res.status(500).json({
      error: "Failed to reject proposal",
    });
  }
};
