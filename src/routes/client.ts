import express from "express";
import {
  postClientProfile,
  getClientProfile,
  updateClientProfile,
  deleteClientProfile,
} from "../controllers/client.js";
import { verifyToken } from "../middlewares/middleware.js";

const router = express.Router();

router.post("/profile/:clientId", verifyToken, postClientProfile);
router.get("/profile/:clientId", verifyToken, getClientProfile);
router.patch("/profile/:clientId", verifyToken, updateClientProfile);
router.delete("/profile/:clientId", verifyToken, deleteClientProfile);

export default router;
