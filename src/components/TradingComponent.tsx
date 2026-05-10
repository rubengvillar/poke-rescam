import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, addDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, QrCode, Scan, ChevronLeft, ArrowLeftRight, CheckCircle2, Sparkles, XCircle, Copy, Share2 } from 'lucide-react';
import { createTradeSession, TradeSession } from '../lib/trade-service';
import { ToastProvider, useToast } from './Toast';

export const TradingComponent = () => {
  return (
    <ToastProvider>
      <TradingContent />
    </ToastProvider>
  );
};

const TradingContent = () => {
  const { showToast } = useToast();
  const [view, setView] = useState<'friends' | 'qr' | 'scanner' | 'trade'>('friends');
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [activeTrade, setActiveTrade] = useState<TradeSession | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [targetId, setTargetId] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        // Listen for friend requests
        const q = query(collection(db, 'friendRequests'), where('to', '==', u.uid), where('status', '==', 'pending'));
        const unsubReq = onSnapshot(q, (snap) => {
          setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        
        // Listen for friends list from user doc
        const unsubUser = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            setFriends(docSnap.data().friends || []);
          }
        });

        return () => { unsubReq(); unsubUser(); };
      }
    });
    return () => unsubscribe();
  }, []);

  const sendFriendRequest = async () => {
    if (!targetId || targetId === user.uid) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, 'friendRequests'), {
        from: user.uid,
        fromName: user.displayName,
        to: targetId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setTargetId("");
      showToast("¡Solicitud enviada!");
    } catch (err) {
      showToast("Error al enviar solicitud", "error");
    } finally {
      setIsSending(false);
    }
  };

  const acceptRequest = async (req: any) => {
    const userRef = doc(db, 'users', user.uid);
    const friendRef = doc(db, 'users', req.from);
    const reqRef = doc(db, 'friendRequests', req.id);

    try {
      await updateDoc(userRef, {
        friends: arrayUnion({ uid: req.from, name: req.fromName })
      });
      await updateDoc(friendRef, {
        friends: arrayUnion({ uid: user.uid, name: user.displayName })
      });
      await updateDoc(reqRef, { status: 'accepted' });
    } catch (e) {
      console.error(e);
    }
  };

  const declineRequest = async (id: string) => {
    await updateDoc(doc(db, 'friendRequests', id), { status: 'declined' });
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
                  className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex items-center gap-6 hover:border-cyan-500 transition-all group shadow-xl"
                >
                  <div className="p-4 bg-slate-950 rounded-2xl">
                    <QrCode className="text-cyan-400" size={32} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-white italic uppercase">Mi QR</h3>
                    <p className="text-slate-500 text-sm">Para que te escaneen</p>
                  </div>
                </button>
                <button 
                   onClick={() => setView('scanner')}
                   className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex items-center gap-6 hover:border-emerald-500 transition-all group shadow-xl"
                >
                  <div className="p-4 bg-slate-950 rounded-2xl">
                    <Scan className="text-emerald-400" size={32} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-white italic uppercase">Escanear</h3>
                    <p className="text-slate-500 text-sm">Escanea a otro entrenador</p>
                  </div>
                </button>
              </div>

              {/* MANUAL ENTRY */}
              <div className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] shadow-xl">
                 <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">Añadir por ID Manual</p>
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      placeholder="Pega el ID del entrenador..." 
                      className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                    />
                    <button 
                      onClick={sendFriendRequest}
                      disabled={isSending}
                      className="bg-cyan-500 text-black px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-cyan-400 transition-all disabled:opacity-50"
                    >
                      {isSending ? "..." : "Añadir"}
                    </button>
                 </div>
              </div>

              {/* PENDING REQUESTS */}
              {requests.length > 0 && (
                <div className="bg-slate-900 border border-cyan-500/30 p-8 rounded-[2.5rem] shadow-2xl">
                   <h3 className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Sparkles size={14} /> Solicitudes Pendientes
                   </h3>
                   <div className="space-y-3">
                      {requests.map(req => (
                         <div key={req.id} className="flex items-center justify-between bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                            <div>
                               <p className="text-white font-black uppercase text-xs italic">{req.fromName || "Entrenador"}</p>
                               <p className="text-slate-500 text-[8px] font-bold">ID: {req.from.substring(0,8)}...</p>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => acceptRequest(req)} className="bg-emerald-500/20 text-emerald-400 p-2 rounded-lg hover:bg-emerald-500 hover:text-black transition-all">
                                  <CheckCircle2 size={18} />
                               </button>
                               <button onClick={() => declineRequest(req.id)} className="bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                  <XCircle size={18} />
                               </button>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
              )}

              <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8">
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6">Amigos Conectados</h3>
                {friends.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="text-slate-800 mx-auto mb-4" size={48} />
                    <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Aún no tienes amigos agregados</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {friends.map((f: any) => (
                      <div key={f.uid} className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-white/5 group hover:border-cyan-500/50 transition-all">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-white/5 font-black text-cyan-400">
                               {f.name?.[0] || "?"}
                            </div>
                            <p className="text-white font-black uppercase text-[10px] tracking-widest italic">{f.name}</p>
                         </div>
                         <button className="p-2 bg-slate-900 rounded-lg text-slate-500 hover:text-white transition-colors">
                            <ArrowLeftRight size={16} />
                         </button>
                      </div>
                    ))}
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
              <div className="mb-8 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                <QRCodeSVG value={user?.uid || ''} size={200} level="H" includeMargin={false} />
              </div>
              <p className="text-black font-black text-xl italic uppercase mb-1">{user?.displayName}</p>
              
              <div className="flex flex-col items-center gap-4 mb-8 w-full">
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Tu Código de Entrenador</p>
                 <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 w-full flex flex-col items-center gap-4 shadow-inner">
                    <code className="text-slate-800 text-2xl font-black tracking-tighter font-mono">
                       {user?.uid?.substring(0,4).toUpperCase()} - {user?.uid?.substring(4,8).toUpperCase()} - {user?.uid?.substring(8,12).toUpperCase()}
                    </code>
                    <div className="flex gap-3 w-full">
                       <button 
                         onClick={() => {
                           navigator.clipboard.writeText(user?.uid);
                           showToast("¡ID Copiado!");
                         }}
                         className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all"
                       >
                          <Copy size={14} /> Copiar ID
                       </button>
                       <button 
                         onClick={() => {
                           if (navigator.share) {
                             navigator.share({
                               title: 'Mi Código de Entrenador Rescam',
                               text: `¡Agrégame en Rescam TCG! Mi ID es: ${user?.uid}`,
                               url: window.location.origin
                             });
                           } else {
                             showToast("Navegador no compatible", "error");
                           }
                         }}
                         className="p-3 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-all"
                       >
                          <Share2 size={18} />
                       </button>
                    </div>
                 </div>
              </div>
              
              <p className="text-slate-300 text-[8px] font-black uppercase tracking-widest text-center">Comparte este ID o QR para que otros te añadan</p>
            </motion.div>
          )}

          {/* Trade UI would be another state/component here */}
        </AnimatePresence>
      </div>
    </div>
  );
};
