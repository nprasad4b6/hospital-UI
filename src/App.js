import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Navigate, Route, Routes } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import ReceptionForm from "./components/ReceptionForm";
import Login from "./components/Login";
import AssistantDashboard from "./pages/AssistantDashboard";
import LobbyTV from "./pages/LobbyTV";
import TrackingPage from "./pages/TrackingPage";
import { auth } from "./firebase";
import "./styles/index.css";

const SOCKET_SERVER = process.env.REACT_APP_API_URL || "http://localhost:5000";

const ProtectedRoute = ({ isAuthReady, isAuthenticated, children }) => {
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
        Checking authentication...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const [socket, setSocket] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [trackingToken, setTrackingToken] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Check if we're in tracking mode from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    console.log("URL params checked, token:", token);
    if (token) {
      setTrackingToken(parseInt(token));
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

  // If tracking token is set, show tracking page
  if (trackingToken !== null) {
    return <TrackingPage token={trackingToken} />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/assistant" replace /> : <Login />
        }
      />

      <Route
        path="/lobby"
        element={
          <div className="min-h-screen bg-[#021028]">
            <LobbyTV />
          </div>
        }
      />

      <Route
        path="/assistant"
        element={
          <ProtectedRoute
            isAuthReady={isAuthReady}
            isAuthenticated={isAuthenticated}
          >
            <AssistantDashboard socket={socket} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patient-registration"
        element={
          <ProtectedRoute
            isAuthReady={isAuthReady}
            isAuthenticated={isAuthenticated}
          >
            <ReceptionForm
              onPatientAdded={() => {
                if (socket) socket.emit("GET_QUEUE");
              }}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reg"
        element={
          <ProtectedRoute
            isAuthReady={isAuthReady}
            isAuthenticated={isAuthenticated}
          >
            <ReceptionForm
              onPatientAdded={() => {
                if (socket) socket.emit("GET_QUEUE");
              }}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <Navigate to={isAuthenticated ? "/assistant" : "/login"} replace />
        }
      />

      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? "/assistant" : "/login"} replace />
        }
      />
    </Routes>
  );
}

export default App;
