import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, RefreshCw, Trophy, ChevronLeft, Sparkles, Star, Heart, Timer, Ghost, XCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, getDocs, limit, doc, updateDoc, increment, where } from 'firebase/firestore';

export const EvolutionMemory = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [solved, setSolved] = useState<number[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'result'>('loading');
  
  // New States for Time and Lives
  const [timeLeft, setTimeLeft] = useState(60);
  const [lives, setLives] = useState(5);
  const [endReason, setEndReason] = useState<'win' | 'lives' | 'time'>('win');
  const [trainerData, setTrainerData] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEvolutionPairs = async () => {
    setGameState('loading');
    setTimeLeft(60);
    setLives(5);
    setEndReason('win');
    
    const cardsRef = collection(db, 'cards');
    
    try {
      // Fetch a larger sample to find evolutions locally
      const randomVal = Math.random();
      let q = query(cardsRef, where('randomSeed', '>=', randomVal), limit(40));
      let snap = await getDocs(q);
      
      if (snap.empty) {
        q = query(cardsRef, limit(40));
        snap = await getDocs(q);
      }
      
      const pool = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const pairs: any[] = [];
      const usedIds = new Set();

      // Try to find evolution relationships
      for (const card of pool) {
        if (pairs.length >= 8) break;
        if (usedIds.has(card.id)) continue;

        const evolution = pool.find(c => 
          (c.evolveFrom === card.name || card.evolveFrom === c.name) && 
          !usedIds.has(c.id)
        );

        if (evolution) {
          pairs.push({ ...card, matchId: card.id + evolution.id });
          pairs.push({ ...evolution, matchId: card.id + evolution.id });
          usedIds.add(card.id);
          usedIds.add(evolution.id);
        }
      }

      // Fallback
      if (pairs.length < 8) {
        for (const card of pool) {
          if (pairs.length >= 8) break;
          if (usedIds.has(card.id)) continue;
          
          pairs.push({ ...card, matchId: 'dup' + card.id });
          pairs.push({ ...card, matchId: 'dup' + card.id });
          usedIds.add(card.id);
        }
      }

      const shuffled = pairs
        .sort(() => Math.random() - 0.5)
        .map((c, index) => ({ ...c, uniqueId: index }));

      setCards(shuffled);
      setFlipped([]);
      setSolved([]);
      setGameState('playing');
    } catch (err) {
      console.error("Error fetching cards:", err);
    }
  };

  // Timer Effect
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      handleGameOver('time');
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, timeLeft]);

  const handleGameOver = (reason: 'win' | 'lives' | 'time') => {
    if (timerRef.current) clearInterval(timerRef.current);
    setEndReason(reason);
    setGameState('result');
    if (reason === 'win') rewardUser();
  };

  useEffect(() => {
    fetchEvolutionPairs();
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const snap = await getDocs(query(collection(db, 'users'), where('uid', '==', u.uid)));
        if (!snap.empty) setTrainerData(snap.docs[0].data());
      }
    });
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      unsubscribe();
    };
  }, []);

  const handleClick = (uniqueIndex: number) => {
    if (disabled || solved.includes(uniqueIndex) || flipped.includes(uniqueIndex) || timeLeft === 0 || lives === 0) return;

    if (flipped.length === 0) {
      setFlipped([uniqueIndex]);
    } else if (flipped.length === 1) {
      const firstIndex = flipped[0];
      setFlipped([firstIndex, uniqueIndex]);
      setDisabled(true);

      // Check for evolution match (same matchId)
      if (cards[firstIndex].matchId === cards[uniqueIndex].matchId) {
        setSolved([...solved, firstIndex, uniqueIndex]);
        setFlipped([]);
        setDisabled(false);
      } else {
        // Lose a life on error
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives === 0) {
            setTimeout(() => handleGameOver('lives'), 600);
          }
          return newLives;
        });

        setTimeout(() => {
          setFlipped([]);
          setDisabled(false);
        }, 1200);
      }
    }
  };

  useEffect(() => {
    if (solved.length === 8 && cards.length > 0) {
      setTimeout(() => handleGameOver('win'), 600);
    }
  }, [solved]);

  const rewardUser = async () => {
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const xpGained = 80;
      const coinsGained = 200;

      let newXP = (trainerData?.xp || 0) + xpGained;
      let newLevel = trainerData?.level || 1;
      let newXPToNext = trainerData?.xpToNext || 1000;
      let newPoints = trainerData?.pointsAvailable || 0;
      let levelUps = 0;

      while (newXP >= newXPToNext) {
        newXP -= newXPToNext;
        newLevel++;
        newXPToNext = Math.floor(newXPToNext * 1.2);
        newPoints += 5;
        levelUps++;
      }

      await updateDoc(userRef, {
        coins: increment(coinsGained + (levelUps > 0 ? 500 : 0)),
        xp: newXP,
        level: newLevel,
        xpToNext: newXPToNext,
        pointsAvailable: newPoints
      });
    }
  };

  if (gameState === 'loading') return <div className="h-screen flex items-center justify-center bg-slate-950 text-cyan-500 font-black italic animate-pulse">BUSCANDO EVOLUCIONES...</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center relative overflow-hidden">
      {/* HUD Bar */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-8 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none"
      >
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-8 py-3 rounded-full flex items-center gap-12 shadow-[0_0_30px_rgba(0,0,0,0.5)] pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${timeLeft < 10 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-cyan-500/10 text-cyan-400'}`}>
              <Timer size={18} />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Tiempo</p>
              <p className={`text-xl font-black italic tabular-nums leading-none ${timeLeft < 10 ? 'text-red-500' : 'text-white'}`}>
                {timeLeft}s
              </p>
            </div>
          </div>

          <div className="w-px h-8 bg-white/5" />

          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${lives === 1 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-rose-500/10 text-rose-400'}`}>
              <Heart size={18} fill={lives > 0 ? "currentColor" : "none"} />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Vidas</p>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div 
                    key={i}
                    animate={{ scale: i < lives ? 1 : 0.8, opacity: i < lives ? 1 : 0.2 }}
                    className={`w-2 h-2 rounded-full ${i < lives ? 'bg-rose-500' : 'bg-slate-700'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <header className="absolute top-8 left-8 z-[60]">
        <a href="/games" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Salir</span>
        </a>
      </header>

      <div className="text-center mb-12 mt-20">
        <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-2">Memoria Evolutiva</h2>
        <div className="flex items-center justify-center gap-2 text-purple-400 font-black uppercase text-[10px] tracking-[0.3em]">
           <Star size={12} /> Empareja Base con Evolución <Star size={12} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'playing' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl w-full" 
            style={{ perspective: '1200px' }}
          >
            {cards.map((card, i) => (
              <motion.div
                key={card.uniqueId}
                whileHover={{ scale: 1.05 }}
                className="aspect-[3/4] cursor-pointer relative"
                onClick={() => handleClick(i)}
              >
                <motion.div 
                  className="w-full h-full relative"
                  initial={false}
                  animate={{ rotateY: (flipped.includes(i) || solved.includes(i)) ? 180 : 0 }}
                  transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* FRONT (HIDDEN/COVER) */}
                  <div 
                    className="absolute inset-0 bg-slate-900 border-2 border-slate-800 rounded-2xl flex items-center justify-center shadow-2xl"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', zIndex: (flipped.includes(i) || solved.includes(i)) ? 0 : 1 }}
                  >
                    <div className="flex flex-col items-center gap-4">
                       <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                          <Brain className="text-purple-500/50" size={32} />
                       </div>
                       <div className="text-[8px] font-black text-slate-700 tracking-[0.5em] uppercase">PokeMemory</div>
                    </div>
                  </div>

                  {/* BACK (REVEALED/CARD) */}
                  <div 
                    className="absolute inset-0 bg-white rounded-2xl overflow-hidden shadow-2xl"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', zIndex: (flipped.includes(i) || solved.includes(i)) ? 1 : 0 }}
                  >
                    <img src={card.images?.small} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-2">
                       <p className="text-[8px] font-black text-white uppercase truncate text-center">{card.name}</p>
                       <p className="text-[6px] font-bold text-slate-400 uppercase text-center">{card.stage}</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="res" 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-slate-900 border border-slate-800 p-16 rounded-[4rem] text-center max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            {endReason === 'win' ? (
              <>
                <Trophy className="text-yellow-500 mx-auto mb-6" size={80} />
                <h2 className="text-5xl font-black text-white italic uppercase mb-2 leading-tight">¡Maestro de la Evolución!</h2>
                <p className="text-slate-500 mb-8 font-bold">Has demostrado un conocimiento superior de las líneas evolutivas.</p>
                <div className="bg-yellow-500 text-black px-10 py-4 rounded-2xl font-black mb-12 inline-block shadow-xl">+200 MONEDAS</div>
              </>
            ) : endReason === 'lives' ? (
              <>
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                  <XCircle className="text-red-500" size={50} />
                </div>
                <h2 className="text-5xl font-black text-white italic uppercase mb-2 leading-tight text-red-500">Sin Vidas</h2>
                <p className="text-slate-500 mb-12 font-bold uppercase tracking-widest text-xs">Demasiados errores de emparejamiento.</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/20">
                  <Ghost className="text-orange-500" size={50} />
                </div>
                <h2 className="text-5xl font-black text-white italic uppercase mb-2 leading-tight text-orange-500">Tiempo Agotado</h2>
                <p className="text-slate-500 mb-12 font-bold uppercase tracking-widest text-xs">¡Tienes que ser más rápido!</p>
              </>
            )}
            
            <button 
              onClick={fetchEvolutionPairs} 
              className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all shadow-2xl"
            >
              Intentar de nuevo
            </button>
            
            <a 
              href="/games" 
              className="block mt-6 text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-colors"
            >
              Volver al Menú
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
