import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, Zap, Focus, ShieldCheck, ChevronRight } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScannerHelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const tips = [
    {
      icon: <Zap className="text-yellow-400" />,
      title: "Iluminación Directa",
      desc: "Evita sombras y reflejos sobre la carta. La luz natural o una lámpara blanca son ideales."
    },
    {
      icon: <Focus className="text-cyan-400" />,
      title: "Fondo Contrastado",
      desc: "Coloca la carta sobre una superficie oscura y lisa para que el escáner detecte mejor los bordes."
    },
    {
      icon: <ShieldCheck className="text-emerald-400" />,
      title: "Estabilidad",
      desc: "Mantén el pulso firme. El sistema capturará automáticamente cuando detecte que la imagen es estable."
    },
    {
      icon: <Lightbulb className="text-purple-400" />,
      title: "Layout Correcto",
      desc: "Usa el selector de Layout para indicar si la carta es Clásica (Vintage) o Moderna para mayor precisión."
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full -ml-16 -mb-16" />

            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">Consejos de Escaneo</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Obtén el máximo rigor en tu colección</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {tips.map((tip, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center border border-white/5 shadow-inner">
                      {tip.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">{tip.title}</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">{tip.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/5">
                <div className="bg-cyan-500/10 rounded-2xl p-4 flex items-center gap-4 border border-cyan-500/20">
                  <div className="p-2 bg-cyan-500 rounded-lg text-black">
                     <ChevronRight size={16} strokeWidth={3} />
                  </div>
                  <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest leading-normal">
                    El sistema Rigor 3.0 corrige automáticamente la inclinación de la carta.
                  </p>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="w-full mt-8 bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-xl"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
