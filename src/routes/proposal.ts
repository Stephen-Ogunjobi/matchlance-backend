import express from "express";
import { verifyToken } from "../middlewares/middleware.js";
import { rateLimiter } from "../middlewares/rateLimiter.js";
import {
  getProposal,
  getProposals,
  postProposal,
  updateProposal,
} from "../controllers/proposal.js";
import { proposalAttachUpload } from "../config/upload.js";
import { acceptJobProposal, rejectJobProposal } from "../controllers/job.js";

const router = express.Router();

router.post(
  "/job/:jobId",
  verifyToken,
  rateLimiter("submitProposal"),
  proposalAttachUpload.array("attachments", 5),
  postProposal
);

router.get("/my-proposals", verifyToken, getProposals);

router.get("/:proposalId", getProposal);

router.patch(
  "/:proposalId",
  verifyToken,
  proposalAttachUpload.array("attachments", 5),
  updateProposal
);

router.patch("/:proposalId/accept", verifyToken, acceptJobProposal);

router.patch("/:proposalId/reject", verifyToken, rejectJobProposal);

export default router;
