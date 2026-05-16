"use client";
import React, { useState } from 'react';

export default function AdCreatorModal({ isOpen, onClose, onLaunch, darkMode, balance }: any) {
  const [adData, setAdData] = useState({
    text: '',
    image_url: '',
    target_url: '',
    duration: 24 // v urah
  });

  const prices: any = {
    24: 50,
    72: 120,
    168: 250
  };

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (event) => setAdData({ ...adData, image_url: event.target?.result as string });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
      <div className={`w-full max-w-lg rounded-[3rem] border p-8 ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Launch Ad Campaign</h2>
            <p className="text-[10px] opacity-50 uppercase font-bold tracking-widest text-blue-500">Global Network Promotion</p>
          </div>
          <button onClick={onClose} className="text-xl opacity-30 hover:opacity-100 transition-transform hover:rotate-90">✕</button>
        </div>

        <div className="space-y-6">
          {/* TEXT */}
          <div>
            <label className="text-[9px] font-black uppercase opacity-40 mb-2 block ml-1">Campaign Message</label>
            <textarea 
              value={adData.text}
              onChange={(e) => setAdData({...adData, text: e.target.value})}
              placeholder="e.g. Join my VIP node for 90% Win Rate signals!"
              className={`w-full p-4 rounded-2xl border text-xs outline-none h-24 resize-none ${darkMode ? 'bg-black border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
            />
          </div>

          {/* IMAGE & URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black uppercase opacity-40 mb-2 block ml-1">Banner Image</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="text-[10px] opacity-50" />
              {adData.image_url && <div className="mt-2 h-10 w-20 rounded-lg overflow-hidden border border-zinc-800"><img src={adData.image_url} className="object-cover w-full h-full" /></div>}
            </div>
            <div>
              <label className="text-[9px] font-black uppercase opacity-40 mb-2 block ml-1">Target Link (URL)</label>
              <input 
                type="text" 
                value={adData.target_url}
                onChange={(e) => setAdData({...adData, target_url: e.target.value})}
                placeholder="https://..."
                className={`w-full p-3 rounded-xl border text-[10px] outline-none ${darkMode ? 'bg-black border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
              />
            </div>
          </div>

          {/* DURATION SELECT */}
          <div>
            <label className="text-[9px] font-black uppercase opacity-40 mb-2 block ml-1">Campaign Duration</label>
            <div className="grid grid-cols-3 gap-3">
              {[24, 72, 168].map((hours) => (
                <button 
                  key={hours}
                  onClick={() => setAdData({...adData, duration: hours})}
                  className={`p-3 rounded-2xl border text-[10px] font-black uppercase transition-all ${adData.duration === hours ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-zinc-800 opacity-40'}`}
                >
                  {hours === 168 ? '7 Days' : hours === 72 ? '3 Days' : '24 Hours'}
                  <span className="block text-[8px] font-mono opacity-60">{prices[hours]} GAINS</span>
                </button>
              ))}
            </div>
          </div>

          {/* TOTAL & BUY */}
          <div className={`mt-8 p-6 rounded-[2rem] border flex items-center justify-between ${darkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
            <div>
              <span className="text-[8px] font-black uppercase opacity-50 block">Investment:</span>
              <span className="text-2xl font-black text-blue-500">{prices[adData.duration]} GAINS</span>
            </div>
            <button 
              onClick={() => onLaunch(adData, prices[adData.duration])}
              disabled={!adData.text || balance < prices[adData.duration]}
              className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                balance >= prices[adData.duration] ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {balance < prices[adData.duration] ? 'Insufficient Gains' : 'Launch Campaign 🚀'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}