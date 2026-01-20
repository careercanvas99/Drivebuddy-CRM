
import React from 'react';

interface ConnectionErrorProps {
  message: string;
  onRetry: () => void;
}

const ConnectionError: React.FC<ConnectionErrorProps> = ({ message, onRetry }) => {
  return (
    <div className="h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[120px]"></div>

      <div className="max-w-md w-full bg-gray-950 border border-red-500/20 rounded-[3rem] p-12 shadow-2xl relative z-10 text-center">
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20"/><path d="M5 20v-5a2 2 0 0 1 2-2h10a2 2 0 0 1 2-2v5"/><path d="M12 13V5"/><path d="M12 5L9 8"/></svg>
        </div>

        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Cloud Connection Blocked</h2>
        <p className="text-gray-400 text-[10px] leading-relaxed mb-8 uppercase tracking-widest font-black">
          {message}
        </p>

        <div className="space-y-6">
          <button 
            onClick={onRetry}
            className="w-full bg-white text-black hover:bg-red-600 hover:text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl"
          >
            Retry Connection
          </button>
          
          <div className="text-left bg-black p-4 rounded-xl border border-gray-900">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2">How to Fix:</p>
            <ul className="text-[9px] text-gray-600 font-bold tracking-widest space-y-2 list-disc pl-4 uppercase">
              <li>Disable adblockers for this domain</li>
              <li>Ensure 'cvqpaleaybyiadhpfpyh.supabase.co' is not blocked by VPN</li>
              <li>Local storage fallback is disabled to ensure data integrity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionError;
