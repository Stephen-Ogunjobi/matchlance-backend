import express from "express";
import {
  getFreelancerAcceptedJobs,
  getFreelancerMatchJobs,
  getFreelancerProfile,
  postFreelancerProfile,
  updateFreelancerProfile,
  uploadProfilePicture,
} from "../controllers/freelancer.js";
import { verifyToken } from "../middlewares/middleware.js";
import { upload } from "../config/upload.js";

const router = express.Router();

router.post("/profile/:freelancerId", postFreelancerProfile);

router.get("/profile/:freelancerId", verifyToken, getFreelancerProfile);

router.patch("/profile/:freelancerId", verifyToken, updateFreelancerProfile);

router.post(
  "/profile/:freelancerId/upload-picture",
  verifyToken,
  upload.single("profilePicture"), //handle file upload
  uploadProfilePicture
);

router.get("/matched-jobs/:freelancerId", verifyToken, getFreelancerMatchJobs);

router.get("/my-jobs", verifyToken, getFreelancerAcceptedJobs);

export default router;
