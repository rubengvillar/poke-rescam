import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, addDoc, serverTimestamp, updateDoc, arrayUnion, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, QrCode, Scan, ChevronLeft, ArrowLeftRight, CheckCircle2, Sparkles, XCircle, Copy, Share2 } from 'lucide-react';
import { createTradeSession, TradeSession, updateTradeCards, acceptTrade, finalizeTrade } from '../lib/trade-service';
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
  const [activeTradeId, setActiveTradeId] = useState<string | null>(null);
  const [myInventory, setMyInventory] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [targetId, setTargetId] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Trade Selection States
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);

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

        // Listen for incoming trades
        const qTrades = query(collection(db, 'trades'), where('receiverId', '==', u.uid), where('status', '==', 'pending'));
        const unsubIncoming = onSnapshot(qTrades, (snap) => {
          snap.docs.forEach(d => {
            showToast("¡Invitación de intercambio recibida!", "info");
            setActiveTradeId(d.id);
            setView('trade');
          });
        });

        return () => { unsubReq(); unsubUser(); unsubIncoming(); };
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to active trade changes
  useEffect(() => {
    if (!activeTradeId) return;

    const unsubTrade = onSnapshot(doc(db, 'trades', activeTradeId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as TradeSession;
        setActiveTrade({ ...data, id: snapshot.id });
        if (data.status === 'completed') {
           showToast("¡Intercambio completado!", "success");
           setTimeout(() => {
             setView('friends');
             setActiveTradeId(null);
           }, 3000);
        }
      }
    });

    return () => unsubTrade();
  }, [activeTradeId]);

  const startTrade = async (friendUid: string) => {
    try {
      const tradeRef = await createTradeSession(user.uid, friendUid);
      setActiveTradeId(tradeRef.id);
      setView('trade');
      showToast("Sala de intercambio creada");
      
      // Load inventory
      const invSnap = await getDocs(collection(db, `users/${user.uid}/inventory`));
      setMyInventory(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      showToast("Error al iniciar intercambio", "error");
    }
  };

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
                         <button 
                           onClick={() => startTrade(f.uid)}
                           className="p-2 bg-slate-900 rounded-lg text-slate-500 hover:text-white transition-colors"
                         >
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

          {view === 'trade' && activeTrade && (
            <TradeRoom 
              user={user}
              trade={activeTrade}
              inventory={myInventory}
              onClose={() => {
                setView('friends');
                setActiveTradeId(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const TradeRoom = ({ user, trade, inventory, onClose }: any) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(trade.proposerId === user.uid ? trade.proposerCards : trade.receiverCards);
  const [friendCards, setFriendCards] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [previewCard, setPreviewCard] = useState<any>(null);
  const isProposer = trade.proposerId === user.uid;
  const friendId = isProposer ? trade.receiverId : trade.proposerId;
  
  const myStatus = isProposer ? trade.status === 'accepted_proposer' : trade.status === 'accepted_receiver';
  const friendStatus = isProposer ? trade.status === 'accepted_receiver' : trade.status === 'accepted_proposer';

  // Fetch friend's cards when they change
  useEffect(() => {
    const fetchFriendCards = async () => {
      const fCardIds = isProposer ? trade.receiverCards : trade.proposerCards;
      if (fCardIds.length === 0) {
        setFriendCards([]);
        return;
      }
      
      const cardsData: any[] = [];
      for (const cid of fCardIds) {
        const cardRef = doc(db, `users/${friendId}/inventory`, cid);
        const cardSnap = await getDocs(query(collection(db, `users/${friendId}/inventory`), where('__name__', '==', cid)));
        // Note: Using getDocs with query instead of getDoc for better compatibility if security rules allow collection read
        if (!cardSnap.empty) {
          cardsData.push({ id: cardSnap.docs[0].id, ...cardSnap.docs[0].data() });
        }
      }
      setFriendCards(cardsData);
    };

    fetchFriendCards();
  }, [trade.proposerCards, trade.receiverCards]);

  const toggleCard = (id: string) => {
    if (myStatus) return; // Can't change after confirming
    const newSelection = selectedIds.includes(id) 
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    setSelectedIds(newSelection);
    updateTradeCards(trade.id, user.uid, isProposer, newSelection);
  };

  const handleConfirm = async () => {
    await acceptTrade(trade.id, isProposer);
  };

  const handleFinalize = async () => {
    if (trade.status === 'accepted_proposer' || trade.status === 'accepted_receiver') {
       await finalizeTrade(trade);
    }
  };

  const myCards = inventory.filter((c: any) => selectedIds.includes(c.id));
  const friendCards = []; // We would need friend's card data too, but for now we show placeholders or IDs

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-6 overflow-y-auto"
    >
      <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto w-full">
        <button onClick={onClose} className="p-3 bg-slate-900 rounded-xl text-slate-500 hover:text-white transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Sala de Intercambio</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">ID Sesión: {trade.id.substring(0,8)}</p>
        </div>
        <div className="w-12" />
      </header>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
        {/* MI LADO */}
        <div className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] relative">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-black uppercase italic text-sm">Tu Oferta</h3>
            {myStatus && <CheckCircle2 className="text-emerald-400" size={20} />}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6 min-h-[200px]">
             {myCards.length === 0 ? (
               <div className="col-span-2 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl p-10 opacity-50">
                  <ArrowLeftRight className="text-slate-700 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Añade cartas</p>
               </div>
             ) : (
               myCards.map((c: any) => (
                 <div key={c.id} className="bg-slate-950 p-2 rounded-xl border border-white/5 relative group">
                    <img src={c.images?.small} className="w-full rounded-lg" />
                    {!myStatus && (
                      <button onClick={() => toggleCard(c.id)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg">
                        <XCircle size={16} />
                      </button>
                    )}
                 </div>
               ))
             )}
          </div>

          {!myStatus && (
            <button 
              onClick={() => setShowPicker(true)}
              className="w-full bg-slate-950 border border-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-800 transition-all mb-4"
            >
              + Seleccionar Cartas
            </button>
          )}

          <button 
            disabled={myStatus || selectedIds.length === 0}
            onClick={handleConfirm}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all ${
              myStatus ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-lg shadow-cyan-500/20'
            }`}
          >
            {myStatus ? "Oferta Confirmada" : "Confirmar Mi Oferta"}
          </button>
        </div>

        {/* LADO AMIGO */}
        <div className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem]">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-black uppercase italic text-sm">Oferta de Amigo</h3>
              {friendStatus && <CheckCircle2 className="text-emerald-400" size={20} />}
           </div>
           <div className="grid grid-cols-2 gap-4 mb-6 min-h-[200px]">
              {friendCards.length === 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl p-10 opacity-50">
                   <p className="text-[10px] font-black uppercase tracking-widest">Esperando oferta...</p>
                </div>
              ) : (
                friendCards.map((c: any) => (
                  <div key={c.id} className="bg-slate-950 p-2 rounded-xl border border-white/5">
                     <img src={c.images?.small} className="w-full rounded-lg" />
                     <p className="text-[8px] text-slate-500 mt-2 text-center truncate uppercase font-bold">{c.name}</p>
                  </div>
                ))
              )}
           </div>
           {friendStatus ? (
             <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">¡Tu amigo está listo!</p>
             </div>
           ) : (
             <div className="bg-slate-950/50 border border-white/5 p-4 rounded-xl text-center">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">Aún está seleccionando...</p>
             </div>
           )}
        </div>
      </div>

      {/* FINAL STEP */}
      {myStatus && friendStatus && trade.status !== 'completed' && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-6"
        >
          <button 
            onClick={handleFinalize}
            className="w-full bg-white text-black py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4"
          >
            <Sparkles size={24} className="text-yellow-500" />
            ¡Finalizar Intercambio!
            <Sparkles size={24} className="text-yellow-500" />
          </button>
        </motion.div>
      )}

      {/* SUCCESS OVERLAY */}
      <AnimatePresence>
        {trade.status === 'completed' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] bg-cyan-500 flex flex-col items-center justify-center text-black"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              <CheckCircle2 size={120} />
            </motion.div>
            <h2 className="text-5xl font-black italic uppercase tracking-tighter mt-8">¡Trato Hecho!</h2>
            <p className="text-black/60 font-black uppercase tracking-widest mt-2">Las cartas han sido transferidas</p>
            
            <div className="mt-12 flex gap-4">
               <Sparkles className="animate-bounce" />
               <Sparkles className="animate-bounce delay-100" />
               <Sparkles className="animate-bounce delay-200" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARD PICKER OVERLAY */}
      <AnimatePresence>
        {showPicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl p-8"
          >
            <div className="max-w-4xl mx-auto h-full flex flex-col">
              <header className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-white italic uppercase">Selecciona Cartas</h2>
                <button onClick={() => setShowPicker(false)} className="p-3 bg-slate-900 rounded-xl text-white">
                  <CheckCircle2 size={24} />
                </button>
              </header>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto pb-10">
                {inventory.map((card: any) => (
                  <div 
                    key={card.id} 
                    onClick={() => toggleCard(card.id)}
                    className={`relative p-2 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedIds.includes(card.id) ? 'border-cyan-500 bg-cyan-500/10 scale-95' : 'border-white/5 bg-slate-900 hover:border-white/20'
                    }`}
                  >
                    <img src={card.images?.small} className="w-full rounded-lg" />
                    {selectedIds.includes(card.id) && (
                      <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center rounded-2xl">
                         <div className="bg-cyan-500 text-black p-2 rounded-full">
                            <CheckCircle2 size={24} />
                         </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* CARD PREVIEW OVERLAY */}
      <AnimatePresence>
        {previewCard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewCard(null)}
            className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 p-8 rounded-[3rem] max-w-sm w-full shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setPreviewCard(null)}
                className="absolute top-6 right-6 p-2 bg-slate-950 rounded-xl text-slate-500 hover:text-white"
              >
                <XCircle size={20} />
              </button>
              
              <img src={previewCard.images?.small} className="w-full rounded-2xl shadow-2xl mb-6" />
              
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">{previewCard.name}</h3>
              
              <div className="flex gap-2 mb-6">
                <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                  HP {previewCard.hp || previewCard.attributes?.hp || '???'}
                </span>
                <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-cyan-500/20">
                  {previewCard.type || 'N/A'}
                </span>
              </div>

              {previewCard.attributes?.attacks?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Ataques</p>
                  {previewCard.attributes.attacks.map((atk: string, i: number) => (
                    <div key={i} className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                       <p className="text-white text-[10px] font-medium leading-relaxed">{atk}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
