// server/routes/chatRoutes.js

import express from "express";
import { handleChat } from "../controllers/chatController.js";

const router = express.Router();

// POST /api/chat
router.post("/chat", handleChat);

export default router;