// client/src/services/api.js

import axios from "axios";

const BASE_URL = "http://localhost:5000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

export const sendMessage = async (message, setup, history = [], avgScore = null) => {
  try {
    const response = await api.post("/api/chat", { message, setup, history, avgScore });
    // Normalize — always return { reply: string }
    const reply = response?.data?.reply;
    if (!reply) throw new Error("Empty response from AI. Please try again.");
    return { reply };
  } catch (error) {
    // Axios error with response from server
    if (error.response) {
      const serverMsg = error.response.data?.error || `Server error ${error.response.status}`;
      throw new Error(serverMsg);
    }
    // Network error
    if (error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
      throw new Error("Cannot connect to server. Make sure backend is running on port 5000.");
    }
    // Re-throw our own errors
    throw new Error(error.message || "Something went wrong.");
  }
};