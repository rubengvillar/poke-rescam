import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Timer, Trophy, ChevronLeft, Zap, Flame, Droplets, Leaf, Skull, Mountain, Ghost, Box, HelpCircle, Heart, XCircle, Sparkles } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, increment, collection, getDocs, limit, query, where } from 'firebase/firestore';

const TYPES = [
  { id: 'fire', name: 'Fuego', color: 'bg-red-500', icon: <Flame size={14}/> },
  { id: 'water', name: 'Agua', color: 'bg-blue-500', icon: <Droplets size={14}/> },
  { id: 'grass', name: 'Planta', color: 'bg-green-500', icon: <Leaf size={14}/> },
  { id: 'lightning', name: 'Rayo', color: 'bg-yellow-500', icon: <Zap size={14}/> },
  { id: 'psychic', name: 'Psíquico', color: 'bg-purple-500', icon: <Ghost size={14}/> },
  { id: 'fighting', name: 'Lucha', color: 'bg-orange-700', icon: <Mountain size={14}/> },
  { id: 'darkness', name: 'Oscuridad', color: 'bg-slate-800', icon: <Skull size={14}/> },
  { id: 'metal', name: 'Metal', color: 'bg-zinc-500', icon: <Box size={14}/> },
  { id: 'colorless', name: 'Normal', color: 'bg-slate-400', icon: <HelpCircle size={14}/> },
];

export const TypeQuiz = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'result'>('loading');
  const [endReason, setEndReason] = useState<'win' | 'lives' | 'time'>('win');
  const [isAttacking, setIsAttacking] = useState(false);
  const [trainerData, setTrainerData] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQuestions = async () => {
    setGameState('loading');
    setTimeLeft(20);
    setLives(3);
    setScore(0);
    setCurrentIdx(0);
    setEndReason('win');

    const cardsRef = collection(db, 'cards');
    const randomVal = Math.random();
    // Fetch more questions so they can fail and still reach 10 correct
    const q = query(cardsRef, where('randomSeed', '>=', randomVal), limit(50));
    const snap = await getDocs(q);
    
    const fetched = snap.docs.map(d => ({ 
      id: d.id, 
      name: d.data().name, 
      image: d.data().images?.small, 
      animatedSprite: d.data().animatedSprite,
      answer: d.data().types?.[0] || 'colorless'
    })).filter(c => c.animatedSprite);
    
    setQuestions(fetched.sort(() => Math.random() - 0.5).slice(0, 20));
    setGameState('playing');
  };

  useEffect(() => {
    fetchQuestions();
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

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      handleGameOver('time');
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, timeLeft]);

  const handleGameOver = (reason: 'win' | 'lives' | 'time') => {
    if (timerRef.current) clearInterval(timerRef.current);
    setEndReason(reason);
    setGameState('result');
    if (reason === 'win') finishGame();
  };

  const handleAnswer = (typeId: string) => {
    if (gameState !== 'playing' || lives === 0) return;

    const currentQuestion = questions[currentIdx];
    const isCorrect = currentQuestion.answer.toLowerCase() === typeId.toLowerCase();

    if (isCorrect) {
      const newScore = score + 1;
      setScore(newScore);
      setIsAttacking(true);
      setTimeout(() => setIsAttacking(false), 500);
      
      if (newScore === 10) {
        setTimeout(() => handleGameOver('win'), 600);
        return;
      }
    } else {
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives === 0) {
          setTimeout(() => handleGameOver('lives'), 600);
        }
        return newLives;
      });
    }
    
    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(prev => prev + 1);
      } else {
        // If they finished all questions but didn't reach 10
        handleGameOver('time'); 
      }
    }, isCorrect ? 600 : 300);
  };

  const finishGame = async () => {
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const xpGained = score * 15;
      const coinsGained = score * 25;

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

  if (gameState === 'loading') return <div className="h-screen flex items-center justify-center bg-slate-950 text-white font-black italic animate-pulse tracking-widest">PREPARANDO ENTRENAMIENTO...</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center overflow-hidden relative">
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
                {[...Array(3)].map((_, i) => (
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

      <header className="absolute top-8 left-8 z-10">
        <a href="/games" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Salir</span>
        </a>
      </header>

      <AnimatePresence mode="wait">
        {gameState === 'playing' && questions.length > 0 ? (
          <motion.div key="question" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="flex flex-col items-center w-full max-w-4xl mt-20">
            {/* 3D ANIMATED MODEL DISPLAY */}
            <div className="relative mb-12">
               <div className="absolute inset-0 bg-cyan-500/10 blur-[120px] rounded-full" />
               <motion.div
                 animate={isAttacking ? { x: [0, 20, -20, 10, -10, 0], scale: [1, 1.2, 1] } : {}}
                 transition={{ duration: 0.5 }}
                 className="relative z-10 flex flex-col items-center"
               >
                  <img 
                    src={questions[currentIdx].animatedSprite} 
                    className="w-48 h-48 object-contain pixelated drop-shadow-[0_20px_50px_rgba(255,255,255,0.2)]" 
                    alt="Pokémon Target"
                  />
                  <div className="w-32 h-4 bg-black/40 blur-md rounded-[100%] mt-4" />
               </motion.div>
            </div>
            
            <h2 className="text-3xl font-black text-white italic uppercase mb-8 tracking-tighter text-center">
               ¿Cuál es el tipo de este Pokémon?
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full px-4">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleAnswer(t.id)}
                  className="flex items-center justify-center gap-3 py-4 rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-cyan-500/50 hover:scale-[1.02] transition-all text-white font-black uppercase text-[9px] tracking-widest shadow-lg"
                >
                  <div className={`p-2 rounded-lg ${t.color} shadow-lg`}>{t.icon}</div>
                  {t.name}
                </button>
              ))}
            </div>
          </motion.div>
        ) : gameState === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900/80 backdrop-blur-xl border border-white/5 p-16 rounded-[4rem] text-center max-w-md w-full shadow-2xl relative overflow-hidden">
             {endReason === 'win' ? (
                <>
                  <Trophy className="text-yellow-500 mx-auto mb-6" size={80} />
                  <h2 className="text-5xl font-black text-white italic uppercase mb-2 leading-tight">¡Misión Completa!</h2>
                  <p className="text-slate-500 mb-8 font-bold uppercase tracking-widest text-xs">Puntuación: {score}/10</p>
                  <div className="bg-cyan-500 text-black px-10 py-3 rounded-2xl font-black mb-12 inline-block shadow-xl">
                     +{score * 25} MONEDAS
                  </div>
                </>
             ) : endReason === 'lives' ? (
                <>
                  <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                    <XCircle className="text-red-500" size={50} />
                  </div>
                  <h2 className="text-5xl font-black text-white italic uppercase mb-2 leading-tight text-red-500">Eliminado</h2>
                  <p className="text-slate-500 mb-12 font-bold uppercase tracking-widest text-xs">Has fallado demasiadas veces.</p>
                </>
             ) : (
                <>
                  <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/20">
                    <Ghost className="text-orange-500" size={50} />
                  </div>
                  <h2 className="text-5xl font-black text-white italic uppercase mb-2 leading-tight text-orange-500">Tiempo Finalizado</h2>
                  <p className="text-slate-500 mb-12 font-bold uppercase tracking-widest text-xs">¡No has sido lo suficientemente rápido!</p>
                </>
             )}
            
            <button onClick={fetchQuestions} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-2xl">Volver a Intentarlo</button>
            <a href="/games" className="block mt-6 text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-colors">Volver al Menú</a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
