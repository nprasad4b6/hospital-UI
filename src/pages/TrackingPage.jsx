import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const TrackingPage = ({ token }) => {
  const [patientData, setPatientData] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const SOCKET_SERVER =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    // Connect to Socket.io
    const newSocket = io(SOCKET_SERVER);

    newSocket.on("connect", () => {
      console.log("Connected to server");
      newSocket.emit("GET_QUEUE");
    });

    newSocket.on("QUEUE_UPDATE", (data) => {
      setQueue(data);
      // Find current patient in queue
      const current = data.find((p) => p.status === "IN_PROGRESS");
      setCurrentPatient(current);
    });

    return () => {
      newSocket.close();
    };
  }, [SOCKET_SERVER]);

  useEffect(() => {
    // Fetch patient data
    const fetchPatient = async () => {
      try {
        setLoading(true);
        const API_BASE =
          process.env.REACT_APP_API_URL || "http://localhost:5000";
        const response = await axios.get(`${API_BASE}/api/queue`);
        const patients = response.data;
        const patient = patients.find((p) => p.tokenNumber === parseInt(token));

        if (patient) {
          setPatientData(patient);
        } else {
          setError("Patient token not found");
        }
      } catch (err) {
        console.error("Error fetching patient data:", err);
        setError("Unable to fetch patient information");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchPatient();
    }
  }, [token]);

  const getStatusColor = (status) => {
    switch (status) {
      case "WAITING":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "DONE":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPositionMessage = () => {
    if (!patientData) return "";
    if (patientData.status === "DONE") return "✓ Your consultation is complete";
    if (patientData.status === "IN_PROGRESS")
      return "🔴 You are being served now";
    if (patientData.position === 0) return "⏳ You are next in line";
    if (patientData.position === 1) return "⏳ 1 patient ahead of you";
    return `⏳ ${patientData.position} patients ahead of you`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medical-50 via-white to-medical-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-medical-300 border-t-medical-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">
            Loading your queue information...
          </p>
        </div>
      </div>
    );
  }

  if (error || !patientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medical-50 via-white to-medical-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4v2m0 4v2"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Token Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {error || `No patient found with token ${token}`}
          </p>
          <a
            href="/"
            className="inline-block bg-medical-600 hover:bg-medical-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Back to Registration
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-50 via-white to-medical-100 p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <a
          href="/"
          className="text-medical-600 hover:text-medical-700 font-semibold inline-flex items-center gap-2 mb-6"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </a>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Queue Tracker
          </h1>
          <p className="text-gray-600">Real-time status of your consultation</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Patient Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {patientData.name}
              </h2>
              <p className="text-gray-600 mt-1">
                Token #: {patientData.tokenNumber}
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(patientData.status)}`}
            >
              {patientData.status}
            </div>
          </div>

          {/* Status Message */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center mb-6">
            <p className="text-lg font-semibold text-blue-900">
              {getPositionMessage()}
            </p>
            {patientData.status === "WAITING" &&
              patientData.estimatedWaitTime !== undefined && (
                <p className="text-sm text-blue-700 mt-2">
                  Estimated wait time: ~{patientData.estimatedWaitTime} minutes
                </p>
              )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase mb-1">
                Phone
              </p>
              <p className="text-sm font-medium text-gray-800">
                +91 {patientData.phone}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase mb-1">
                Type
              </p>
              <p className="text-sm font-medium text-gray-800">
                {patientData.type}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase mb-1">
                Position in Queue
              </p>
              <p className="text-sm font-medium text-gray-800">
                {patientData.position + 1}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase mb-1">
                Department
              </p>
              <p className="text-sm font-medium text-gray-800">
                {patientData.department || "General"}
              </p>
            </div>
          </div>
        </div>

        {/* Currently Serving */}
        {currentPatient && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl shadow-lg p-6 border-2 border-yellow-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              🔴 Currently Being Served
            </h3>
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">
                    Token Number
                  </p>
                  <p className="text-2xl font-bold text-medical-600">
                    {currentPatient.tokenNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 font-semibold">
                    Patient Name
                  </p>
                  <p className="text-lg font-bold text-gray-800">
                    {currentPatient.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Queue Preview */}
        {queue.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              📋 Queue Preview (Next 5)
            </h3>
            <div className="space-y-3">
              {queue.slice(0, 5).map((patient, index) => (
                <div
                  key={patient._id}
                  className={`p-4 rounded-lg border-2 ${
                    patient.tokenNumber === patientData.tokenNumber
                      ? "bg-medical-50 border-medical-300"
                      : patient.status === "IN_PROGRESS"
                        ? "bg-yellow-50 border-yellow-300"
                        : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg text-gray-800">
                        #{patient.tokenNumber}
                      </p>
                      <p className="text-sm text-gray-600">{patient.name}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(patient.status)}`}
                      >
                        {patient.status}
                      </span>
                      {patient.tokenNumber === patientData.tokenNumber && (
                        <p className="text-xs font-semibold text-medical-600 mt-1">
                          ← You
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="text-center text-gray-600 text-sm mb-8">
          <p>Status updates in real-time</p>
          <p>Refresh your browser for the latest information</p>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
