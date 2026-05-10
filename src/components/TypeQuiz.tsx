import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Timer, Trophy, ChevronLeft, Zap, Flame, Droplets, Leaf, Skull, Mountain, Ghost, Box, HelpCircle } from 'lucide-react';
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
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'result'>('loading');
  const [isAttacking, setIsAttacking] = useState(false);

  const fetchQuestions = async () => {
    setGameState('loading');
    const cardsRef = collection(db, 'cards');
    const randomVal = Math.random();
    // Query more cards to find those with animated sprites
    const q = query(cardsRef, where('randomSeed', '>=', randomVal), limit(20));
    const snap = await getDocs(q);
    
    const fetched = snap.docs.map(d => ({ 
      id: d.id, 
      name: d.data().name, 
      image: d.data().images?.small, 
      animatedSprite: d.data().animatedSprite,
      answer: d.data().types?.[0] || 'colorless'
    })).filter(c => c.animatedSprite); // Prioritize those with 3D models
    
    setQuestions(fetched.sort(() => Math.random() - 0.5).slice(0, 10));
    setGameState('playing');
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && gameState === 'playing') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('result');
      finishGame();
    }
  }, [timeLeft, gameState]);

  const handleAnswer = (typeId: string) => {
    const currentQuestion = questions[currentIdx];
    const isCorrect = currentQuestion.answer.toLowerCase() === typeId.toLowerCase();

    if (isCorrect) {
      setScore(score + 1);
      setIsAttacking(true);
      setTimeout(() => setIsAttacking(false), 500);
    }
    
    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(currentIdx + 1);
      } else {
        setGameState('result');
        finishGame();
      }
    }, isCorrect ? 600 : 0);
  };

  const finishGame = async () => {
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        coins: increment(score * 25),
        xp: increment(score * 15)
      });
    }
  };

  if (gameState === 'loading') return <div className="h-screen flex items-center justify-center bg-slate-950 text-white font-black italic animate-pulse">PREPARANDO ENTRENAMIENTO 3D...</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center overflow-hidden">
      <header className="absolute top-8 left-8 w-full max-w-6xl flex justify-between items-center px-8">
        <a href="/games" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Salir</span>
        </a>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-cyan-400">
            <Timer size={18} />
            <span className="font-black text-xl tabular-nums">{timeLeft}s</span>
          </div>
          <div className="text-white font-black text-xl italic bg-slate-900/50 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/5">
             ACIERTOS: {score}
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {gameState === 'playing' && questions.length > 0 ? (
          <motion.div key="question" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="flex flex-col items-center w-full max-w-4xl">
            {/* 3D ANIMATED MODEL DISPLAY */}
            <div className="relative mb-16">
               <div className="absolute inset-0 bg-cyan-500/10 blur-[120px] rounded-full" />
               <motion.div
                 animate={isAttacking ? { x: [0, 20, -20, 10, -10, 0], scale: [1, 1.2, 1] } : {}}
                 transition={{ duration: 0.5 }}
                 className="relative z-10 flex flex-col items-center"
               >
                  <img 
                    src={questions[currentIdx].animatedSprite} 
                    className="w-56 h-56 object-contain pixelated drop-shadow-[0_20px_50px_rgba(255,255,255,0.2)]" 
                    alt="Pokémon Target"
                  />
                  <div className="w-32 h-4 bg-black/40 blur-md rounded-[100%] mt-4" /> {/* SHADOW */}
               </motion.div>
            </div>
            
            <h2 className="text-3xl font-black text-white italic uppercase mb-12 tracking-tighter text-center">
               ¿Cuál es el tipo de este Pokémon?
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleAnswer(t.id)}
                  className="flex items-center justify-center gap-3 py-5 rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-cyan-500/50 hover:scale-[1.02] transition-all text-white font-black uppercase text-[10px] tracking-widest shadow-lg"
                >
                  <div className={`p-2 rounded-lg ${t.color} shadow-lg`}>{t.icon}</div>
                  {t.name}
                </button>
              ))}
            </div>
          </motion.div>
        ) : gameState === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/80 backdrop-blur-xl border border-white/5 p-16 rounded-[4rem] text-center max-w-md w-full shadow-2xl">
            <Trophy className="text-yellow-500 mx-auto mb-6" size={80} />
            <h2 className="text-5xl font-black text-white italic uppercase mb-2">¡Desafío 3D Completo!</h2>
            <div className="bg-cyan-500 text-black px-10 py-3 rounded-2xl font-black mb-12 inline-block shadow-xl">
               +{score * 25} MONEDAS
            </div>
            <button onClick={() => { setCurrentIdx(0); setScore(0); setTimeLeft(20); fetchQuestions(); }} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-2xl">Volver a Entrenar</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
