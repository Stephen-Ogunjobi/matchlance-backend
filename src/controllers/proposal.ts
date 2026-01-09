import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Job } from "../models/job.js";
import { Proposal } from "../models/proposal.js";
import User from "../models/users.js";
import { sendProposalNotificationEmail } from "../utils/emailServices.js";
import { invalidateMatchedJobsCache } from "../utils/jobCache.js";

export const postProposal = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { jobId } = req.params;
    const freelancerId = req.user?.userId;

    const {
      coverLetter,
      proposedBudget,
      estimatedTime,
      availability,
      portfolioLinks,
      questions,
    } = req.body;

    if (!jobId || !freelancerId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: "Invalid job ID" });
    }
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job could not be found" });
    }
    if (job.status !== "open") {
      return res
        .status(400)
        .json({ error: "This job is no longer accepting proposals" });
    }

    const existingProposal = await Proposal.findOne({ jobId, freelancerId });
    if (existingProposal) {
      return res
        .status(409)
        .json({ error: "You already submitted a proposal for this job" });
    }

    const attachments = req.files
      ? (req.files as Express.Multer.File[]).map(
          (file) => `/uploads/proposal-attachments/${file.filename}`
        )
      : [];

    const proposal = await Proposal.create({
      jobId,
      freelancerId,
      coverLetter,
      proposedBudget,
      estimatedTime,
      availability,
      portfolioLinks,
      questions,
      attachments,
      status: "pending",
    });

    await Job.findByIdAndUpdate(
      jobId,
      { $push: { proposals: proposal._id } },
      { new: true }
    );

    // Invalidate matched jobs cache for this freelancer
    await invalidateMatchedJobsCache(freelancerId);

    const client = await User.findOne({ _id: job.clientId });
    const freelancer = await User.findOne({ _id: freelancerId });

    if (!client || !freelancer) {
      return res
        .status(400)
        .json({ error: "Could not get jobdetails/ freelancer profile" });
    }

    const clientName = client.firstName;
    const freelancerName = freelancer.firstName;
    const email = client.email;
    const jobTitle = job.title;

    // Send email notification (non-blocking)
    try {
      await sendProposalNotificationEmail(
        email,
        clientName,
        jobTitle,
        freelancerName,
        proposal
      );
    } catch (emailError) {
      console.error("Failed to send proposal notification email:", emailError);
    }

    return res.status(201).json({ proposal });
  } catch (error: any) {
    console.log(error);
    if (error.code === 11000) {
      return res.status(409).json({
        error: "You have already submitted a proposal for this job",
      });
    }
    return res.status(500).json({
      error: "Error sending proposal",
    });
  }
};

export const getProposals = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(400).json({ error: "Request Invalid" });
    }

    const proposals = await Proposal.find({ freelancerId: userId })
      .populate("jobId")
      .sort({ createdAt: -1 });
    if (!proposals) {
      return res.status(404).json({ error: "Proposal could not be found" });
    }

    return res.status(200).json({ proposals });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Request failed" });
  }
};

export const getProposal = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const proposalId = req.params.proposalId;

    if (!proposalId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ error: "Proposal could not be found" });
    }

    return res.status(200).json({ proposal });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Request failed" });
  }
};

export const updateProposal = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const freelancerId = req.user?.userId;
    const proposalId = req.params.proposalId;

    if (!freelancerId || !proposalId) {
      return res.status(400).json({ error: "Invalid Request" });
    }

    const proposal = await Proposal.findById(proposalId);

    if (freelancerId.toString() !== proposal?.freelancerId.toString()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      coverLetter,
      proposedBudget,
      estimatedTime,
      availability,
      portfolioLinks,
      questions,
    } = req.body;

    // Handle new file uploads
    const newAttachments = req.files
      ? (req.files as Express.Multer.File[]).map(
          (file) => `/uploads/proposal-attachments/${file.filename}`
        )
      : undefined;

    const updates = Object.fromEntries(
      Object.entries({
        coverLetter,
        proposedBudget,
        estimatedTime,
        availability,
        portfolioLinks,
        questions,
        ...(newAttachments && { attachments: newAttachments }),
      }).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const updatedProposal = await Proposal.findOneAndUpdate(
      { _id: proposalId },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );
    return res.status(200).json({
      message: "Poposal updated successfully",
      proposal: updatedProposal,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Error updating proposal" });
  }
};
