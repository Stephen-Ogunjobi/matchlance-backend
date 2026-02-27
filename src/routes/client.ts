import express from "express";
import {
  postClientProfile,
  getClientProfile,
  updateClientProfile,
  deleteClientProfile,
  uploadClientProfilePicture,
} from "../controllers/client.js";
import { verifyToken } from "../middlewares/middleware.js";
import { rateLimiter } from "../middlewares/rateLimiter.js";
import { upload } from "../config/upload.js";

const router = express.Router();

router.post("/profile/:clientId", verifyToken, postClientProfile);
router.get("/profile/:clientId", verifyToken, getClientProfile);
router.patch("/profile/:clientId", verifyToken, updateClientProfile);
router.delete("/profile/:clientId", verifyToken, deleteClientProfile);
router.post(
  "/profile/:clientId/upload-picture",
  verifyToken,
  rateLimiter("uploadPicture"),
  upload.single("profilePicture"),
  uploadClientProfilePicture
);

export default router;
