import type { Request, Response } from "express";
import { getCachedConversation } from "../utils/conversationCache.js";
import { getCachedJob, invalidateJobCache } from "../utils/jobCache.js";
import { Proposal } from "../models/proposal.js";
import { Contract } from "../models/contract.js";
import { Job } from "../models/job.js";
import {
  setContractCache,
  invalidateClientContractsCache,
  invalidateFreelancerContractsCache,
  invalidateJobContractCache,
} from "../utils/contractCache.js";

export const createContract = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const conversationId = req.params.conversationId;

    if (!userId || !conversationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conversation = await getCachedConversation(conversationId);
    if (!conversation)
      return res.status(404).json({ error: "Conversation not found" });

    const jobId =
      typeof conversation.jobId === "object" && conversation.jobId?._id
        ? conversation.jobId._id.toString()
        : conversation.jobId?.toString();

    if (!jobId) return res.status(404).json({ error: "Job not found" });

    const job = await getCachedJob(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.clientId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Get the proposalId from conversation
    const proposalId =
      typeof conversation.proposalId === "object" &&
      conversation.proposalId?._id
        ? conversation.proposalId._id.toString()
        : conversation.proposalId?.toString();

    if (!proposalId)
      return res.status(404).json({ error: "Proposal not found" });

    // Fetch the proposal
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });

    // Verify proposal is accepted
    if (proposal.status !== "accepted") {
      return res
        .status(400)
        .json({ error: "Only accepted proposals can create contracts" });
    }

    // Check if contract already exists for this job
    const existingContract = await Contract.findOne({
      jobId: jobId,
      status: { $in: ["active", "in_progress", "under_review"] },
    });

    if (existingContract) {
      return res
        .status(400)
        .json({ error: "Active contract already exists for this job" });
    }

    // Get freelancerId from proposal
    const freelancerId = proposal.freelancerId;

    // Calculate contract budget amount
    let budgetAmount: number;
    if (job.budget.type === "fixed") {
      budgetAmount = job.budget.amount || 0;
    } else {
      // For hourly jobs, use average of proposal's min and max
      budgetAmount = (proposal.proposedBudget.min + proposal.proposedBudget.max) / 2;
    }

    // Create the contract
    const contract = await Contract.create({
      jobId: jobId,
      clientId: job.clientId,
      freelancerId: freelancerId,
      proposalId: proposalId,
      conversationId: conversationId,
      projectDetails: {
        title: job.title,
        description: job.description,
        category: job.category,
        skills: job.skills,
      },
      budget: {
        type: job.budget.type,
        amount: budgetAmount,
        currency: job.budget.currency,
      },
      duration: {
        startDate: new Date(),
        estimatedDuration: job.duration.estimatedHours || 0,
      },
      status: "active",
      deliverables: [],
      reviews: {},
    });

    // Update job status to in_progress
    await Job.findByIdAndUpdate(jobId, { status: "in_progress" });

    // Invalidate job cache after update
    await invalidateJobCache(jobId);

    // Cache the created contract
    await setContractCache(contract.toObject());

    // Invalidate related contract caches
    await invalidateClientContractsCache(job.clientId.toString());
    await invalidateFreelancerContractsCache(freelancerId.toString());
    await invalidateJobContractCache(jobId);

    return res.status(201).json({
      message: "Contract created successfully",
      contract,
    });
  } catch (error) {
    console.error("Error creating contract:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
