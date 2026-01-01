import express from "express";
import {
  deleteJob,
  getJob,
  getJobs,
  postNewJob,
  updateJob,
} from "../controllers/job.js";
import { verifyToken } from "../middlewares/middleware.js";

const router = express.Router();

router.post("/post-job", verifyToken, postNewJob);

router.get("/jobs", verifyToken, getJobs);

router.get("/:jobId", getJob);

router.patch("/:jobId", verifyToken, updateJob);

router.delete("/:jobId", verifyToken, deleteJob);

export default router;
