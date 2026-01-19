import express from "express";
import { verifyToken } from "../middlewares/middleware.js";
import { createContract, getContract } from "../controllers/contract.js";

const router = express.Router();

router.post("/proposal/:conversationId/hire", verifyToken, createContract);

router.get("/contract/:conversationId", verifyToken, getContract);

export default router;
