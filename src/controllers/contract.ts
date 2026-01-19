import type { Request, Response } from "express";
import { getCachedConversation } from "../utils/conversationCache.js";
import { getCachedJob, invalidateJobCache } from "../utils/jobCache.js";
import { getCachedUser } from "../utils/userCache.js";
import { Proposal } from "../models/proposal.js";
import { Contract, type IContract } from "../models/contract.js";
import { Job } from "../models/job.js";
import {
  setContractCache,
  invalidateClientContractsCache,
  invalidateFreelancerContractsCache,
  invalidateJobContractCache,
} from "../utils/contractCache.js";
import { sendFreelancerHiredEmail } from "../utils/emailServices.js";
import mongoose from "mongoose";

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

    const freelancerId = proposal.freelancerId;

    let budgetAmount: number;
    if (job.budget.type === "fixed") {
      budgetAmount = job.budget.amount || 0;
    } else {
      budgetAmount =
        (proposal.proposedBudget.min + proposal.proposedBudget.max) / 2;
    }

    //start session for transaction to track the transactions
    const session = await mongoose.startSession();

    //start transaction
    session.startTransaction();

    let contract: IContract[] | undefined;

    try {
      //create contract with session
      contract = await Contract.create(
        [
          {
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
          },
        ],
        { session } //every db operation must include session to be part of the transaction
      );

      //reject other pending proposals with session
      await Proposal.updateMany(
        {
          jobId: jobId,
          _id: { $ne: proposalId },
          status: "pending",
        },
        {
          $set: { status: "rejected" },
        },
        { session }
      );

      await Job.findByIdAndUpdate(
        jobId,
        { status: "in_progress" },
        { session }
      );

      //commit the transaction to make changes permanent
      await session.commitTransaction();
    } catch (transactionError) {
      // If anything fails, rollback all changes
      await session.abortTransaction();
      throw transactionError;
    } finally {
      // Always end the session
      session.endSession();
    }

    // Ensure contract was created successfully
    if (!contract || contract.length === 0) {
      throw new Error("Contract creation failed");
    }

    const createdContract = contract[0]!;

    await invalidateJobCache(jobId);

    await setContractCache(createdContract.toObject());

    await invalidateClientContractsCache(job.clientId.toString());
    await invalidateFreelancerContractsCache(freelancerId.toString());
    await invalidateJobContractCache(jobId);

    try {
      const freelancer = await getCachedUser(freelancerId.toString());
      const client = await getCachedUser(job.clientId.toString());

      if (freelancer && client) {
        await sendFreelancerHiredEmail(
          freelancer.email,
          freelancer.firstName,
          client.firstName,
          job.title,
          createdContract.toObject()
        );
      }
    } catch (emailError) {
      console.error("Failed to send freelancer hired email:", emailError);
    }

    return res.status(201).json({
      message: "Contract created successfully",
      contract: createdContract,
    });
  } catch (error) {
    console.error("Error creating contract:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


export const getContractByConversation = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const conversationId = req.params.conversationId;

    if (!userId || !conversationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const contract = await Contract.findOne({ conversationId }).lean();

    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    // Verify user is part of the contract
    if (
      contract.clientId.toString() !== userId.toString() 
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    return res.status(200).json({ contract });
  } catch (error) {
    console.error("Error fetching contract:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getContract = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const contractId = req.params.contractId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!contractId) {
      return res.status(400).json({ error: "Contract ID is required" });
    }

    const contract = await Contract.findById(contractId).lean();

    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    // Verify user is part of the contract (client or freelancer)
    if (
      contract.clientId.toString() !== userId.toString() ||
      contract.freelancerId.toString() !== userId.toString()
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    return res.status(200).json({ contract });
  } catch (error) {
    console.error("Error fetching contract:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};