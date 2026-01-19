import express from "express";
import { verifyToken } from "../middlewares/middleware.js";
import { createContract, getContractByConversation, getContract } from "../controllers/contract.js";

const router = express.Router();

router.post("/proposal/:conversationId/hire", verifyToken, createContract);

router.get("/:conversationId", verifyToken, getContractByConversation);

router.get("/id/:contractId", verifyToken, getContract);

export default router;
