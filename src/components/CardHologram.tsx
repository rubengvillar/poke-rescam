import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Shield, Zap, Heart, Info, Rotate3d, Volume2, Sparkles } from 'lucide-react';

interface CardHologramProps {
  card: {
    id: string;
    name: string;
    images: { small: string; large: string; isFallback?: boolean };
    rarity?: string;
    description?: string;
    hp?: string | number;
    attacks?: any[];
    types?: string[];
    cryUrl?: string;
    animatedSprite?: string;
  };
}

const TYPE_COLORS: Record<string, string> = {
  Fire: 'from-red-500 to-orange-600',
  Water: 'from-blue-500 to-cyan-600',
  Grass: 'from-green-500 to-emerald-600',
  Lightning: 'from-yellow-400 to-yellow-600',
  Psychic: 'from-purple-500 to-pink-600',
  Fighting: 'from-orange-700 to-red-900',
  Darkness: 'from-slate-800 to-black',
  Metal: 'from-zinc-400 to-slate-600',
  Colorless: 'from-slate-300 to-slate-500',
  Dragon: 'from-indigo-600 to-purple-800',
};

export const CardHologram: React.FC<CardHologramProps> = ({ card }) => {
  if (!card) return null;
  const [isFlipped, setIsFlipped] = useState(false);
  const isRare = card.rarity?.toLowerCase().includes('rare') || card.rarity?.toLowerCase().includes('holo');
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], ["15deg", "-15deg"]));
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], ["-15deg", "15deg"]));

  const playCry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.cryUrl) {
      const audio = new Audio(card.cryUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    new Audio('/sounds/card-flip.mp3').play().catch(() => {});
  };

  const mainType = card.types?.[0] || 'Colorless';
  const elementColor = TYPE_COLORS[mainType] || TYPE_COLORS.Colorless;

  return (
    <div 
      style={{ perspective: '1200px' }} 
      className="w-64 h-[22rem] cursor-pointer group relative"
      onMouseMove={(e) => {
        if (isFlipped) return;
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      onClick={handleFlip}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        style={{ 
          rotateX: isFlipped ? 0 : rotateX, 
          rotateY: isFlipped ? 180 : rotateY, 
          transformStyle: "preserve-3d",
        }}
        className="relative w-full h-full"
      >
        {/* FRONT SIDE */}
        <div 
          className="absolute inset-0 rounded-[1rem] overflow-hidden shadow-2xl border border-white/10"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', zIndex: isFlipped ? 0 : 1 }}
        >
          {card.images?.isFallback ? (
            <div className={`w-full h-full bg-gradient-to-br ${elementColor} p-4 flex flex-col items-center justify-center relative`}>
               <div className="absolute inset-0 bg-[url('/img/card-pattern.png')] opacity-10" />
               <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-white">
                  <span className="font-black italic text-sm uppercase">{card.name}</span>
                  <span className="font-bold text-xs">{card.hp} HP</span>
               </div>
               <div className="w-48 h-48 relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                  <img src={card.images.small} className="w-full h-full object-contain" />
               </div>
               <div className="absolute bottom-4 left-4 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                  Fallback Edition
               </div>
               <Sparkles className="absolute bottom-4 right-4 text-white/30" size={24} />
            </div>
          ) : (
            <img 
              src={card.images?.small || 'https://images.pokemontcg.io/base1/back.png'} 
              alt={card.name} 
              className="w-full h-full object-cover"
            />
          )}

          {isRare && (
            <motion.div
              style={{ background: "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)", backgroundSize: "200% 200%" }}
              animate={{ backgroundPosition: ["0% 0%", "200% 200%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 pointer-events-none mix-blend-overlay"
            />
          )}
        </div>

        {/* BACK SIDE */}
        <div 
          className="absolute inset-0 rounded-[1rem] overflow-hidden bg-slate-900 border-2 border-slate-800 p-6 flex flex-col shadow-2xl"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', zIndex: isFlipped ? 1 : 0 }}
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-black text-white italic uppercase truncate">{card.name}</h3>
            {card.cryUrl && (
              <button 
                onClick={playCry}
                className="p-2 bg-slate-800 rounded-full hover:bg-cyan-500 transition-colors group/sound"
              >
                <Volume2 size={16} className="text-white group-hover/sound:scale-110" />
              </button>
            )}
          </div>

          <div className="flex-1 space-y-4">
             <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Descripción</p>
                <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-4">{card.description || 'Sin datos.'}</p>
             </div>

             <div className="flex justify-center py-2 relative">
                {card.animatedSprite && (
                  <img src={card.animatedSprite} className="w-24 h-24 object-contain pixelated" />
                )}
                <div className="absolute inset-0 bg-cyan-500/5 blur-2xl rounded-full" />
             </div>

             <div className="grid grid-cols-2 gap-2">
                {card.attacks?.slice(0, 2).map((atk, i) => (
                  <div key={i} className="p-2 bg-slate-800/30 rounded-lg border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase">{atk.name}</p>
                    <p className="text-[10px] font-bold text-white">{atk.damage || '0'} DMG</p>
                  </div>
                ))}
             </div>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
             <span className="text-[10px] font-black text-slate-500 uppercase">{card.rarity}</span>
             <div className="flex gap-1">
                {card.types?.map((t, i) => (
                   <div key={i} className={`w-3 h-3 rounded-full bg-gradient-to-br ${TYPE_COLORS[t] || 'bg-slate-500'}`} />
                ))}
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
