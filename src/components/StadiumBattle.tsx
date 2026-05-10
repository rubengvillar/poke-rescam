import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Heart, Zap, Shield, ChevronLeft, RefreshCw, Trophy, Target } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, getDocs, doc, updateDoc, increment, where, limit } from 'firebase/firestore';
import { CardHologram } from './CardHologram';

export const StadiumBattle = () => {
  const [gameState, setGameState] = useState<'selecting' | 'loading' | 'battle' | 'result'>('selecting');
  const [turn, setTurn] = useState<'player' | 'bot'>('player');
  const [userCard, setUserCard] = useState<any>(null);
  const [botCard, setBotCard] = useState<any>(null);
  const [playerHP, setPlayerHP] = useState(100);
  const [botHP, setBotHP] = useState(100);
  const [playerMaxHP, setPlayerMaxHP] = useState(100);
  const [botMaxHP, setBotMaxHP] = useState(100);
  const [isDefending, setIsDefending] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isChoosing, setIsChoosing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) fetchInventory(user.uid);
      else setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchInventory = async (uid: string) => {
    try {
      const snap = await getDocs(collection(db, `users/${uid}/inventory`));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInventory(list);
      if (list.length > 0) setUserCard(list[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startBattle = async () => {
    if (!userCard) return;
    setGameState('loading');
    
    const cardsRef = collection(db, 'cards');
    const randomSeed = Math.random();
    const q = query(cardsRef, where('randomSeed', '>=', randomSeed), limit(1));
    const snap = await getDocs(q);
    const rival = !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } : { name: "Rival", hp: 100, attacks: [{name: "Golpe", damage: 20}] };
    
    setBotCard(rival);
    setPlayerHP(parseInt(userCard.hp) || 100);
    setPlayerMaxHP(parseInt(userCard.hp) || 100);
    setBotHP(parseInt(rival.hp) || 100);
    setBotMaxHP(parseInt(rival.hp) || 100);
    setLogs([`¡Comienza el duelo entre ${userCard.name} y ${rival.name}!`]);
    setGameState('battle');
    setTurn('player');
  };

  const executeAction = (type: 'attack' | 'defend', attackIdx: number = 0) => {
    if (turn !== 'player' || gameState !== 'battle') return;

    let damage = 0;
    let logMsg = "";

    if (type === 'attack') {
      const atk = userCard.attacks?.[attackIdx] || { name: 'Ataque Base', damage: 20 };
      damage = parseInt(atk.damage) || 20;
      logMsg = `¡${userCard.name} usa ${atk.name} causando ${damage} de daño!`;
      setBotHP(prev => Math.max(0, prev - damage));
    } else {
      setIsDefending(true);
      logMsg = `¡${userCard.name} se pone en guardia! Reducirá el próximo daño.`;
    }

    setLogs(prev => [logMsg, ...prev]);
    
    // Check if bot died
    if (type === 'attack' && botHP - damage <= 0) {
      setTimeout(() => endBattle('user'), 1000);
    } else {
      setTurn('bot');
      setTimeout(botTurn, 1500);
    }
  };

  const botTurn = () => {
    if (gameState !== 'battle') return;

    const botAtk = botCard.attacks?.[0] || { name: 'Ataque Rival', damage: 20 };
    let damage = parseInt(botAtk.damage) || 15;
    
    if (isDefending) {
      damage = Math.floor(damage * 0.5);
      setIsDefending(false);
    }

    setPlayerHP(prev => Math.max(0, prev - damage));
    setLogs(prev => [`¡${botCard.name} usa ${botAtk.name} causando ${damage} de daño!`, ...prev]);

    if (playerHP - damage <= 0) {
      setTimeout(() => endBattle('bot'), 1000);
    } else {
      setTurn('player');
    }
  };

  const endBattle = async (winner: 'user' | 'bot') => {
    setGameState('result');
    if (winner === 'user' && auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        coins: increment(250),
        xp: increment(100)
      });
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950"><RefreshCw className="animate-spin text-cyan-500" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center">
       <header className="absolute top-8 left-8">
          <a href="/games" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Salir del Estadio</span>
          </a>
       </header>

       <AnimatePresence mode="wait">
         {gameState === 'selecting' && (
           <motion.div key="sel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <h2 className="text-5xl font-black text-white italic uppercase mb-12 tracking-tighter">Stadium Battle</h2>
              <div className="flex flex-col items-center gap-8 bg-slate-900/50 p-12 rounded-[3rem] border border-white/5">
                 <div className="relative group">
                    <CardHologram card={userCard} />
                    <button onClick={() => setIsChoosing(true)} className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-2xl hover:bg-cyan-400 transition-colors">Elegir Pokémon</button>
                 </div>
                 <button onClick={startBattle} disabled={!userCard} className="mt-8 bg-cyan-500 text-black px-12 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] disabled:opacity-50">¡Entrar a Combatir!</button>
              </div>

              {/* Inventory Modal */}
              <AnimatePresence>
                {isChoosing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-50 p-12 overflow-y-auto">
                    <div className="flex justify-between items-center mb-12">
                      <h3 className="text-3xl font-black text-white uppercase italic">Selecciona tu Guerrero</h3>
                      <button onClick={() => setIsChoosing(false)} className="text-slate-500 hover:text-white font-black uppercase text-xs">Cerrar</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
                      {inventory.map(card => (
                        <div key={card.id} onClick={() => { setUserCard(card); setIsChoosing(false); }} className="cursor-pointer group hover:scale-105 transition-transform">
                           <img src={card.images?.small} className="w-full rounded-2xl border-2 border-slate-800 group-hover:border-cyan-500 transition-all shadow-xl" />
                           <p className="mt-2 text-[10px] font-black text-white uppercase truncate">{card.name}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </motion.div>
         )}

         {gameState === 'battle' && (
           <motion.div key="bat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-7xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                 {/* PLAYER SIDE */}
                 <div className="flex flex-col items-center gap-6">
                    <div className="w-full flex justify-between items-center px-4">
                       <span className="text-white font-black italic">{userCard.name}</span>
                       <span className="text-cyan-400 font-bold">{playerHP} / {playerMaxHP}</span>
                    </div>
                    <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
                       <motion.div className="bg-emerald-500 h-full" animate={{ width: `${(playerHP / playerMaxHP) * 100}%` }} />
                    </div>
                    <CardHologram card={userCard} />
                 </div>

                 {/* CONTROLS & LOGS */}
                 <div className="flex flex-col gap-6">
                    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-[2rem] p-6 h-64 overflow-y-auto flex flex-col gap-3 font-mono text-[10px]">
                       {logs.map((log, i) => (
                         <div key={i} className={`pl-3 py-1 border-l-2 ${i === 0 ? 'text-white border-cyan-500 bg-cyan-500/5' : 'text-slate-500 border-slate-800'}`}>
                           {log}
                         </div>
                       ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       {userCard.attacks?.slice(0, 2).map((atk: any, i: number) => (
                         <button 
                           key={i}
                           disabled={turn !== 'player'}
                           onClick={() => executeAction('attack', i)}
                           className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left hover:border-cyan-500 hover:bg-cyan-500/5 transition-all group disabled:opacity-50"
                         >
                            <p className="text-[10px] font-black text-slate-500 uppercase mb-1 group-hover:text-cyan-400">Ataque {i+1}</p>
                            <p className="text-white font-bold truncate">{atk.name}</p>
                            <p className="text-cyan-400 font-black text-xs">{atk.damage || '20'} DMG</p>
                         </button>
                       ))}
                       <button 
                         disabled={turn !== 'player'}
                         onClick={() => executeAction('defend')}
                         className="col-span-2 bg-slate-800 p-4 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50"
                       >
                          <Shield size={18} /> Defender
                       </button>
                    </div>
                    
                    {turn === 'bot' && (
                       <div className="text-center animate-bounce text-red-400 font-black uppercase text-xs tracking-widest">Turno del Rival...</div>
                    )}
                 </div>

                 {/* RIVAL SIDE */}
                 <div className="flex flex-col items-center gap-6">
                    <div className="w-full flex justify-between items-center px-4">
                       <span className="text-white font-black italic">{botCard.name}</span>
                       <span className="text-red-400 font-bold">{botHP} / {botMaxHP}</span>
                    </div>
                    <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
                       <motion.div className="bg-red-500 h-full" animate={{ width: `${(botHP / botMaxHP) * 100}%` }} />
                    </div>
                    <CardHologram card={botCard} />
                 </div>
              </div>
           </motion.div>
         )}

         {gameState === 'result' && (
           <motion.div key="res" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-slate-900 p-16 rounded-[4rem] border border-slate-800 shadow-2xl">
              <Trophy className="text-yellow-500 mx-auto mb-6" size={80} />
              <h2 className="text-5xl font-black text-white italic uppercase mb-2">¡Combate Finalizado!</h2>
              <p className="text-slate-500 mb-8 font-bold">Has demostrado ser un gran entrenador.</p>
              <div className="bg-yellow-500 text-black px-12 py-4 rounded-2xl font-black mb-12 inline-block">+250 MONEDAS</div>
              <button onClick={() => setGameState('selecting')} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-all">Volver al Lobby</button>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};
