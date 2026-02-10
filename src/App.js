import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useLocation } from "react-router-dom";
import ReceptionForm from "./components/ReceptionForm";
import AssistantDashboard from "./pages/AssistantDashboard";
import LobbyTV from "./pages/LobbyTV";
import TrackingPage from "./pages/TrackingPage";
import "./styles/index.css";

const SOCKET_SERVER = process.env.REACT_APP_API_URL || "http://localhost:5000";

function App() {
  const [socket, setSocket] = useState(null);
  const [activeTab, setActiveTab] = useState("registration");
  const [trackingToken, setTrackingToken] = useState(null);

  const location = useLocation();
  const isLobbyRoute = location && location.pathname === "/lobby";

  // Log for debugging
  useEffect(() => {
    console.log(
      "App component mounted, activeTab:",
      activeTab,
      "trackingToken:",
      trackingToken,
    );
  }, [activeTab, trackingToken]);

  // Check if we're in tracking mode from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    console.log("URL params checked, token:", token);
    if (token) {
      setTrackingToken(parseInt(token));
      setActiveTab("tracking");
    }
  }, []);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server");
      newSocket.emit("GET_QUEUE");
    });

    newSocket.on("QUEUE_UPDATE", (data) => {
      // Queue updates are consumed by specific pages (Assistant/Lobby)
      // keeping socket connected; not storing globally to avoid duplication
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // START_CONSULTATION is handled by AssistantDashboard via its socket

  // If tracking token is set, show tracking page
  if (trackingToken !== null) {
    return <TrackingPage token={trackingToken} />;
  }

  // If path is /lobby, return only the Lobby display for TV-mode (deep navy background)
  if (isLobbyRoute) {
    return (
      <div className="min-h-screen bg-[#021028]">
        <LobbyTV />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Tabs - Hidden in Lobby Mode for "Pure Display" or /lobby route */}
      {!isLobbyRoute && activeTab !== "lobby" && (
        <div className="sticky top-0 z-50 bg-white border-b-2 border-medical-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab("registration")}
                className={`py-4 px-6 font-semibold transition-all border-b-4 whitespace-nowrap ${
                  activeTab === "registration"
                    ? "border-medical-600 text-medical-600"
                    : "border-transparent text-gray-600 hover:text-gray-800"
                }`}
              >
                📝 Patient Registration
              </button>
              <button
                onClick={() => setActiveTab("queue")}
                className={`py-4 px-6 font-semibold transition-all border-b-4 whitespace-nowrap ${
                  activeTab === "queue"
                    ? "border-medical-600 text-medical-600"
                    : "border-transparent text-gray-600 hover:text-gray-800"
                }`}
              >
                📋 Current Queue
              </button>
              <button
                onClick={() => setActiveTab("assistant")}
                className={`py-4 px-6 font-semibold transition-all border-b-4 whitespace-nowrap ${
                  activeTab === "assistant"
                    ? "border-medical-600 text-medical-600"
                    : "border-transparent text-gray-600 hover:text-gray-800"
                }`}
              >
                🏥 Assistant Panel
              </button>
              <button
                onClick={() => setActiveTab("lobby")}
                className={`py-4 px-6 font-semibold transition-all border-b-4 whitespace-nowrap ${
                  activeTab === "lobby"
                    ? "border-medical-600 text-medical-600"
                    : "border-transparent text-gray-600 hover:text-gray-800"
                }`}
              >
                📺 Lobby Display
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      {activeTab === "registration" ? (
        <ReceptionForm
          onPatientAdded={() => {
            if (socket) socket.emit("GET_QUEUE");
          }}
        />
      ) : activeTab === "assistant" ? (
        <AssistantDashboard socket={socket} />
      ) : activeTab === "lobby" ? (
        <LobbyTV />
      ) : (
        <ReceptionForm
          onPatientAdded={() => {
            if (socket) socket.emit("GET_QUEUE");
          }}
        />
      )}
    </div>
  );
}

export default App;
