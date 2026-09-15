
import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageSender, OrderDetails, ChatSession, OrderStatus } from '../types';
import { getSmartResponse, verifyPayment } from '../services/geminiService';

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: 'sess-1',
    customerName: 'Ram Thapa',
    customerPhone: '9841XXXXXX',
    lastMessage: 'Crunchy Burger order check gartidinu na.',
    lastTimestamp: new Date(),
    messages: [
      { id: 'm1', sender: MessageSender.USER, text: 'Hello, Crunchy Burger 1 ota order garna man chha.', timestamp: new Date() },
      { id: 'm2', sender: MessageSender.BOT, text: 'Namaste Ram ji! Crunchy Burger ko Rs. 250 parchha. Hajurko delivery location Sindhuli Madhi vitra ho ki bahira?', timestamp: new Date() }
    ],
    order: { product: 'Crunchy Burger', quantity: '1', price: '250', name: 'Ram Thapa', phone: '9841XXXXXX', itemsList: ['1x Crunchy Burger'] },
    botState: 'IDLE',
    orderStatus: 'PENDING'
  }
];

const KITCHEN_STAFF = [
  { id: 'ks-1', name: 'Milan Magar', role: 'Head Chef', status: 'Cooking' },
  { id: 'ks-2', name: 'Sujata Rai', role: 'Prep Team', status: 'Available' },
  { id: 'ks-3', name: 'Dipesh Shrestha', role: 'Packing', status: 'On Break' }
];

