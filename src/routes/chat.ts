import express from "express";
import { verifyToken } from "../middlewares/middleware.js";
import { rateLimiter } from "../middlewares/rateLimiter.js";
import {
  getChats,
  getConversationByProposal,
  sendMessage,
} from "../controllers/chat.js";

const router = express.Router();

router.get("/proposal/:proposalId", verifyToken, getConversationByProposal);

router.get("/:conversationId/messages", verifyToken, getChats);

router.post(
  "/messages",
  verifyToken,
  rateLimiter("sendMessageHttp"),
  sendMessage
);

export default router;
