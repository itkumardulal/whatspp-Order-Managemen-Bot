
import React, { useState } from 'react';
import ChatWindow from './components/ChatWindow';
import SettingsPage from './components/SettingsPage';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'SIMULATOR' | 'SETTINGS'>('SIMULATOR');

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#e6e6e6]">
      <nav className="bg-[#111b21] text-white px-6 py-2 flex justify-between items-center z-10 shadow-lg border-b border-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#00a884] rounded-lg flex items-center justify-center font-bold text-white shadow-inner">S</div>
          <div>
            <span className="font-black tracking-widest text-[12px] uppercase block leading-none">SindhuliBazar</span>
            <span className="text-[8px] opacity-50 uppercase font-black tracking-[2px]">Admin Terminal</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => setCurrentPage('SIMULATOR')} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${currentPage === 'SIMULATOR' ? 'bg-[#00a884] text-white shadow-xl' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Sim</button>
          <button onClick={() => setCurrentPage('SETTINGS')} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${currentPage === 'SETTINGS' ? 'bg-[#00a884] text-white shadow-xl' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Config</button>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden p-0 sm:p-4 lg:p-6">
        {currentPage === 'SIMULATOR' ? <ChatWindow /> : <SettingsPage onBack={() => setCurrentPage('SIMULATOR')} />}
      </main>

      <footer className="bg-white border-t border-gray-300 p-2 text-center text-[9px] text-gray-400 font-black uppercase tracking-[4px]">
        Order Flow System v4.0 • 24/7 Operations Active
      </footer>
    </div>
  );
};

export default App;
