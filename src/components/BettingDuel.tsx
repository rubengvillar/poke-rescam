import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Users, Shield, Zap, ChevronLeft, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, collection, addDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { CardHologram } from './CardHologram';

export const BettingDuel = () => {
  const [duelId, setDuelId] = useState<string | null>(null);
  const [duelData, setDuelData] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isChoosing, setIsChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    if (!auth.currentUser) return;
    const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/inventory`));
    setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const createDuel = async () => {
    const newDuelId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const duelRef = doc(db, 'duels', newDuelId);
    await setDoc(duelRef, {
      id: newDuelId,
      status: 'waiting',
      player1: {
        id: auth.currentUser?.uid,
        name: auth.currentUser?.displayName,
        card: null,
        ready: false
      },
      player2: null,
      createdAt: new Date().toISOString()
    });
    setDuelId(newDuelId);
    subscribeToDuel(newDuelId);
  };

  const joinDuel = async (id: string) => {
    const duelRef = doc(db, 'duels', id);
    const snap = await getDoc(duelRef);
    if (!snap.exists()) return setError("El duelo no existe.");
    
    await updateDoc(duelRef, {
      status: 'ready',
      player2: {
        id: auth.currentUser?.uid,
        name: auth.currentUser?.displayName,
        card: null,
        ready: false
      }
    });
    setDuelId(id);
    subscribeToDuel(id);
  };

  const subscribeToDuel = (id: string) => {
    onSnapshot(doc(db, 'duels', id), (snap) => {
      const data = snap.data();
      setDuelData(data);
      
      if (data?.status === 'finished') {
        handleDuelResult(data);
      }
    });
  };

  const confirmSelection = async () => {
    if (!selectedCard || !duelId) return;
    const duelRef = doc(db, 'duels', duelId);
    const playerKey = duelData.player1.id === auth.currentUser?.uid ? 'player1' : 'player2';
    
    await updateDoc(duelRef, {
      [`${playerKey}.card`]: selectedCard,
      [`${playerKey}.ready`]: true
    });

    // Check if both are ready to resolve
    const updatedSnap = await getDoc(duelRef);
    const d = updatedSnap.data();
    if (d?.player1.ready && d?.player2.ready) {
      resolveDuel(d);
    }
  };

  const resolveDuel = async (d: any) => {
    const p1Val = parseInt(d.player1.card.hp) || 50;
    const p2Val = parseInt(d.player2.card.hp) || 50;
    
    let winnerId = '';
    if (p1Val > p2Val) winnerId = d.player1.id;
    else if (p2Val > p1Val) winnerId = d.player2.id;
    else winnerId = 'draw';

    await updateDoc(doc(db, 'duels', d.id), {
      status: 'finished',
      winner: winnerId
    });
  };

  const handleDuelResult = async (d: any) => {
    // Logic to transfer card if applicable
    if (d.winner !== 'draw' && d.winner !== auth.currentUser?.uid) {
       // I lost! Transfer my card to winner
       const cardToTransfer = selectedCard;
       const winnerId = d.winner;
       
       // Delete from mine
       await deleteDoc(doc(db, `users/${auth.currentUser?.uid}/inventory`, cardToTransfer.id));
       // Add to winner's (this would normally be a Cloud Function for security)
       await addDoc(collection(db, `users/${winnerId}/inventory`), {
         ...cardToTransfer,
         wonAt: new Date().toISOString()
       });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center">
      <header className="absolute top-8 left-8">
        <a href="/games" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Salir</span>
        </a>
      </header>

      {!duelId ? (
        <div className="text-center max-w-sm w-full">
          <Swords className="text-red-500 mx-auto mb-6" size={64} />
          <h2 className="text-4xl font-black text-white italic uppercase mb-8">Duelo de Apuestas</h2>
          <div className="flex flex-col gap-4">
             <button onClick={createDuel} className="bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors">Crear Duelo</button>
             <div className="flex gap-2">
                <input id="duelCode" placeholder="CÓDIGO" className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 text-white font-black uppercase text-center" />
                <button onClick={() => joinDuel((document.getElementById('duelCode') as HTMLInputElement).value)} className="bg-slate-800 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-700 transition-colors">Unirse</button>
             </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-6xl">
           <div className="flex justify-between items-center mb-12">
              <div className="text-left">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sala de Duelo</p>
                 <h3 className="text-2xl font-black text-cyan-400 italic">#{duelId}</h3>
              </div>
              <div className="bg-slate-900 px-6 py-2 rounded-xl border border-slate-800">
                 <p className="text-[10px] font-black text-white uppercase tracking-widest">{duelData?.status === 'waiting' ? 'Esperando Oponente...' : 'Combate en Curso'}</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
              {/* My Side */}
              <div className="flex flex-col items-center gap-6">
                 <p className="text-white font-black uppercase italic">Tú</p>
                 <CardHologram card={selectedCard} />
                 <button onClick={() => setIsChoosing(true)} className="text-xs font-black text-slate-500 uppercase hover:text-white transition-colors">Seleccionar Carta</button>
                 {selectedCard && !duelData?.[duelData.player1.id === auth.currentUser?.uid ? 'player1' : 'player2'].ready && (
                   <button onClick={confirmSelection} className="bg-cyan-500 text-black px-8 py-3 rounded-xl font-black uppercase text-xs">Confirmar Apuesta</button>
                 )}
              </div>

              <div className="text-center flex flex-col items-center gap-4">
                 <Swords size={48} className="text-slate-800" />
                 {duelData?.status === 'finished' && (
                    <div className="bg-white text-black p-8 rounded-[2rem] shadow-2xl">
                       <h4 className="text-3xl font-black uppercase italic mb-2">
                          {duelData.winner === auth.currentUser?.uid ? '¡Ganaste!' : duelData.winner === 'draw' ? 'Empate' : 'Perdiste'}
                       </h4>
                       <p className="text-xs text-slate-500 mb-6">{duelData.winner === auth.currentUser?.uid ? 'Has ganado la carta del rival.' : 'Has perdido tu carta.'}</p>
                       <button onClick={() => window.location.reload()} className="bg-slate-950 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase">Finalizar</button>
                    </div>
                 )}
              </div>

              {/* Rival Side */}
              <div className="flex flex-col items-center gap-6 opacity-50">
                 <p className="text-white font-black uppercase italic">{duelData?.player2 ? (duelData.player1.id === auth.currentUser?.uid ? duelData.player2.name : duelData.player1.name) : 'Rival'}</p>
                 <div className="w-64 h-[22rem] bg-slate-900 rounded-[1rem] border-2 border-dashed border-slate-800 flex items-center justify-center">
                    {duelData?.player2 ? (
                      <div className="text-center">
                         <CheckCircle size={48} className={duelData.player1.id === auth.currentUser?.uid ? (duelData.player2.ready ? 'text-emerald-500' : 'text-slate-700') : (duelData.player1.ready ? 'text-emerald-500' : 'text-slate-700')} />
                         <p className="text-[10px] font-black text-slate-500 uppercase mt-4 tracking-widest">{duelData.player1.id === auth.currentUser?.uid ? (duelData.player2.ready ? 'LISTO' : 'ELIGIENDO...') : (duelData.player1.ready ? 'LISTO' : 'ELIGIENDO...')}</p>
                      </div>
                    ) : (
                      <RefreshCw className="animate-spin text-slate-700" size={48} />
                    )}
                 </div>
              </div>
           </div>

           {/* Inventory Selection Modal */}
           <AnimatePresence>
             {isChoosing && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-50 p-12">
                  <div className="flex justify-between items-center mb-12">
                     <h3 className="text-2xl font-black text-white uppercase italic">Apuesta una de tus cartas</h3>
                     <button onClick={() => setIsChoosing(false)} className="text-slate-500 hover:text-white font-black uppercase text-xs">Cerrar</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 h-[70vh] overflow-y-auto">
                     {inventory.map(card => (
                       <div key={card.id} onClick={() => { setSelectedCard(card); setIsChoosing(false); }} className="cursor-pointer hover:scale-105 transition-transform group">
                          <img src={card.images?.small} className="w-full rounded-lg border border-slate-800 group-hover:border-red-500 transition-colors" />
                          <p className="mt-2 text-[8px] font-black text-white uppercase truncate">{card.name}</p>
                       </div>
                     ))}
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      )}
    </div>
  );
};
