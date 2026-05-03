// client/src/App.jsx
// Root component — defines all routes for the AI Interview Chatbot.
// Routes: / → Home | /setup → Setup | /chat → Chat | /report → Report

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home   from "./pages/Home";
import Setup  from "./pages/Setup";
import Chat   from "./pages/Chat";
import Report from "./pages/Report";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home page — landing screen */}
        <Route path="/"       element={<Home />}   />

        {/* Setup page — configure interview */}
        <Route path="/setup"  element={<Setup />}  />

        {/* Chat page — live interview session */}
        <Route path="/chat"   element={<Chat />}   />

        {/* Report page — post-interview scorecard */}
        <Route path="/report" element={<Report />} />

        {/* Catch-all — redirect unknown routes to home */}
        <Route path="*"       element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}