const ChatWindow: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('sb_sessions_v6');
    return saved ? JSON.parse(saved).map((s: any) => ({ 
      ...s, lastTimestamp: new Date(s.lastTimestamp), 
      lastAdminInteraction: s.lastAdminInteraction ? new Date(s.lastAdminInteraction) : undefined,
      messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) 
    })) : INITIAL_SESSIONS;
  });
  
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0].id);
  const [activeTab, setActiveTab] = useState<'CHAT' | 'DASHBOARD'>('CHAT');
  const [dashboardSubTab, setDashboardSubTab] = useState<'INTEL' | 'KITCHEN' | 'RIDER'>('INTEL');
  const [inputText, setInputText] = useState('');
  const [adminInput, setAdminInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [groupLog, setGroupLog] = useState<Message[]>([]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('sb_sessions_v6', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession.messages, isTyping, groupLog]);

  const updateSession = (id: string, updates: Partial<ChatSession>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const pushToKitchen = (session: ChatSession) => {
    if (!session.order) return;
    const vendorMsg: Message = {
      id: `kit-${Date.now()}`,
      sender: MessageSender.SYSTEM,
      isVendorInstruction: true,
      text: `📢 **NEW ORDER ALERT**\n\n• Customer: **${session.customerName}**\n• Items: ${session.order.product}\n• Phone: ${session.customerPhone}\n\n*Action: Prep now!*`,
      timestamp: new Date()
    };
    setGroupLog(prev => [vendorMsg, ...prev]);
    updateSession(session.id, { orderStatus: 'IN_KITCHEN' });
  };

  const handleSendBackToIntel = (sessionId: string) => {
    updateSession(sessionId, { orderStatus: 'PENDING' });
    setGroupLog(prev => [
      { id: `sys-${Date.now()}`, sender: MessageSender.SYSTEM, text: `⚠️ Order for ${sessions.find(s => s.id === sessionId)?.customerName} moved back to INTEL.`, timestamp: new Date() },
      ...prev
    ]);
  };

  const handleAdminSend = () => {
    if (!adminInput.trim()) return;
    const adminMsg: Message = { id: `admin-${Date.now()}`, sender: MessageSender.ADMIN, text: adminInput, timestamp: new Date() };
    updateSession(activeSessionId, { 
      messages: [...activeSession.messages, adminMsg], 
      lastMessage: adminInput, lastTimestamp: new Date(), lastAdminInteraction: new Date() 
    });
    setAdminInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeSession.order) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const imageUrl = ev.target?.result as string;
        const userImg: Message = { id: `img-${Date.now()}`, sender: MessageSender.USER, text: 'Sent Receipt.', imageUrl, timestamp: new Date() };
        updateSession(activeSessionId, { messages: [...activeSession.messages, userImg] });
        setIsTyping(true);
        try {
          const v = await verifyPayment(activeSession.order!, imageUrl);
          if (v.status === 'VERIFIED') {
            const botAck: Message = { id: `bot-v-${Date.now()}`, sender: MessageSender.BOT, text: `✅ **Verified!** (Rs. ${v.extractedAmount})\n\nDhanyabaad! Payment confirm bhayo. Hamile kitchen ma order pathaisakeu.`, timestamp: new Date() };
            updateSession(activeSessionId, { 
              messages: [...activeSession.messages, userImg, botAck], 
              orderStatus: 'PAID' 
            });
            pushToKitchen({ ...activeSession, orderStatus: 'PAID' });
          } else {
            const botFail: Message = { id: `bot-f-${Date.now()}`, sender: MessageSender.BOT, text: `❌ **Failed Verification**\n\nReason: ${v.aiNotes}. Kripaya clear photo pathaunu hola.`, timestamp: new Date() };
            updateSession(activeSessionId, { messages: [...activeSession.messages, userImg, botFail] });
          }
        } catch (e) {
            console.error(e);
        } finally { setIsTyping(false); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUserSend = async () => {
    if (!inputText.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), sender: MessageSender.USER, text: inputText, timestamp: new Date() };
    const updatedMessages = [...activeSession.messages, userMsg];
    updateSession(activeSessionId, { messages: updatedMessages, lastMessage: inputText, lastTimestamp: new Date(), unread: activeTab === 'DASHBOARD' });
    const input = inputText;
    setInputText('');
    setIsTyping(true);

    const wasAdminLast = !!activeSession.lastAdminInteraction && (new Date().getTime() - activeSession.lastAdminInteraction.getTime() < 300000);

    try {
      const result = await getSmartResponse(input, activeSession.order, activeSession.botState, wasAdminLast, activeSession.orderStatus);
      if (result.shouldSpeak && result.replyText) {
        const botResponse: Message = { id: `bot-${Date.now()}`, sender: MessageSender.BOT, text: result.replyText, timestamp: new Date() };
        if (result.showQR) {
          botResponse.imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SB_PAYMENT_RS_${activeSession.order?.price || 0}`;
          botResponse.isQR = true;
        }
        updateSession(activeSessionId, { 
          messages: [...updatedMessages, botResponse], 
          order: result.updatedOrder, 
          botState: result.nextState as any,
          lastMessage: result.replyText, lastTimestamp: new Date()
        });
      } else {
        updateSession(activeSessionId, { order: result.updatedOrder, botState: result.nextState as any });
      }
    } catch (e) {
      console.error(e);
    } finally { setIsTyping(false); }
  };

  const renderText = (text: string, isWhite: boolean) => {
    return text.split('\n').map((line, i) => (
      <span key={i} className={`block my-0.5 ${isWhite ? 'text-slate-50' : 'text-slate-900'}`}>
        {line.split('**').map((part, j) => j % 2 === 1 ? <strong key={j} className="font-black text-inherit">{part}</strong> : part)}
      </span>
    ));
  };

  return (
    <div className="flex h-full bg-white max-w-7xl mx-auto shadow-2xl rounded-none sm:rounded-2xl border border-slate-300 overflow-hidden">
      {/* Sidebar: Inboxes */}
      <div className="w-1/5 bg-slate-950 flex flex-col border-r border-slate-800">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <span className="font-black text-[9px] uppercase tracking-widest text-slate-400">Customer Support</span>
          <button onClick={() => {
            const id = `sess-${Date.now()}`;
            setSessions([{ id, customerName: 'New Guest', customerPhone: 'Unverified', lastMessage: 'No Chat', lastTimestamp: new Date(), messages: [], order: null, botState: 'IDLE', orderStatus: 'PENDING' }, ...sessions]);
            setActiveSessionId(id);
          }} className="w-6 h-6 bg-emerald-500 rounded text-slate-950 font-black text-xs hover:bg-emerald-400">+</button>
        </div>
        <div className="overflow-y-auto flex-1 scrollbar-hide">
          {sessions.map(s => (
            <div key={s.id} onClick={() => { setActiveSessionId(s.id); updateSession(s.id, { unread: false }); }} className={`p-4 border-b border-slate-900 cursor-pointer transition-colors ${activeSessionId === s.id ? 'bg-slate-800 border-l-4 border-emerald-500' : 'hover:bg-slate-900'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`font-bold text-xs ${activeSessionId === s.id ? 'text-white' : 'text-slate-400'}`}>{s.customerName}</span>
                <span className="text-[7px] text-slate-500 font-bold">{s.lastTimestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
              </div>
              <p className={`text-[9px] truncate uppercase font-black ${s.orderStatus === 'IN_KITCHEN' ? 'text-orange-400' : s.orderStatus === 'PAID' ? 'text-emerald-400' : 'text-slate-600'}`}>{s.orderStatus}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Simulation View */}
      <div className="flex-1 flex flex-col h-full bg-slate-100 relative overflow-hidden border-r border-slate-200">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between z-10 shadow-md">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center font-black text-slate-950 text-sm">{activeSession.customerName[0]}</div>
             <div>
                <h2 className="font-black text-xs leading-tight flex items-center uppercase tracking-wider">
                  {activeSession.customerName}
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${activeSession.orderStatus === 'IN_KITCHEN' ? 'bg-orange-500 text-white' : activeSession.orderStatus === 'PAID' ? 'bg-emerald-500 text-white' : 'bg-slate-700'}`}>{activeSession.orderStatus}</span>
                </h2>
                <p className="text-[9px] text-slate-500 font-bold">{activeSession.customerPhone}</p>
             </div>
          </div>
          <div className="flex bg-slate-950 p-1 rounded-lg">
             <button onClick={() => setActiveTab('CHAT')} className={`px-4 py-1.5 rounded text-[8px] font-black uppercase tracking-widest ${activeTab === 'CHAT' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500'}`}>Simulation</button>
             <button onClick={() => setActiveTab('DASHBOARD')} className={`px-4 py-1.5 rounded text-[8px] font-black uppercase tracking-widest ${activeTab === 'DASHBOARD' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500'}`}>Agent Hub</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 relative bg-[#e5ddd5]" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'overlay' }}>
          {activeSession.messages.map(msg => (
            <div key={msg.id} className={`flex relative z-0 ${msg.sender === MessageSender.USER ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${msg.sender === MessageSender.USER ? 'bg-[#dcf8c6]' : msg.sender === MessageSender.ADMIN ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                  {msg.sender === MessageSender.ADMIN && <div className="text-[7px] font-black text-emerald-400 mb-1 tracking-[3px] uppercase">Human Manager</div>}
                  {msg.imageUrl && (
                    <div className="mb-2 p-1 bg-slate-200 rounded-lg overflow-hidden border border-slate-300">
                       <img src={msg.imageUrl} alt="Attached" className={`rounded-md w-full h-auto ${msg.isQR ? 'max-w-[200px] mx-auto' : 'max-h-64'}`} />
                    </div>
                  )}
                  <div className="text-[14px] leading-relaxed tracking-tight">{renderText(msg.text, msg.sender === MessageSender.ADMIN)}</div>
                  <div className={`text-[8px] text-right mt-1 font-bold opacity-40 ${msg.sender === MessageSender.ADMIN ? 'text-white' : 'text-slate-900'}`}>
                    {msg.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </div>
               </div>
            </div>
          ))}
          {isTyping && <div className="bg-white/80 backdrop-blur-sm border border-slate-300 px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-700 w-fit animate-pulse shadow-sm">Saru is processing...</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-slate-100 border-t border-slate-200 shadow-inner">
          <div className="flex space-x-3 items-center">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors shadow-sm text-lg">📁</button>
            <input 
              type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && (activeTab === 'CHAT' ? handleUserSend() : handleAdminSend())}
              placeholder={activeTab === 'CHAT' ? "Simulate customer text..." : "Reply as human agent..."}
              className="flex-1 bg-white rounded-xl px-5 py-4 text-sm font-bold border-2 border-slate-200 focus:border-emerald-500 outline-none text-slate-900 shadow-sm" 
            />
            <button onClick={activeTab === 'CHAT' ? handleUserSend : handleAdminSend} className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg hover:bg-emerald-500 transition-all active:scale-95">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Panel: Multi-Agent Hub */}
      <div className="w-1/3 bg-slate-50 flex flex-col h-full border-l border-slate-200">
        <div className="flex bg-slate-200 p-1 border-b border-slate-300">
           <button onClick={() => setDashboardSubTab('INTEL')} className={`flex-1 py-3 text-[9px] font-black uppercase transition-all rounded-md ${dashboardSubTab === 'INTEL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Order Intel</button>
           <button onClick={() => setDashboardSubTab('KITCHEN')} className={`flex-1 py-3 text-[9px] font-black uppercase transition-all rounded-md ${dashboardSubTab === 'KITCHEN' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}>Kitchen (Group)</button>
           <button onClick={() => setDashboardSubTab('RIDER')} className={`flex-1 py-3 text-[9px] font-black uppercase transition-all rounded-md ${dashboardSubTab === 'RIDER' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Riders</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
           {dashboardSubTab === 'INTEL' ? (
             <div className="space-y-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Live Order State</h4>
                   <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 mb-4">
                      <p className="text-[13px] font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">{activeSession.order?.product || 'Calculating items...'}</p>
                   </div>
                   <div className="flex justify-between items-end border-t border-slate-100 pt-4">
                      <div>
                         <span className="text-[8px] font-black text-slate-400 uppercase block">Grand Total</span>
                         <p className="text-xl font-black text-emerald-800 tracking-tighter">Rs. {activeSession.order?.price}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-[8px] font-black text-slate-400 uppercase block">Payment Status</span>
                         <p className={`text-[10px] font-black uppercase ${activeSession.orderStatus === 'PAID' ? 'text-emerald-600' : 'text-rose-600'}`}>{activeSession.orderStatus}</p>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl space-y-4">
                   <h5 className="text-[9px] font-black uppercase tracking-[4px] text-slate-400">Dispatcher Control</h5>
                   <button 
                     onClick={() => pushToKitchen(activeSession)} 
                     disabled={activeSession.orderStatus === 'IN_KITCHEN' || !activeSession.order}
                     className={`w-full py-5 rounded-xl text-[10px] font-black uppercase tracking-[3px] shadow-lg transition-all ${activeSession.orderStatus !== 'IN_KITCHEN' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
                   >
                     Push to Kitchen 👨‍🍳
                   </button>
                   <button onClick={() => updateSession(activeSessionId, { orderStatus: 'CANCELLED' })} className="w-full py-4 bg-slate-800 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-rose-500/20">Cancel Entry</button>
                </div>
             </div>
           ) : dashboardSubTab === 'KITCHEN' ? (
             <div className="space-y-6">
                <div className="bg-orange-600 text-white p-5 rounded-2xl shadow-lg">
                   <h4 className="text-[10px] font-black uppercase mb-4 tracking-widest">SindhuliBazar Kitchen</h4>
                   <div className="space-y-3">
                      {KITCHEN_STAFF.map(s => (
                        <div key={s.id} className="flex justify-between items-center text-[10px] bg-black/10 p-2 rounded-lg border border-white/5">
                           <span className="font-bold opacity-90">{s.name} ({s.role})</span>
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.status === 'Cooking' ? 'bg-orange-300 text-slate-950' : 'bg-emerald-300 text-slate-950'}`}>{s.status}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="space-y-4">
                   <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-[4px]">Orders on Grill</h5>
                   {groupLog.filter(l => l.isVendorInstruction).map(log => (
                     <div key={log.id} className="bg-white p-5 rounded-2xl border-2 border-orange-100 shadow-md border-l-8 border-l-orange-600">
                        <div className="text-[13px] font-bold text-slate-900 leading-relaxed">
                           {renderText(log.text, false)}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                           <button onClick={() => handleSendBackToIntel(activeSessionId)} className="flex-1 bg-orange-50 text-orange-700 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border border-orange-200 hover:bg-orange-100 transition-colors">Recall to Intel</button>
                           <button className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-sm">Mark Ready ✅</button>
                        </div>
                     </div>
                   ))}
                   {groupLog.filter(l => l.isVendorInstruction).length === 0 && <div className="py-20 text-center opacity-20 font-black text-xs uppercase tracking-[5px]">Kitchen Idle</div>}
                </div>
             </div>
           ) : (
             <div className="space-y-4">
                <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-lg">
                   <h4 className="text-[10px] font-black uppercase tracking-widest">Rider Hub</h4>
                   <p className="text-[8px] font-bold opacity-70">4 ACTIVE RIDERS IN SINDHULI MADHI</p>
                </div>
                <div className="py-20 text-center opacity-20 font-black text-xs uppercase tracking-[5px]">Waiting...</div>
             </div>
           )}
        </div>
        
        <div className="p-4 bg-slate-200 text-center border-t border-slate-300">
           <p className="text-[7px] font-black text-slate-500 uppercase tracking-[5px]">Ops Terminal v6.0</p>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
