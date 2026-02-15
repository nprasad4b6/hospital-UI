import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useQueueVoice } from "../hooks/useQueueVoice";
import { toTitleCase, formatPhoneDisplay } from "../utils/formatters";

const SOCKET_SERVER = process.env.REACT_APP_API_URL || "http://localhost:5000";

const LobbyTV = () => {
  const [currentPatient, setCurrentPatient] = useState(null);
  const [nextPatients, setNextPatients] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [fameCount, setFameCount] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  // Compute today's date string in IST (Asia/Kolkata) to avoid UTC offset issues
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes
  const getIstDateString = (inputDate) => {
    const base = inputDate ? new Date(inputDate) : new Date();
    const ist = new Date(base.getTime() + IST_OFFSET_MS);
    const y = ist.getUTCFullYear();
    const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
    const d = String(ist.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const [selectedDate, setSelectedDate] = useState(getIstDateString());
  const [socketRef, setSocketRef] = useState(null);
  const { announcePatientCall, isSupported: isVoiceSupported } =
    useQueueVoice();

  useEffect(() => {
    const updateLobbyDisplay = (queue) => {
      setAllPatients(queue);

      if (queue && queue.length > 0) {
        // Find current patient (IN_PROGRESS)
        const inProgress = queue.find((p) => p.status === "IN_PROGRESS");

        // If we have a new current patient, announce them
        if (inProgress && voiceEnabled && isVoiceSupported) {
          // Only announce if this is different from the previous patient
          if (!currentPatient || currentPatient._id !== inProgress._id) {
            setTimeout(() => {
              announcePatientCall(inProgress.tokenNumber, inProgress.name);
            }, 500); // Small delay to ensure clean announcement
          }
        }

        setCurrentPatient(inProgress || null);

        // Get next 3 waiting patients
        const waiting = queue.filter((p) => p.status === "WAITING").slice(0, 3);
        setNextPatients(waiting);
      } else {
        setCurrentPatient(null);
        setNextPatients([]);
      }
    };

    const newSocket = io(SOCKET_SERVER);
    setSocketRef(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server - Lobby TV");
      // Request queue for selected date
      if (selectedDate) {
        newSocket.emit("GET_QUEUE_BY_DATE", selectedDate);
      } else {
        newSocket.emit("GET_QUEUE");
      }
    });

    newSocket.on("QUEUE_UPDATE", (data) => {
      updateLobbyDisplay(data);
      // refresh fame counter on queue updates
      fetchFameCount();
    });

    newSocket.on("RESET_SUCCESS", (data) => {
      console.log("Queue reset:", data.message);
      updateLobbyDisplay(data.queue);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    return () => {
      newSocket.close();
    };
  }, [
    currentPatient,
    voiceEnabled,
    announcePatientCall,
    isVoiceSupported,
    selectedDate,
  ]);

  const fetchFameCount = async () => {
    try {
      const res = await fetch(
        `${SOCKET_SERVER.replace(/\/$/, "")}/api/stats/done-today`,
      );
      const json = await res.json();
      if (json && typeof json.count === "number") setFameCount(json.count);
    } catch (err) {
      console.warn("Failed to fetch fame count", err);
    }
  };

  useEffect(() => {
    fetchFameCount();
  }, []);

  /**
   * Handle date selection change
   */
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    if (socketRef) {
      socketRef.emit("GET_QUEUE_BY_DATE", newDate);
    }
  };

  /**
   * Reset to today's date
   */
  const handleResetToToday = () => {
    const todayDate = getIstDateString();
    setSelectedDate(todayDate);
    if (socketRef) {
      socketRef.emit("RESET_QUEUE");
      socketRef.emit("GET_QUEUE_BY_DATE", todayDate);
    }
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-medical-900 via-medical-800 to-blue-900 overflow-hidden flex flex-col">
      {/* Date Filter Header - Responsive */}
      <div className="bg-gradient-to-r from-medical-800 to-blue-900 py-1 md:py-3 px-2 md:px-6 lg:px-12 border-b-2 border-medical-400 flex items-center justify-between gap-2 flex-wrap z-50">
        <div className="flex items-center gap-2 md:gap-4">
          <label className="hidden sm:block text-white text-xs md:text-sm lg:text-base font-bold uppercase tracking-wide">
            📅 Filter by Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="px-2 py-1 rounded text-xs md:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-medical-400"
          />
        </div>

        {/* Reset Button */}
        <button
          onClick={handleResetToToday}
          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded font-bold text-xs md:text-sm uppercase transition-all shadow-lg"
        >
          🔄 Reset
        </button>

        {/* Date Display */}
        <div className="text-white text-xs md:text-sm font-semibold">
          {selectedDate === getIstDateString() ? "📆 Today" : `${new Date(selectedDate).toLocaleDateString()}`}
        </div>
      </div>
      {/* Main Content Grid - Responsive */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 p-4 md:p-8 lg:p-12">
        {/* Left Side - Currently Serving (Token) */}
        <div className="col-span-1 flex flex-col justify-center items-center">
          <div className="text-center w-full">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 md:mb-4 tracking-wider">
              <span className="text-medical-300">NOW</span>
              <br />
              <span className="text-medical-200">SERVING</span>
            </h2>

            {/* Token Display - Responsive (Hero on mobile) */}
            <div className="my-6 md:my-8 lg:my-10 w-full">
              {currentPatient ? (
                <div className="w-full rounded-lg md:rounded-3xl p-4 md:p-6 md:shadow-2xl bg-white md:bg-gradient-to-br md:from-medical-900 md:via-medical-800 md:to-blue-900 border-b-2 md:border-none">
                  <div className="text-6xl md:text-7xl lg:text-9xl font-black text-blue-700 md:text-green-400 leading-none mb-2 md:mb-4">
                    {currentPatient.tokenNumber}
                  </div>
                  <p className="text-lg md:text-2xl lg:text-3xl text-medical-700 md:text-medical-200 font-bold mb-3 md:mb-4">
                    Token Number
                  </p>

                  {/* Patient Name & Type */}
                  <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 mt-3 md:mt-6">
                    <p className="text-base md:text-xl lg:text-2xl font-bold text-gray-800 mb-1">
                      {toTitleCase(currentPatient.name)}
                    </p>
                    <p className="text-sm md:text-base lg:text-lg text-gray-600">
                      📞 {formatPhoneDisplay(currentPatient.phone)}
                    </p>
                    <div className="mt-3 md:mt-4 flex justify-center">
                      <span
                        className={`text-sm md:text-base font-bold px-3 md:px-6 py-1 md:py-2 rounded-full ${
                          currentPatient.type === "BOOKED"
                            ? "bg-blue-500 text-white"
                            : "bg-purple-500 text-white"
                        }`}
                      >
                        {currentPatient.type}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-6xl md:text-7xl lg:text-9xl font-black text-gray-400 drop-shadow-2xl leading-none mb-2 md:mb-4">
                  -
                </div>
              )}
            </div>

            {/* Telugu Translation */}
            <p className="text-sm md:text-lg lg:text-2xl text-gray-600 font-semibold mt-4 md:mt-6 tracking-wide">
              ఇప్పుడు చూస్తున్న నంబర్
            </p>
          </div>
        </div>

        {/* Right Side - Next 3 Tokens */}
        <div className="col-span-1 flex flex-col justify-center items-center">
          <div className="text-center w-full">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-3 md:mb-6 tracking-wider">
              <span className="text-medical-300">NEXT</span>
              <br />
              <span className="text-medical-200">IN QUEUE</span>
            </h2>

            <div className="space-y-3 md:space-y-4 max-h-60 md:max-h-80 lg:max-h-96 overflow-y-auto pr-2">
              {nextPatients.length === 0 ? (
                <div className="bg-white bg-opacity-10 backdrop-blur rounded-xl md:rounded-2xl p-4 md:p-8">
                  <p className="text-lg md:text-xl lg:text-2xl text-gray-400 font-bold">
                    No upcoming patients
                  </p>
                </div>
              ) : (
                nextPatients.map((patient) => (
                  <div
                    key={patient._id}
                    className="bg-white md:bg-gradient-to-r md:from-medical-600 md:to-medical-700 rounded-md md:rounded-2xl p-3 md:p-6 shadow-sm md:shadow-xl transform md:hover:scale-105 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs md:text-sm text-gray-500 font-semibold">
                          TOKEN
                        </p>
                        <p className="text-2xl md:text-4xl font-black text-blue-600 md:text-yellow-300">
                          {patient.tokenNumber}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-xs md:text-sm text-gray-500 font-semibold mb-1">
                          ETA
                        </p>
                        <p className="text-lg md:text-2xl font-black text-orange-300">
                          {patient.estimatedWaitTime}m
                        </p>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-gray-700 mt-2 md:mt-3 text-left truncate">
                      {toTitleCase(patient.name)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Telugu Translation */}
            <p className="text-sm md:text-lg lg:text-2xl text-gray-600 font-semibold mt-4 md:mt-8 tracking-wide">
              తరువాతి నంబర్
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Ticker - Horizontal Scrolling - Responsive */}
      <div className="bg-gradient-to-r from-medical-700 via-medical-600 to-blue-700 py-3 md:py-4 lg:py-6 px-4 md:px-8 lg:px-12 border-t-4 border-medical-400 shadow-2xl">
        <div className="overflow-hidden">
          <div className="flex gap-3 md:gap-4 lg:gap-6 animate-marquee">
            {nextPatients.map((patient, idx) => (
              <div
                key={patient._id}
                className="flex-shrink-0 bg-white bg-opacity-10 backdrop-blur rounded-lg md:rounded-xl px-4 md:px-6 lg:px-8 py-2 md:py-3 lg:py-4 whitespace-nowrap min-w-max"
              >
                <p className="text-white text-xs md:text-sm lg:text-lg font-bold">
                  Token:{" "}
                  <span className="text-yellow-300">{patient.tokenNumber}</span>{" "}
                  •{" "}
                  <span className="text-medical-200">
                    {toTitleCase(patient.name)}
                  </span>
                </p>
              </div>
            ))}
            {nextPatients.length === 0 && (
              <div className="flex-shrink-0 bg-white bg-opacity-10 backdrop-blur rounded-lg md:rounded-xl px-4 md:px-6 lg:px-8 py-2 md:py-3 lg:py-4 whitespace-nowrap">
                <p className="text-gray-400 text-xs md:text-sm lg:text-lg font-bold">
                  No upcoming patients
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Info Badge - Responsive */}
      <div className="absolute top-3 md:top-4 lg:top-6 right-3 md:right-4 lg:right-6 bg-medical-600 rounded-full px-3 md:px-4 lg:px-6 py-2 md:py-2 lg:py-3 shadow-lg z-40">
        <p className="text-white font-bold text-xs md:text-sm lg:text-lg">
          Queue Total:{" "}
          <span className="text-yellow-300">{allPatients.length}</span>
        </p>
      </div>

      {/* Stats Footer - Responsive */}
      <div className="bg-gradient-to-r from-medical-800 via-medical-700 to-blue-800 py-3 md:py-4 lg:py-6 px-3 md:px-6 lg:px-12 border-t-4 border-medical-400 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center justify-around gap-4 md:gap-6 lg:gap-8 max-w-7xl mx-auto">
          {/* Total Patients Served */}
          <div className="text-center">
            <div className="flex items-center gap-2 md:gap-3 justify-center mb-1 md:mb-2">
              <svg
                className="w-4 md:w-5 lg:w-6 h-4 md:h-5 lg:h-6 text-green-400 animate-pulse"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <p className="text-medical-200 font-bold text-xs md:text-sm lg:text-base uppercase tracking-wide">
                Total Served Today
              </p>
            </div>
            <p className="text-2xl md:text-3xl lg:text-4xl font-black text-green-400">
              {allPatients.filter((p) => p.status === "DONE").length}
            </p>
          </div>

          {/* Average Wait Time */}
          <div className="text-center">
            <div className="flex items-center gap-2 md:gap-3 justify-center mb-1 md:mb-2">
              <svg
                className="w-4 md:w-5 lg:w-6 h-4 md:h-5 lg:h-6 text-yellow-400 animate-pulse"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M11.99 5V1h-12v4h12zm6.93 0C19.5 4.56 20 8.63 20 12s-.5 7.44-2.07 7c-1.66-.5-2.93-2.5-2.93-7s1.27-6.5 2.93-7zM1 14h12v-2H1v2z" />
              </svg>
              <p className="text-medical-200 font-bold text-xs md:text-sm lg:text-base uppercase tracking-wide">
                Avg Wait
              </p>
            </div>
            <p className="text-2xl md:text-3xl lg:text-4xl font-black text-yellow-400">
              15 min
            </p>
          </div>

          {/* Clinic Status */}
          <div className="text-center">
            <div className="flex items-center gap-2 md:gap-3 justify-center mb-1 md:mb-2">
              <div className="w-2 md:w-3 h-2 md:h-3 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-medical-200 font-bold text-xs md:text-sm lg:text-base uppercase tracking-wide">
                Status
              </p>
            </div>
            <p className="text-lg md:text-xl lg:text-2xl font-black text-green-400">
              On Schedule
            </p>
          </div>
        </div>
      </div>

      {/* Voice Control Toggle - Responsive */}
      {isVoiceSupported && (
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={`absolute bottom-3 md:bottom-4 lg:bottom-6 right-3 md:right-4 lg:right-6 rounded-full p-2 md:p-3 lg:p-4 shadow-lg transition-all transform hover:scale-110 z-40 ${
            voiceEnabled
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-gray-400 hover:bg-gray-500 text-white"
          }`}
          title={voiceEnabled ? "Voice Enabled" : "Voice Disabled"}
        >
          <svg
            className="w-4 md:w-5 lg:w-6 h-4 md:h-5 lg:h-6"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            {voiceEnabled ? (
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z M17.3 11c0 2.29-1.72 4.21-4 4.47v2.53h2v2H9v-2h2v-2.53c-2.28-.26-4-2.18-4-4.47H5c0 3.53 2.61 6.43 6 6.92v2.08h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
            ) : (
              <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.40989519,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L21.714504,3.42671123 L3.03521743,6.3286752 L3.50612381,12.4744748 Z" />
            )}
          </svg>
        </button>
      )}

      {/* Fame Counter Badge - Responsive - Repositioned for mobile */}
      <div className="absolute bottom-14 md:bottom-16 lg:bottom-24 right-3 md:right-4 lg:right-24 bg-amber-500 rounded-full px-3 md:px-4 lg:px-5 py-2 md:py-2 lg:py-3 shadow-2xl z-40">
        <p className="text-black font-bold text-xs md:text-sm lg:text-base">
          Total Consultations Today:
          <span className="ml-1 md:ml-2 text-sm md:text-base lg:text-lg">
            {fameCount}
          </span>
        </p>
      </div>

      {/* Animation Styles - injected via CSS */}
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .animate-marquee {
          animation: marquee 30s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default LobbyTV;
