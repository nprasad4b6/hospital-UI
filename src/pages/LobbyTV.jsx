import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useQueueVoice } from "../hooks/useQueueVoice";
import { toTitleCase } from "../utils/formatters";

const SOCKET_SERVER = process.env.REACT_APP_API_URL || "http://localhost:5000";

const maskPhoneForLobby = (phone) => {
  const phoneStr = String(phone || "").trim();
  if (phoneStr.length < 4) return phoneStr;
  const firstTwo = phoneStr.substring(0, 2);
  const lastTwo = phoneStr.substring(phoneStr.length - 2);
  const hidden = "X".repeat(Math.max(0, phoneStr.length - 4));
  return `${firstTwo}${hidden}${lastTwo}`;
};

const LobbyTV = () => {
  const [currentPatient, setCurrentPatient] = useState(null);
  const [nextPatients, setNextPatients] = useState([]);
  const [voiceEnabled] = useState(true);
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

  const [selectedDate] = useState(getIstDateString());
  const { announcePatientCall, isSupported: isVoiceSupported } =
    useQueueVoice();

  // helper that updates all pieces of lobby state based on a queue array
  const updateLobbyDisplay = (queue) => {
    if (queue && queue.length > 0) {
      // Find current patient (IN_PROGRESS)
      const inProgress = queue.find((p) => p.status === "IN_PROGRESS");

      setCurrentPatient(inProgress || null);

      // Get next 3 waiting patients
      const waiting = queue.filter((p) => p.status === "WAITING").slice(0, 3);
      setNextPatients(waiting);
    } else {
      setCurrentPatient(null);
      setNextPatients([]);
    }
  };

  // voice announcement effect — runs when currentPatient changes
  useEffect(() => {
    if (currentPatient && voiceEnabled && isVoiceSupported) {
      announcePatientCall(currentPatient.tokenNumber, currentPatient.name);
    }
  }, [currentPatient, voiceEnabled, isVoiceSupported, announcePatientCall]);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER);

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
    });

    newSocket.on("PATIENT_REGISTERED", (payload) => {
      // payload may include queue for faster sync
      if (payload && payload.queue) {
        updateLobbyDisplay(payload.queue);
      } else {
        // fall back to asking server
        newSocket.emit("GET_QUEUE");
      }
    });

    newSocket.on("PATIENT_STARTED", (payload) => {
      if (payload && payload.queue) {
        updateLobbyDisplay(payload.queue);
      } else {
        newSocket.emit("GET_QUEUE");
      }
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
  }, [selectedDate]);

  return (
    <div className="w-screen h-screen bg-[#0B1120] text-slate-100 overflow-hidden flex flex-col">
      {/* Header: only today's date */}
      <div className="bg-[#0B1120] py-2 md:py-3 px-4 md:px-8 border-b border-slate-900/60 flex items-center justify-end z-50">
        <div className="text-slate-200 text-sm md:text-base font-semibold">
          📆 {new Date(selectedDate).toLocaleDateString("en-GB")}
        </div>
      </div>
      {/* Main Content Grid - Responsive */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 p-4 md:p-8 lg:p-12">
        {/* Left Side - Currently Serving (Token) */}
        <div className="col-span-1 flex flex-col justify-center items-center">
          <div className="text-center w-full">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-100 mb-2 md:mb-4 tracking-wider">
              <span className="text-[#22d3ee]">NOW</span>
              <br />
              <span className="text-[#22d3ee]">SERVING</span>
            </h2>

            {/* Token Display - Responsive (Hero on mobile) */}
            <div className="my-6 md:my-8 lg:my-10 w-full">
              {currentPatient ? (
                <div className="w-full rounded-lg md:rounded-3xl p-4 md:p-6 shadow-lg bg-[#111827] border border-cyan-500/20">
                  <div className="text-9xl md:text-9xl lg:text-9xl font-black text-[#22d3ee] leading-none mb-2 md:mb-4 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                    {currentPatient.tokenNumber}
                  </div>
                  <p className="text-lg md:text-2xl lg:text-3xl text-white font-bold mb-3 md:mb-4">
                    Token Number
                  </p>

                  {/* Patient Name & Type */}
                  <div className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-6 mt-3 md:mt-6 border border-slate-800/40">
                    <p className="text-base md:text-xl lg:text-2xl font-bold text-slate-100 mb-1">
                      {toTitleCase(currentPatient.name)}
                    </p>
                    <p className="text-sm md:text-base lg:text-lg text-slate-300">
                      📞 +91 {maskPhoneForLobby(currentPatient.phone)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-6xl md:text-7xl lg:text-9xl font-black text-gray-400 drop-shadow-2xl leading-none mb-2 md:mb-4">
                  -
                </div>
              )}
            </div>

            {/* Telugu Translation */}
            <p className="text-xl md:text-3xl lg:text-4xl text-green-300 font-extrabold mt-4 md:mt-6 tracking-wide">
              ఇప్పుడు చూస్తున్న నంబర్
            </p>
          </div>
        </div>

        {/* Right Side - Next 3 Tokens */}
        <div className="col-span-1 flex flex-col justify-center items-center">
          <div className="text-center w-full">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-3 md:mb-6 tracking-wider">
              <span className="text-white">NEXT</span>
              <br />
              <span className="text-white">IN QUEUE</span>
            </h2>

            <div className="space-y-3 md:space-y-4 max-h-60 md:max-h-80 lg:max-h-96 overflow-y-auto pr-2">
              {nextPatients.length === 0 ? (
                <div className="bg-white/5 bg-opacity-10 backdrop-blur rounded-xl md:rounded-2xl p-4 md:p-8">
                  <p className="text-lg md:text-xl lg:text-2xl text-slate-300 font-bold">
                    No upcoming patients
                  </p>
                </div>
              ) : (
                nextPatients.map((patient) => (
                  <div
                    key={patient._id}
                    className="bg-white/10 p-3 md:p-6 rounded-md md:rounded-2xl shadow-sm border border-slate-700/40"
                  >
                    <div className="text-left">
                      <p className="text-xs md:text-sm text-slate-400 font-bold uppercase">
                        TOKEN
                      </p>
                      <p className="text-3xl md:text-5xl font-black text-[#22d3ee] leading-none">
                        {patient.tokenNumber}
                      </p>
                    </div>
                    <p className="text-xs md:text-sm text-slate-300 font-semibold mt-2 md:mt-3 text-left truncate">
                      {toTitleCase(patient.name)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Telugu Translation */}
            <p className="text-xl md:text-3xl lg:text-4xl text-green-300 font-extrabold mt-4 md:mt-8 tracking-wide">
              తరువాతి నంబర్
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyTV;
