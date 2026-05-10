import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Heart, Trophy, XCircle, ChevronLeft, RefreshCw, Coins } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, increment, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { CardHologram } from './CardHologram';

const ATTRIBUTES = [
  { id: 'hp', name: 'Vida', icon: <Heart size={18} />, color: 'text-red-400' },
  { id: 'attack', name: 'Ataque', icon: <Zap size={18} />, color: 'text-yellow-400' },
  { id: 'defense', name: 'Defensa', icon: <Shield size={18} />, color: 'text-blue-400' },
];

export const AttributeBattle = () => {
  const [gameState, setGameState] = useState<'selecting' | 'battling' | 'result'>('selecting');
  const [userCard, setUserCard] = useState<any>(null);
  const [botCard, setBotCard] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedAttr, setSelectedAttr] = useState<string | null>(null);
  const [winner, setWinner] = useState<'user' | 'bot' | 'draw' | null>(null);
  const [coinsWon, setCoinsWon] = useState(0);
  const [isChoosing, setIsChoosing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchInventory(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchInventory = async (uid: string) => {
    try {
      const q = query(collection(db, `users/${uid}/inventory`));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInventory(list);
      if (list.length > 0) setUserCard(list[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateBotCard = async () => {
    const cardsRef = collection(db, 'cards');
    const randomSeed = Math.random();
    const q = query(cardsRef, where('randomSeed', '>=', randomSeed), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    return { name: "Mewtwo", hp: 150, attack: 110, defense: 90, images: { small: "https://images.pokemontcg.io/base1/10_hires.png" } };
  };

  const startBattle = async (attrId: string) => {
    if (!userCard) return;
    setSelectedAttr(attrId);
    setGameState('battling');
    
    const bot = await generateBotCard();
    setBotCard(bot);

    setTimeout(() => {
      const userVal = parseInt(userCard[attrId]) || 50;
      const botVal = parseInt(bot[attrId]) || 50;

      if (userVal > botVal) {
        setWinner('user');
        const prize = 100;
        setCoinsWon(prize);
        updateUserStats(prize);
      } else if (userVal < botVal) {
        setWinner('bot');
      } else {
        setWinner('draw');
      }
      setGameState('result');
    }, 2500);
  };

  const updateUserStats = async (prize: number) => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      coins: increment(prize),
      xp: increment(50)
    });
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-cyan-500" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
       <header className="absolute top-8 left-8">
          <a href="/games" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Salir</span>
          </a>
       </header>

      <AnimatePresence mode="wait">
        {gameState === 'selecting' && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center w-full max-w-6xl">
            <h2 className="text-4xl font-black text-white italic uppercase mb-12">Batalla de Atributos</h2>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-16">
              <div className="flex flex-col items-center gap-6">
                <CardHologram card={userCard} />
                <button 
                  onClick={() => setIsChoosing(true)}
                  className="bg-slate-900 border border-slate-800 px-6 py-2 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors"
                >
                  Cambiar Carta
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mb-4">Elige Estadística de Combate</p>
                {ATTRIBUTES.map((attr) => (
                  <button
                    key={attr.id}
                    disabled={!userCard}
                    onClick={() => startBattle(attr.id)}
                    className="flex items-center justify-between w-72 bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-cyan-500 hover:bg-cyan-500/5 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-slate-950 rounded-lg ${attr.color}`}>{attr.icon}</div>
                      <span className="text-slate-300 font-bold uppercase text-xs">{attr.name}</span>
                    </div>
                    <span className="text-white font-black italic">{userCard?.[attr.id] || '??'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* INVENTORY SELECTOR MODAL */}
            <AnimatePresence>
              {isChoosing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-50 p-12">
                   <div className="flex justify-between items-center mb-12">
                      <h3 className="text-2xl font-black text-white uppercase italic">Selecciona tu Pokémon</h3>
                      <button onClick={() => setIsChoosing(false)} className="text-slate-500 hover:text-white font-black uppercase text-xs">Cerrar</button>
                   </div>
                   <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 h-[70vh] overflow-y-auto pr-4">
                      {inventory.length === 0 ? (
                        <div className="col-span-full text-center py-20 text-slate-500 font-bold uppercase">No tienes cartas en tu inventario</div>
                      ) : inventory.map(card => (
                        <div key={card.id} onClick={() => { setUserCard(card); setIsChoosing(false); }} className="cursor-pointer hover:scale-105 transition-transform">
                           <img src={card.images?.small} className="w-full rounded-lg border border-slate-800" />
                           <p className="mt-2 text-[8px] font-black text-white uppercase truncate">{card.name}</p>
                        </div>
                      ))}
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {gameState === 'battling' && (
          <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-12">
            <div className="flex flex-col md:flex-row items-center gap-20">
               <motion.div animate={{ x: [0, 15, 0] }} className="relative z-10">
                  <CardHologram card={userCard} />
                  <div className="absolute -top-4 -left-4 bg-cyan-500 text-black font-black p-2 rounded-lg text-[10px] z-20">TU SELECCIÓN</div>
               </motion.div>

               <div className="text-6xl font-black text-slate-800 italic">VS</div>

               <motion.div animate={{ x: [0, -15, 0] }} className="relative z-10">
                  {botCard ? (
                    <CardHologram card={botCard} />
                  ) : (
                    <div className="w-64 h-[22rem] bg-slate-900 rounded-[1rem] border-2 border-dashed border-slate-800 flex items-center justify-center">
                      <RefreshCw className="text-slate-700 animate-spin" size={48} />
                    </div>
                  )}
                  <div className="absolute -top-4 -right-4 bg-red-500 text-white font-black p-2 rounded-lg text-[10px] z-20">RIVAL</div>
               </motion.div>
            </div>
            <p className="text-cyan-400 font-black uppercase tracking-[0.4em] animate-pulse">Analizando {selectedAttr?.toUpperCase()}...</p>
          </motion.div>
        )}

        {gameState === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-slate-900 border border-slate-800 p-12 rounded-[3rem] shadow-2xl max-w-lg">
            {winner === 'user' ? (
              <>
                <Trophy className="text-yellow-500 mx-auto mb-6" size={64} />
                <h2 className="text-5xl font-black text-white italic uppercase mb-2">¡VICTORIA!</h2>
                <p className="text-slate-400 mb-8 text-sm">Tu {userCard.name} ({userCard[selectedAttr!]}) superó al rival ({botCard[selectedAttr!]}).</p>
                <div className="bg-yellow-500 text-black px-8 py-3 rounded-2xl font-black mb-8 inline-block">+{coinsWon} MONEDAS</div>
              </>
            ) : winner === 'bot' ? (
              <>
                <XCircle className="text-red-500 mx-auto mb-6" size={64} />
                <h2 className="text-5xl font-black text-white italic uppercase mb-2">DERROTA</h2>
                <p className="text-slate-400 mb-8 text-sm">El rival ({botCard[selectedAttr!]}) fue más fuerte que tu {userCard.name} ({userCard[selectedAttr!]}).</p>
              </>
            ) : (
              <h2 className="text-5xl font-black text-white italic uppercase mb-2">EMPATE</h2>
            )}
            <button onClick={() => setGameState('selecting')} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors">Volver a Jugar</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
