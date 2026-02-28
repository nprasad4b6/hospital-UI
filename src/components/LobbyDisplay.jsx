import React from "react";

const LobbyDisplay = ({ currentPatient, queueList, handleReset }) => {
  // currentPatient.token -> adapted to tokenNumber if calling code uses that
  const token = currentPatient?.token || currentPatient?.tokenNumber || "0";
  const name = currentPatient?.name || "No Patient";
  const type = currentPatient?.type || "WALK_IN";

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans">
      {/* 1. Slim Header Bar (Dark Neon) */}
      <div className="sticky top-0 z-20 bg-[#0B1120] border-b border-slate-900/60 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Lobby Display
            </span>
            <div className="text-sm font-semibold text-slate-200">
              Today: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Fame Count / Total Consultations - floating pill */}
          <div className="bg-white/5 text-slate-100 px-3 py-1 rounded-full text-sm font-semibold shadow-md backdrop-blur-sm border border-slate-800/30">
            Total: {queueList?.length || 0}
          </div>

          <button
            onClick={handleReset}
            className="bg-[#111827] border border-cyan-500/20 text-[#22d3ee] px-4 py-1 rounded-full text-sm font-bold shadow-sm"
          >
            RESET
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* NOW SERVING HERO (Dark Card with cyan border & glow) */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#111827] rounded-3xl p-8 text-center shadow-lg border border-cyan-500/20 mb-6">
            <p className="text-[#22d3ee] font-bold text-lg mb-1 animate-pulse">
              NOW SERVING
            </p>
            <p className="text-slate-400 text-xs mb-4">
              ఇప్పుడు చూస్తున్న నంబర్
            </p>

            <h1 className="text-9xl font-black text-[#22d3ee] drop-shadow-[0_0_15px_rgba(34,211,238,0.4)] mb-4">
              {token}
            </h1>

            <div className="bg-white/5 py-4 px-6 rounded-2xl inline-block border border-slate-800/40">
              <p className="text-xl font-bold text-slate-100">{name}</p>
              <span className="bg-[#0B1120] border border-slate-800/40 text-[#7CFC00] text-[10px] px-3 py-1 rounded-full font-bold uppercase mt-2 inline-block">
                {type}
              </span>
            </div>
          </div>

          {/* NEXT IN QUEUE SECTION */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="text-lg font-bold text-slate-100 uppercase tracking-tight">
                Next in Queue
              </h2>
              <span className="text-xs text-slate-400 font-bold">
                తదుపరి నంబర్
              </span>
            </div>

            <div className="space-y-3">
              {queueList.map((patient) => (
                <div
                  key={patient.token}
                  className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-slate-800/30 shadow-sm transition-transform active:scale-95"
                >
                  <div className="flex items-center gap-4">
                    {/* Token Badge */}
                    <div className="w-12 h-12 rounded-full bg-white/6 flex items-center justify-center text-[#7CFC00] font-black text-xl border border-slate-800/30">
                      {patient.token}
                    </div>
                    <div>
                      <p className="text-slate-100 font-bold text-lg">
                        {patient.name}
                      </p>
                      <p className="text-slate-400 text-xs font-medium uppercase">
                        {patient.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Wait Time
                    </p>
                    <p className="text-[#22d3ee] font-black text-lg">
                      {patient.eta}m
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrolling marquee at bottom (styled for dark theme) */}
        <div className="mt-8">
          <div className="bg-[#0B1120] border-t border-slate-900/40 py-2">
            <marquee className="text-slate-400 text-sm">
              {queueList && queueList.length
                ? queueList.map((p) => `${p.token} - ${p.name}`).join("   •   ")
                : "No patients in queue"}
            </marquee>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyDisplay;
