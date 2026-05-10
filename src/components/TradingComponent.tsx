import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, QrCode, Scan, ChevronLeft, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { createTradeSession, TradeSession } from '../lib/trade-service';

export const TradingComponent = () => {
  const [view, setView] = useState<'friends' | 'qr' | 'scanner' | 'trade'>('friends');
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [activeTrade, setActiveTrade] = useState<TradeSession | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const startTrade = async (friendId: string) => {
    const tradeDoc = await createTradeSession(user.uid, friendId);
    setView('trade');
    // In a real app, you'd navigate to a dynamic route or set activeTradeId
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <button 
            onClick={() => view === 'friends' ? window.location.href = '/dashboard' : setView('friends')}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-4 group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Volver</span>
          </button>
          <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">Intercambio</h1>
        </header>

        <AnimatePresence mode="wait">
          {view === 'friends' && (
            <motion.div 
              key="friends"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => setView('qr')}
                  className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex items-center gap-6 hover:border-cyan-500 transition-all group"
                >
                  <div className="p-4 bg-slate-950 rounded-2xl">
                    <QrCode className="text-cyan-400" size={32} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-white italic uppercase">Mi Código QR</h3>
                    <p className="text-slate-500 text-sm">Muestra este código para que te agreguen</p>
                  </div>
                </button>
                <button 
                   onClick={() => setView('scanner')}
                   className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex items-center gap-6 hover:border-emerald-500 transition-all group"
                >
                  <div className="p-4 bg-slate-950 rounded-2xl">
                    <Scan className="text-emerald-400" size={32} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-white italic uppercase">Escanear Amigo</h3>
                    <p className="text-slate-500 text-sm">Escanea el QR de otro entrenador</p>
                  </div>
                </button>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8">
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6">Amigos Conectados</h3>
                {friends.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="text-slate-800 mx-auto mb-4" size={48} />
                    <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Aún no tienes amigos agregados</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* List friends here */}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'qr' && (
            <motion.div 
              key="qr"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center bg-white p-12 rounded-[3rem] max-w-sm mx-auto shadow-[0_0_50px_rgba(255,255,255,0.1)]"
            >
              <div className="mb-8">
                <QRCodeSVG value={user?.uid || ''} size={200} level="H" includeMargin={false} />
              </div>
              <p className="text-black font-black text-xl italic uppercase mb-2">{user?.displayName}</p>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Código de Entrenador</p>
            </motion.div>
          )}

          {/* Trade UI would be another state/component here */}
        </AnimatePresence>
      </div>
    </div>
  );
};
