import React from 'react';

const LobbyDisplay = ({ currentPatient, queueList, handleReset }) => {
  // currentPatient.token -> adapted to tokenNumber if calling code uses that
  const token = currentPatient?.token || currentPatient?.tokenNumber || "0";
  const name = currentPatient?.name || "No Patient";
  const type = currentPatient?.type || "WALK_IN";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* 1. Header Area (Compact & Clean) */}
      <div className="bg-white border-b border-slate-200 p-3 sticky top-0 z-10 flex justify-between items-center shadow-sm">
         <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lobby Display</span>
            <span className="text-sm font-semibold text-blue-600">Today: {new Date().toLocaleDateString()}</span>
         </div>
         <button onClick={handleReset} className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
            RESET
         </button>
      </div>

      {/* 2. "NOW SERVING" HERO (White Card style) */}
      <div className="p-4">
        <div className="bg-white rounded-3xl p-8 text-center shadow-xl border border-blue-100 mb-6">
          <p className="text-blue-600 font-bold text-lg mb-1">NOW SERVING</p>
          <p className="text-slate-400 text-xs mb-4">ఇప్పుడు చూస్తున్న నంబర్</p>
          
          <h1 className="text-9xl font-black text-slate-900 drop-shadow-sm mb-4">
            {token}
          </h1>
          
          <div className="bg-blue-50 py-4 px-6 rounded-2xl inline-block border border-blue-100">
            <p className="text-xl font-bold text-blue-900">{name}</p>
            <span className="bg-blue-600 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase mt-2 inline-block">
               {type}
            </span>
          </div>
        </div>

        {/* 3. "NEXT IN QUEUE" SECTION */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Next in Queue</h2>
            <span className="text-xs text-slate-400 font-bold">తరువాతి నంబర్</span>
          </div>

          <div className="space-y-3">
            {queueList.map((patient) => (
              <div key={patient.token} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-95">
                <div className="flex items-center gap-4">
                  {/* Token Badge */}
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-blue-600 font-black text-xl border border-slate-200">
                    {patient.token}
                  </div>
                  <div>
                    <p className="text-slate-900 font-bold text-lg">{patient.name}</p>
                    <p className="text-slate-400 text-xs font-medium uppercase">{patient.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-bold uppercase">Wait Time</p>
                  <p className="text-blue-600 font-black text-lg">{patient.eta}m</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyDisplay;
