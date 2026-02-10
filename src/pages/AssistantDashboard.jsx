import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useQueueVoice } from "../hooks/useQueueVoice";
import { toTitleCase, maskPhone } from "../utils/formatters";

const SOCKET_SERVER = process.env.REACT_APP_API_URL || "http://localhost:5000";

const AssistantDashboard = () => {
  const [currentPatient, setCurrentPatient] = useState(null);
  const [upcomingPatients, setUpcomingPatients] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isBreak, setIsBreak] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const { announcePatientCall, isSupported: isVoiceSupported } =
    useQueueVoice();

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  useEffect(() => {
    const updateQueueDisplay = (queue) => {
      if (queue && queue.length > 0) {
        // Find patient with IN_PROGRESS status
        const inProgress = queue.find((p) => p.status === "IN_PROGRESS");

        // If we have a new current patient, announce them
        if (inProgress && voiceEnabled && isVoiceSupported) {
          if (!currentPatient || currentPatient._id !== inProgress._id) {
            setTimeout(() => {
              announcePatientCall(inProgress.tokenNumber, inProgress.name);
            }, 300);
          }
        }

        setCurrentPatient(inProgress || null);

        // Get next 5 waiting patients
        const waiting = queue.filter((p) => p.status === "WAITING").slice(0, 5);
        setUpcomingPatients(waiting);
      } else {
        setCurrentPatient(null);
        setUpcomingPatients([]);
      }
    };

    const newSocket = io(SOCKET_SERVER);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server - Assistant");
      newSocket.emit("GET_QUEUE");
    });

    newSocket.on("QUEUE_UPDATE", (data) => {
      updateQueueDisplay(data);
    });

    newSocket.on("CONSULTATION_STARTED", () => {
      showNotification("Consultation started!");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    return () => {
      newSocket.close();
    };
  }, [currentPatient, voiceEnabled, announcePatientCall, isVoiceSupported]);

  const handleCallNext = () => {
    if (socket && !isLoading) {
      setIsLoading(true);
      socket.emit("START_CONSULTATION");
      showNotification("Calling next patient...");
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const handleBreakToggle = () => {
    setIsBreak(!isBreak);
    if (socket) {
      socket.emit("DOCTOR_BREAK_STATUS", { isOnBreak: !isBreak });
    }
    showNotification(`Doctor ${!isBreak ? "on break" : "back"}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-50 to-blue-50 p-4 pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b-2 border-medical-200 shadow-md p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-medical-700">
              🏥 Assistant Panel
            </h1>
            <p className="text-xs text-gray-600">
              Clinical Assistant Dashboard
            </p>
          </div>

          {/* Voice Toggle in Header */}
          {isVoiceSupported && (
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`rounded-full p-2 transition-all ${
                voiceEnabled
                  ? "bg-green-100 text-green-600 hover:bg-green-200"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}
              title={voiceEnabled ? "Voice Enabled" : "Voice Disabled"}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                {voiceEnabled ? (
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z M17.3 11c0 2.29-1.72 4.21-4 4.47v2.53h2v2H9v-2h2v-2.53c-2.28-.26-4-2.18-4-4.47H5c0 3.53 2.61 6.43 6 6.92v2.08h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
                ) : (
                  <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.40989519,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L21.714504,3.42671123 L3.03521743,6.3286752 L3.50612381,12.4744748 Z" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-24 left-4 right-4 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse max-w-md mx-auto">
          {notification}
        </div>
      )}

      {/* Main Content - Top Padding for Fixed Header */}
      <div className="max-w-7xl mx-auto mt-24 px-4">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - 40% */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            {/* Doctor Break Status */}
            <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-medical-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Doctor Status
                  </p>
                  <p
                    className={`text-xs font-bold ${isBreak ? "text-orange-600" : "text-green-600"}`}
                  >
                    {isBreak ? "🔴 ON BREAK" : "🟢 ACTIVE"}
                  </p>
                </div>

                {/* Break Toggle Switch */}
                <button
                  onClick={handleBreakToggle}
                  className={`relative inline-flex h-10 w-16 items-center rounded-full transition-all ${isBreak ? "bg-orange-500" : "bg-green-500"} shadow-md`}
                >
                  <span
                    className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${isBreak ? "translate-x-7" : "translate-x-1"}`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Toggle to pause wait-time countdowns
              </p>
            </div>

            {/* Active Patient Card */}
            {currentPatient ? (
              <div className="bg-gradient-to-br from-medical-600 to-medical-700 rounded-3xl shadow-2xl p-6 text-white">
                <p className="text-sm font-semibold opacity-90">
                  NOW BEING SERVED
                </p>

                <div className="my-4">
                  <p className="text-6xl font-black text-center mb-2">
                    {currentPatient.tokenNumber}
                  </p>
                  <p className="text-center text-medical-100 font-semibold">
                    Token Number
                  </p>
                </div>

                <div className="bg-white bg-opacity-10 rounded-xl p-4 mb-4 space-y-2">
                  <div>
                    <p className="text-xs opacity-75">PATIENT NAME</p>
                    <p className="text-lg font-bold">
                      {toTitleCase(currentPatient.name)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs opacity-75">PHONE</p>
                      <p className="text-sm font-semibold">
                        {maskPhone(currentPatient.phone)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs opacity-75">TYPE</p>
                      <p
                        className={`text-sm font-bold ${currentPatient.type === "BOOKED" ? "text-yellow-300" : "text-blue-300"}`}
                      >
                        {currentPatient.type}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCallNext}
                  disabled={isLoading || isBreak}
                  className={`w-full py-5 px-6 rounded-2xl font-bold text-lg transition-all transform ${isBreak ? "bg-gray-400 text-gray-600 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 text-white active:scale-95 shadow-lg"} flex items-center justify-center gap-3`}
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="w-6 h-6 animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v4m6.364 1.636l-2.828-2.828m2.828 9.172l2.828 2.828M12 20v-4m-6.364-1.636l2.828 2.828m-2.828-9.172l-2.828-2.828"
                        />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 00.948-.684l1.498-4.493a1 1 0 011.502-.684l1.498 4.493a1 1 0 00.948.684H19a2 2 0 012 2v2M3 5v12a2 2 0 002 2h14a2 2 0 002-2V5m-5 8h.01M9 9h.01"
                        />
                      </svg>
                      CALL NEXT
                    </>
                  )}
                </button>

                {isBreak && (
                  <p className="text-center text-yellow-200 text-xs font-semibold mt-3">
                    ⏸ Doctor is on break - Resume to call next patient
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-lg p-8 text-center border-2 border-dashed border-medical-200">
                <p className="text-4xl mb-2">👥</p>
                <p className="text-lg font-bold text-gray-800">
                  No Current Patient
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  Queue is empty or all patients are done
                </p>
              </div>
            )}
          </div>

          {/* Right Column - 60% Upcoming Patients */}
          <div className="col-span-12 lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-lg p-4 h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    📋 Upcoming Patients
                  </h2>
                  <p className="text-xs text-gray-600">
                    Next in queue • {upcomingPatients.length}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {upcomingPatients.length === 0 ? (
                  <div className="p-6 text-center text-gray-600">
                    No upcoming patients
                  </div>
                ) : (
                  upcomingPatients.map((patient, index) => (
                    <div
                      key={patient._id}
                      className="p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-medical-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-black text-lg">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 uppercase">
                              Token
                            </p>
                            <p className="text-2xl font-black text-medical-600">
                              {patient.tokenNumber}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-gray-500">ETA</p>
                          <p className="text-lg font-bold text-orange-600">
                            {patient.estimatedWaitTime} min
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-800">
                            {toTitleCase(patient.name)}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            📞 {maskPhone(patient.phone)}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded ${patient.type === "BOOKED" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                          >
                            {patient.type}
                          </span>
                          <span className="text-xs font-bold px-2 py-1 rounded bg-medical-100 text-medical-800">
                            Position: {patient.position}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Safe Area Padding */}
      <div className="h-10" />
    </div>
  );
};

export default AssistantDashboard;
