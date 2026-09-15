
import React, { useState } from 'react';
import { BotSettings } from '../types';
import { DEFAULT_SETTINGS, STORAGE_KEY_SETTINGS } from '../constants';

interface SettingsPageProps {
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<BotSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [status, setStatus] = useState<string>('');

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    setStatus('Settings saved successfully!');
    setTimeout(() => setStatus(''), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Reset to default settings?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
  };

  return (
    <div className="flex flex-col h-full bg-white max-w-2xl mx-auto shadow-2xl border border-gray-300 rounded-none sm:rounded-xl overflow-hidden">
      <div className="bg-[#111b21] text-white p-5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-black uppercase tracking-widest">Configuration</h1>
        </div>
        <button 
          onClick={handleSave}
          className="bg-[#25d366] text-black px-6 py-2 rounded-lg font-black text-sm uppercase shadow-lg hover:bg-[#1ebe57] transition-colors"
        >
          Save
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-10 pb-24 bg-[#f8f9fa]">
        {status && (
          <div className="bg-emerald-100 border-2 border-emerald-500 text-emerald-900 px-4 py-3 rounded-lg font-bold text-sm shadow-sm">
            {status}
          </div>
        )}

        <section>
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-[4px] mb-6 border-b-2 border-slate-200 pb-2">Keywords</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-2 tracking-wider">Detection Keywords</label>
              <input 
                type="text" 
                value={settings.detectionKeywords.join(', ')}
                onChange={(e) => setSettings({...settings, detectionKeywords: e.target.value.split(',').map(s => s.trim())})}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-black font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-[4px] mb-6 border-b-2 border-slate-200 pb-2">Payment Details</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-2 tracking-wider">Receiver Name</label>
              <input 
                type="text" 
                value={settings.paymentReceiverName}
                onChange={(e) => setSettings({...settings, paymentReceiverName: e.target.value})}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-black font-bold focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-2 tracking-wider">Order Group Name</label>
              <input 
                type="text" 
                value={settings.groupName}
                onChange={(e) => setSettings({...settings, groupName: e.target.value})}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-black font-bold focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
            </div>
          </div>
        </section>

        <div className="pt-8 border-t-2 border-gray-200">
          <button 
            onClick={handleReset}
            className="text-rose-700 font-black text-xs uppercase tracking-widest hover:underline"
          >
            Reset System to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
