import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Star, Zap, Award, Plus, Sparkles, Trophy, Flame, Target, Box } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

interface TrainerCardProps {
  uid?: string;
  trainerName: string;
  avatarUrl: string;
  level: number;
  xp: number;
  xpToNext: number;
  favoriteCardImage?: string;
  insignias?: string[];
  attributes?: {
    atk: number;
    def: number;
    lck: number;
    nrg: number;
  };
  pointsAvailable?: number;
  stats?: {
    gamesWon: number;
    winStreak: number;
  };
  items?: {
    potion: number;
    energyDrink: number;
    luckCharm: number;
  };
}

const getTrainerTier = (level: number) => {
  if (level >= 100) return { name: 'Maestro', color: 'text-rose-500', bg: 'bg-rose-500/20', border: 'border-rose-500' };
  if (level >= 90) return { name: 'Mítico', color: 'text-indigo-400', bg: 'bg-indigo-400/20', border: 'border-indigo-400' };
  if (level >= 75) return { name: 'Legendario', color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400' };
  if (level >= 50) return { name: 'Élite', color: 'text-cyan-400', bg: 'bg-cyan-400/20', border: 'border-cyan-400' };
  if (level >= 30) return { name: 'Épico', color: 'text-purple-400', bg: 'bg-purple-400/20', border: 'border-purple-400' };
  if (level >= 15) return { name: 'Raro', color: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400' };
  if (level >= 5) return { name: 'Inusual', color: 'text-emerald-400', bg: 'bg-emerald-400/20', border: 'border-emerald-400' };
  return { name: 'Común', color: 'text-slate-400', bg: 'bg-slate-400/20', border: 'border-slate-400' };
};

export const TrainerCard: React.FC<TrainerCardProps> = ({
  uid,
  trainerName,
  avatarUrl,
  level,
  xp,
  xpToNext,
  favoriteCardImage,
  insignias = [],
  attributes = { atk: 10, def: 10, lck: 10, nrg: 10 },
  pointsAvailable = 0,
  stats = { gamesWon: 0, winStreak: 0 },
  items = { potion: 0, energyDrink: 0, luckCharm: 0 }
}) => {
  const xpProgress = (xp / xpToNext) * 100;
  const [localPoints, setLocalPoints] = useState(pointsAvailable);
  const tier = getTrainerTier(level);

  const upgradeAttribute = async (attr: string) => {
    if (localPoints <= 0 || !uid) return;
    
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        [`attributes.${attr}`]: increment(1),
        pointsAvailable: increment(-1)
      });
      setLocalPoints(prev => prev - 1);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative w-full bg-slate-950 border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] group"
    >
      {/* Holographic Reflection */}
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/0 via-white/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
      
      {/* Top Header / Profile */}
      <div className="relative p-8 pb-4">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 rounded-full animate-pulse" />
            <img 
              src={avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ash'} 
              alt={trainerName} 
              className="w-24 h-24 rounded-[2rem] border-2 border-white/20 object-cover relative z-10 shadow-2xl"
            />
            <div className={`absolute -bottom-2 -right-2 ${tier.bg} ${tier.color} backdrop-blur-md text-[10px] font-black px-3 py-1 rounded-full border-2 ${tier.border} z-20 shadow-xl`}>
              LVL {level}
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">
                  {trainerName}
                </h2>
                <div className="flex items-center gap-2">
                   <div className={`px-2 py-0.5 rounded-md border ${tier.border} ${tier.bg} ${tier.color} text-[8px] font-black uppercase tracking-widest`}>
                      {tier.name}
                   </div>
                   <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Entrenador</p>
                </div>
              </div>
              <div className="flex gap-1">
                {insignias.slice(0, 3).map((_, i) => (
                  <div key={i} className="w-8 h-8 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center text-cyan-400">
                    <Award size={16} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="px-8 flex gap-4 mb-6">
         <div className="flex-1 bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Partidas Ganadas</p>
            <div className="flex items-center gap-2">
               <Trophy size={14} className="text-yellow-500" />
               <span className="text-white font-black text-lg">{stats.gamesWon}</span>
            </div>
         </div>
         <div className="flex-1 bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Racha Actual</p>
            <div className="flex items-center gap-2">
               <Flame size={14} className="text-orange-500" />
               <span className="text-white font-black text-lg">{stats.winStreak}</span>
            </div>
         </div>
      </div>

      {/* XP System */}
      <div className="px-8 mb-8">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Progreso de Nivel</span>
          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest tabular-nums">{xp} / {xpToNext} XP</span>
        </div>
        <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            className="h-full bg-gradient-to-r from-cyan-600 to-blue-400 relative"
          >
             <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] animate-[shimmer_2s_infinite]" />
          </motion.div>
        </div>
      </div>

      {/* Attribute Distribution */}
      <div className="px-8 pb-8">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-xs font-black text-white uppercase tracking-widest">Atributos del Guerrero</h3>
           <AnimatePresence>
             {localPoints > 0 && (
               <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 className="flex items-center gap-2 bg-cyan-500 text-black px-3 py-1 rounded-full font-black text-[10px] animate-bounce"
               >
                 <Sparkles size={10} />
                 {localPoints} PUNTOS DISPONIBLES
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <AttrButton 
            icon={<Zap size={14}/>} 
            label="Ataque" 
            value={attributes.atk} 
            color="text-red-400" 
            onUpgrade={() => upgradeAttribute('atk')}
            canUpgrade={localPoints > 0}
          />
          <AttrButton 
            icon={<Shield size={14}/>} 
            label="Defensa" 
            value={attributes.def} 
            color="text-blue-400" 
            onUpgrade={() => upgradeAttribute('def')}
            canUpgrade={localPoints > 0}
          />
          <AttrButton 
            icon={<Star size={14}/>} 
            label="Suerte" 
            value={attributes.lck} 
            color="text-yellow-400" 
            onUpgrade={() => upgradeAttribute('lck')}
            canUpgrade={localPoints > 0}
          />
          <AttrButton 
            icon={<Target size={14}/>} 
            label="Energía" 
            value={attributes.nrg} 
            color="text-purple-400" 
            onUpgrade={() => upgradeAttribute('nrg')}
            canUpgrade={localPoints > 0}
          />
        </div>
      </div>

      {/* Items Section */}
      <div className="px-8 pb-10 border-t border-white/5 pt-8">
         <div className="flex items-center gap-2 mb-4">
            <Box size={14} className="text-slate-500" />
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mochila</h3>
         </div>
         <div className="grid grid-cols-3 gap-3">
            <ItemSlot label="Pociones" count={items.potion} icon="🧪" />
            <ItemSlot label="Energía" count={items.energyDrink} icon="⚡" />
            <ItemSlot label="Amuletos" count={items.luckCharm} icon="🧿" />
         </div>
      </div>
    </motion.div>
  );
};

const AttrButton = ({ icon, label, value, color, onUpgrade, canUpgrade }: any) => (
  <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3 flex items-center justify-between group/attr hover:bg-white/5 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`${color} p-2 bg-slate-950 rounded-xl`}>{icon}</div>
      <div>
        <p className="text-[8px] font-black text-slate-500 uppercase leading-none mb-1">{label}</p>
        <p className="text-white font-black text-lg leading-none">{value}</p>
      </div>
    </div>
    {canUpgrade && (
      <button 
        onClick={onUpgrade}
        className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-cyan-400 transition-all scale-0 group-hover/attr:scale-100 shadow-xl"
      >
        <Plus size={16} />
      </button>
    )}
  </div>
);

const ItemSlot = ({ label, count, icon }: any) => (
  <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-3 text-center group/item hover:border-white/10 transition-all">
    <div className="text-2xl mb-1 group-hover/item:scale-110 transition-transform">{icon}</div>
    <p className="text-white font-black text-sm mb-1">{count}</p>
    <p className="text-[7px] font-black text-slate-600 uppercase tracking-tighter">{label}</p>
  </div>
);
