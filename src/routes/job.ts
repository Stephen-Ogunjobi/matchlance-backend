import express from "express";
import {
  deleteJob,
  getJob,
  getJobs,
  postNewJob,
  updateJob,
} from "../controllers/job.js";
import { verifyToken } from "../middlewares/middleware.js";
import { rateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/post-job", verifyToken, rateLimiter("postJob"), postNewJob);

router.get("/jobs", verifyToken, rateLimiter("getJobs"), getJobs);

router.get("/:jobId", getJob);

router.patch("/:jobId", verifyToken, updateJob);

router.delete("/:jobId", verifyToken, deleteJob);

export default router;
