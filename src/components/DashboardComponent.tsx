import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { TrainerCard } from './TrainerCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Scan, Users, Trophy, LayoutGrid, Coins, Sparkles, Menu, X, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';

export const DashboardComponent = () => {
  const [user, setUser] = useState<User | null>(null);
  const [trainerData, setTrainerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

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
            attributes: { atk: 10, def: 10, lck: 10, nrg: 10 },
            pointsAvailable: 5,
            stats: { gamesWon: 0, winStreak: 0 },
            items: { potion: 3, energyDrink: 2, luckCharm: 1 },
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
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      {/* TOP NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-40 px-8 py-6 flex justify-between items-center backdrop-blur-md bg-slate-950/50 border-b border-white/5">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
               <div className="w-4 h-4 bg-black rounded-full border-2 border-white" />
            </div>
            <h1 className="text-xl font-black text-white italic uppercase tracking-tighter">Rescam <span className="text-cyan-400">TCG</span></h1>
         </div>
         <button 
           onClick={() => setIsMenuOpen(true)}
           className="p-3 bg-slate-900 border border-white/10 rounded-2xl text-white hover:bg-white hover:text-black transition-all shadow-xl"
         >
            <Menu size={20} />
         </button>
      </header>

      {/* SIDE MENU DRAWER */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xs bg-slate-900 border-l border-white/10 z-[60] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] p-8 flex flex-col"
            >
               <div className="flex justify-between items-center mb-12">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Menú Principal</span>
                  <button onClick={() => setIsMenuOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                     <X size={24} />
                  </button>
               </div>

               <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                  <MenuLink icon={<UserIcon size={20}/>} label="Mi Perfil" href="#profile" onClick={() => setIsMenuOpen(false)} />
                  <MenuLink icon={<LayoutGrid size={20}/>} label="Colección" href="/inventory" />
                  <MenuLink icon={<Package size={20}/>} label="Tienda de Sobres" href="/packs" />
                  <MenuLink icon={<Trophy size={20}/>} label="Mini Juegos" href="/games" />
                  <MenuLink icon={<Users size={20}/>} label="Intercambio" href="/trading" />
                  <MenuLink icon={<Scan size={20}/>} label="Escanear" href="/scan" />
                  <div className="h-px bg-white/5 my-6" />
                  <MenuLink icon={<Settings size={20}/>} label="Ajustes" href="#" />
               </div>

               <button 
                 onClick={handleLogout}
                 className="mt-auto flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black uppercase text-xs tracking-widest border border-red-500/20 shadow-xl"
               >
                  <LogOut size={20} /> Cerrar Sesión
               </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 mt-24 items-start"
        >
          {/* Main Actions Section - ORDER 1 ON MOBILE */}
          <div className="lg:col-span-8 order-1 lg:order-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard 
              icon={<LayoutGrid className="text-orange-400" size={32} />}
              title="Colección"
              desc="Gestiona tus cartas"
              gradient="from-orange-500/20 to-red-500/10"
              href="/inventory"
            />
            <ActionCard 
              icon={<Trophy className="text-yellow-400" size={32} />}
              title="Mini Juegos"
              desc="Gana monedas y XP"
              gradient="from-yellow-500/20 to-orange-500/10"
              href="/games"
            />
            <ActionCard 
              icon={<Scan className="text-emerald-400" size={32} />}
              title="Escanear"
              desc="Añade con tu cámara"
              gradient="from-emerald-500/20 to-teal-500/10"
              href="/scan"
            />
            <ActionCard 
              icon={<Package className="text-cyan-400" size={32} />}
              title="Tienda"
              desc="Nuevos sobres"
              gradient="from-cyan-500/20 to-blue-500/10"
              href="/packs"
            />
            <ActionCard 
              icon={<Users className="text-purple-400" size={32} />}
              title="Intercambio"
              desc="Cambia con amigos"
              gradient="from-purple-500/20 to-pink-500/10"
              href="/trading"
              fullWidth
            />
          </div>

          {/* Sidebar / Profile Section - ORDER 2 ON MOBILE */}
          <div className="lg:col-span-4 order-2 lg:order-1 space-y-6">
            <TrainerCard 
              uid={user?.uid}
              trainerName={trainerData?.name}
              avatarUrl={trainerData?.avatarUrl}
              level={trainerData?.level}
              xp={trainerData?.xp}
              xpToNext={trainerData?.xpToNext}
              insignias={trainerData?.insignias}
              attributes={trainerData?.attributes}
              pointsAvailable={trainerData?.pointsAvailable}
              stats={trainerData?.stats}
              items={trainerData?.items}
            />
            
            <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                 <Coins size={14} className="text-yellow-500" />
                 Economía Global
              </h3>
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

const MenuLink = ({ icon, label, href, onClick }: any) => (
  <a 
    href={href} 
    onClick={onClick}
    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/30 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-cyan-500/50 transition-all group"
  >
     <div className="p-2 bg-slate-900 rounded-xl group-hover:text-cyan-400 transition-colors shadow-lg">{icon}</div>
     <span className="font-black uppercase text-[10px] tracking-widest">{label}</span>
  </a>
);
