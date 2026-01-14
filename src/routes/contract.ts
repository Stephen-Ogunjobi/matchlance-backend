import express from "express";
import { verifyToken } from "../middlewares/middleware.js";
import { createContract } from "../controllers/contract.js";

const router = express.Router();

router.post("/proposal/:conversationId/hire", verifyToken, createContract);

export default router;
