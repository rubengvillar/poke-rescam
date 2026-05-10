import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Star, Zap, Award } from 'lucide-react';

interface TrainerCardProps {
  trainerName: string;
  avatarUrl: string;
  level: number;
  xp: number;
  xpToNext: number;
  favoriteCardImage?: string;
  insignias?: string[];
}

export const TrainerCard: React.FC<TrainerCardProps> = ({
  trainerName,
  avatarUrl,
  level,
  xp,
  xpToNext,
  favoriteCardImage,
  insignias = []
}) => {
  const xpProgress = (xp / xpToNext) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
    >
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Top Banner */}
      <div className="h-32 bg-gradient-to-r from-cyan-600 to-purple-600 relative">
        <div className="absolute -bottom-12 left-8">
          <div className="relative">
            <img 
              src={avatarUrl} 
              alt={trainerName} 
              className="w-24 h-24 rounded-3xl border-4 border-slate-950 object-cover shadow-xl"
            />
            <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-[10px] font-black px-2 py-1 rounded-lg border-2 border-slate-950">
              LVL {level}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-16 pb-8 px-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white uppercase italic">
              {trainerName}
            </h2>
            <p className="text-slate-500 text-xs font-bold tracking-[0.2em] uppercase">
              Entrenador de Elite
            </p>
          </div>
          <div className="flex gap-2">
            {insignias.map((ins, i) => (
              <div key={i} className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
                <Award size={16} className="text-cyan-400" />
              </div>
            ))}
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Experiencia</span>
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{xp} / {xpToNext} XP</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden p-1 border border-slate-800">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <StatBox icon={<Shield size={14}/>} label="Defensa" value="84" color="text-blue-400" />
          <StatBox icon={<Zap size={14}/>} label="Ataque" value="126" color="text-yellow-400" />
          <StatBox icon={<Star size={14}/>} label="Raros" value="12" color="text-purple-400" />
        </div>
      </div>

      {/* Favorite Card Floating */}
      {favoriteCardImage && (
        <motion.div 
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="absolute top-24 right-8 w-20 h-28 rounded-lg overflow-hidden border border-white/20 shadow-2xl rotate-12"
        >
          <img src={favoriteCardImage} className="w-full h-full object-cover" />
        </motion.div>
      )}
    </motion.div>
  );
};

const StatBox = ({ icon, label, value, color }: any) => (
  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 text-center">
    <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
    <div className="text-white font-black text-lg leading-none mb-1">{value}</div>
    <div className="text-slate-600 text-[8px] font-black uppercase tracking-widest">{label}</div>
  </div>
);
