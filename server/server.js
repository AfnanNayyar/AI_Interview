// server/server.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRoutes from "./routes/chatRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// ── Health check ────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "✅ AI Interview Backend is running!" });
});

// ── Routes ──────────────────────────────────────────────────
app.use("/api", chatRoutes);

// ── Error handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Server running on ${PORT}`));