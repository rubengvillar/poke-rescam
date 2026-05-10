import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { TrainerCard } from './TrainerCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Scan, Users, Trophy, LayoutGrid, Coins, Sparkles } from 'lucide-react';

export const DashboardComponent = () => {
  const [user, setUser] = useState<User | null>(null);
  const [trainerData, setTrainerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const trainerRef = doc(db, 'users', u.uid);
        const trainerSnap = await getDoc(trainerRef);
        
        if (trainerSnap.exists()) {
          setTrainerData(trainerSnap.data());
        } else {
          // Initial profile creation
          const initialData = {
            name: u.displayName || 'Entrenador',
            level: 1,
            xp: 0,
            xpToNext: 1000,
            coins: 500,
            stardust: 100,
            avatarUrl: u.photoURL || '',
            insignias: [],
            favoriteCardId: null,
            createdAt: new Date().toISOString()
          };
          await setDoc(trainerRef, initialData);
          setTrainerData(initialData);
        }
      } else {
        window.location.href = '/';
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950">
      <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12">
      <AnimatePresence mode="wait">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          {/* Sidebar / Profile Section */}
          <div className="lg:col-span-4 space-y-6">
            <TrainerCard 
              trainerName={trainerData?.name}
              avatarUrl={trainerData?.avatarUrl}
              level={trainerData?.level}
              xp={trainerData?.xp}
              xpToNext={trainerData?.xpToNext}
              insignias={trainerData?.insignias}
            />
            
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
              <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Economía</h3>
              <div className="flex justify-between items-center p-4 bg-slate-950/50 rounded-2xl mb-3 border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <Coins className="text-yellow-500" size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-300">Monedas</span>
                </div>
                <span className="text-xl font-black text-white">{trainerData?.coins}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Sparkles className="text-purple-500" size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-300">Polvo Estelar</span>
                </div>
                <span className="text-xl font-black text-white">{trainerData?.stardust}</span>
              </div>
            </div>
          </div>

          {/* Main Actions Section */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard 
              icon={<Package className="text-cyan-400" size={32} />}
              title="Mis Sobres"
              desc="Abre nuevos paquetes y expande tu colección"
              gradient="from-cyan-500/20 to-blue-500/10"
              href="/packs"
            />
            <ActionCard 
              icon={<Scan className="text-emerald-400" size={32} />}
              title="Escanear Carta"
              desc="Añade cartas físicas usando tu cámara"
              gradient="from-emerald-500/20 to-teal-500/10"
              href="/scan"
            />
            <ActionCard 
              icon={<LayoutGrid className="text-orange-400" size={32} />}
              title="Colección"
              desc="Gestiona tus cartas y sube de nivel"
              gradient="from-orange-500/20 to-red-500/10"
              href="/inventory"
            />
            <ActionCard 
              icon={<Trophy className="text-yellow-400" size={32} />}
              title="Mini Juegos"
              desc="Gana monedas en desafíos rápidos"
              gradient="from-yellow-500/20 to-orange-500/10"
              href="/games"
            />
             <ActionCard 
              icon={<Users className="text-purple-400" size={32} />}
              title="Intercambio"
              desc="Cambia cartas con tus amigos en tiempo real"
              gradient="from-purple-500/20 to-pink-500/10"
              href="/trading"
              fullWidth
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const ActionCard = ({ icon, title, desc, gradient, href, fullWidth = false }: any) => (
  <motion.a
    href={href}
    whileHover={{ scale: 1.02, y: -4 }}
    whileTap={{ scale: 0.98 }}
    className={`${fullWidth ? 'md:col-span-2' : ''} relative group overflow-hidden bg-slate-900/40 border border-slate-800 p-8 rounded-[2rem] backdrop-blur-sm flex flex-col items-start gap-4 transition-all hover:border-slate-700`}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
    <div className="z-10 p-4 bg-slate-950/50 rounded-2xl border border-slate-800 shadow-xl">
      {icon}
    </div>
    <div className="z-10">
      <h3 className="text-2xl font-black text-white italic uppercase tracking-tight mb-1">{title}</h3>
      <p className="text-slate-500 text-sm font-medium">{desc}</p>
    </div>
    <div className="absolute top-8 right-8 z-10 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
        <div className="w-2 h-2 bg-white rounded-full" />
      </div>
    </div>
  </motion.a>
);
