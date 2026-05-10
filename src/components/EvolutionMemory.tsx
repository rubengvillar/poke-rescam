import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, RefreshCw, Trophy, ChevronLeft, Sparkles, Star } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, getDocs, limit, doc, updateDoc, increment, where } from 'firebase/firestore';

export const EvolutionMemory = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [solved, setSolved] = useState<number[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'result'>('loading');

  const fetchEvolutionPairs = async () => {
    setGameState('loading');
    const cardsRef = collection(db, 'cards');
    
    // Fetch a larger sample to find evolutions locally
    const randomVal = Math.random();
    const q = query(cardsRef, where('randomSeed', '>=', randomVal), limit(40));
    const snap = await getDocs(q);
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

    // Fallback: If not enough evolution pairs found, use duplicates for remaining slots
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
  };

  useEffect(() => {
    fetchEvolutionPairs();
  }, []);

  const handleClick = (uniqueIndex: number) => {
    if (disabled || solved.includes(uniqueIndex) || flipped.includes(uniqueIndex)) return;

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
        setTimeout(() => {
          setFlipped([]);
          setDisabled(false);
        }, 1200);
      }
    }
  };

  useEffect(() => {
    if (solved.length === 8 && cards.length > 0) {
      setTimeout(() => setGameState('result'), 600);
      rewardUser();
    }
  }, [solved]);

  const rewardUser = async () => {
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        coins: increment(200),
        xp: increment(80)
      });
    }
  };

  if (gameState === 'loading') return <div className="h-screen flex items-center justify-center bg-slate-950 text-cyan-500 font-black italic animate-pulse">BUSCANDO EVOLUCIONES...</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center">
      <header className="absolute top-8 left-8">
        <a href="/games" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Salir</span>
        </a>
      </header>

      <div className="text-center mb-12">
        <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-2">Memoria Evolutiva</h2>
        <div className="flex items-center justify-center gap-2 text-purple-400 font-black uppercase text-[10px] tracking-[0.3em]">
           <Star size={12} /> Empareja Base con Evolución <Star size={12} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'playing' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl w-full" style={{ perspective: '1200px' }}>
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
          </div>
        ) : (
          <motion.div key="res" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-800 p-16 rounded-[4rem] text-center max-w-md w-full shadow-2xl">
            <Trophy className="text-yellow-500 mx-auto mb-6" size={80} />
            <h2 className="text-5xl font-black text-white italic uppercase mb-2 leading-tight">¡Maestro de la Evolución!</h2>
            <p className="text-slate-500 mb-8 font-bold">Has demostrado un conocimiento superior de las líneas evolutivas.</p>
            <div className="bg-yellow-500 text-black px-10 py-4 rounded-2xl font-black mb-12 inline-block shadow-xl">+200 MONEDAS</div>
            <button onClick={fetchEvolutionPairs} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all shadow-2xl">Jugar otra vez</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
