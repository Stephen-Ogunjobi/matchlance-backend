import express from "express";
import { postClientProfile } from "../controllers/client.js";
import { verifyToken } from "../middlewares/middleware.js";

const router = express.Router();

router.post("/profile/:clientId", verifyToken, postClientProfile);

export default router;
