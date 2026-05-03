import axios from "axios";

const api = axios.create({
  baseURL: "https://ai-interview-ggbn.onrender.com", // 🔥 FORCE FULL URL
  headers: {
    "Content-Type": "application/json",
  },
});

export const sendMessage = async (message, setup, history = [], avgScore = null) => {
  try {
    const response = await api.post("/api/chat", {
      message,
      setup,
      history,
      avgScore,
    });

    return response.data.reply;
  } catch (error) {
    console.error("API ERROR:", error);
    throw new Error("Server error");
  }
};