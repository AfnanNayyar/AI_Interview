import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import ChatBox from "../components/ChatBox";

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const setup = location.state?.setup;

  useEffect(() => {
    if (!setup) {
      navigate("/setup", { replace: true });
    }
  }, [setup, navigate]);

  if (!setup) return null;

  return <ChatBox setup={setup} />;
}