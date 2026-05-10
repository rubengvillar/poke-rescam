import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Sparkles, ChevronLeft, Coins, AlertCircle, Zap } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, increment, collection, getDocs, query, where, limit, getDoc, addDoc, orderBy } from 'firebase/firestore';
import { CardHologram } from './CardHologram';

export const PackOpener = () => {
  const [opening, setOpening] = useState(false);
  const [cardsWon, setCardsWon] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState({ coins: 0, stardust: 0 });

  const fetchUserStats = async () => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      setUserStats({
        coins: snap.data().coins || 0,
        stardust: snap.data().stardust || 0
      });
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  // Helper to fetch random cards based on a filter
  const fetchRandomCards = async (cardsRef: any, constraints: any[], count: number) => {
    const randomVal = Math.random();
    
    // First try: randomSeed >= randomVal
    let q = query(cardsRef, ...constraints, where('randomSeed', '>=', randomVal), limit(count));
    let snap = await getDocs(q);
    
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Second try if not enough cards: randomSeed < randomVal
    if (results.length < count) {
      const q2 = query(cardsRef, ...constraints, where('randomSeed', '<', randomVal), limit(count - results.length));
      const snap2 = await getDocs(q2);
      results = [...results, ...snap2.docs.map(d => ({ id: d.id, ...d.data() }))];
    }

    // Shuffle results locally to be extra safe
    return results.sort(() => Math.random() - 0.5);
  };

  const openPack = async (type: 'standard' | 'rare' | 'stardust') => {
    if (!auth.currentUser) return;
    
    let cost = 0;
    let currency: 'coins' | 'stardust' = 'coins';

    if (type === 'standard') cost = 100;
    if (type === 'rare') cost = 500;
    if (type === 'stardust') {
      cost = 500;
      currency = 'stardust';
    }

    try {
      setOpening(true);
      setError(null);
      
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const currentBalance = snap.data()?.[currency] || 0;

      if (currentBalance < cost) {
        setError(`No tienes suficiente ${currency === 'coins' ? 'monedas' : 'polvo estelar'}. Necesitas ${cost}.`);
        setOpening(false);
        return;
      }

      // Deduct cost
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { [currency]: increment(-cost) });

      const cardsRef = collection(db, 'cards');
      let finalCards: any[] = [];

      if (type === 'standard') {
        // 4 Commons + 2 Rares = 6 cards
        const commons = await fetchRandomCards(cardsRef, [where('rarity', '==', 'Common')], 4);
        const rares = await fetchRandomCards(cardsRef, [where('rarity', '!=', 'Common')], 2);
        finalCards = [...commons, ...rares];
      } else if (type === 'rare' || type === 'stardust') {
        // High quality only (3 cards)
        finalCards = await fetchRandomCards(cardsRef, [where('rarity', '!=', 'Common')], 3);
      }

      // Save to inventory
      const invRef = collection(db, `users/${auth.currentUser.uid}/inventory`);
      for (const card of finalCards) {
        await addDoc(invRef, {
          ...card,
          openedAt: new Date().toISOString()
        });
      }

      // Sound
      new Audio('/sounds/pack-open.mp3').play().catch(() => {});
      setCardsWon(finalCards);
      fetchUserStats(); 
    } catch (err) {
      console.error(err);
      setError("Error al abrir el sobre. Verifica tu conexión.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 flex flex-col items-center">
      <header className="w-full max-w-6xl mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <a href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-4 group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Volver</span>
          </a>
          <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">Tienda</h1>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl flex items-center gap-3">
             <Coins className="text-yellow-500" size={20} />
             <span className="text-white font-black">{userStats.coins}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl flex items-center gap-3">
             <Zap className="text-cyan-400" size={20} />
             <span className="text-white font-black">{userStats.stardust}</span>
          </div>
        </div>
      </header>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 font-bold text-sm">
          <AlertCircle size={18} /> {error}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {cardsWon.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
            <PackCard 
              title="Sobre Común"
              price={100}
              currency="coins"
              desc="6 cartas (4 comunes + 2 raras)."
              color="from-slate-500 to-slate-700"
              onOpen={() => openPack('standard')}
              disabled={opening}
            />
            <PackCard 
              title="Sobre de Élite"
              price={500}
              currency="coins"
              desc="3 cartas raras garantizadas."
              color="from-yellow-500 to-orange-600"
              onOpen={() => openPack('rare')}
              disabled={opening}
            />
            <PackCard 
              title="Sobre Estelar"
              price={500}
              currency="stardust"
              desc="Solo con Polvo Estelar. Cartas épicas."
              color="from-cyan-400 to-blue-600"
              onOpen={() => openPack('stardust')}
              disabled={opening}
            />
          </div>
        ) : (
          <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
              {cardsWon.map((card, i) => (
                <motion.div key={card.id + i} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.15 }}>
                  <CardHologram card={card} />
                </motion.div>
              ))}
            </div>
            <button onClick={() => setCardsWon([])} className="bg-white text-black px-12 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors shadow-2xl">
              Continuar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {opening && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center z-50">
          <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-32 h-32 bg-white/5 rounded-full border-4 border-cyan-500 flex items-center justify-center">
             <Package size={64} className="text-cyan-500" />
          </motion.div>
        </div>
      )}
    </div>
  );
};

const PackCard = ({ title, price, currency, desc, color, onOpen, disabled }: any) => (
  <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-8 flex flex-col items-center text-center group hover:border-slate-600 transition-all">
    <div className={`relative w-32 h-44 bg-gradient-to-br ${color} rounded-2xl mb-8 shadow-2xl flex items-center justify-center group-hover:scale-105 transition-transform`}>
      <Sparkles className="text-white/30 animate-pulse" size={48} />
    </div>
    <h3 className="text-2xl font-black text-white italic uppercase mb-2">{title}</h3>
    <p className="text-slate-500 text-xs mb-8">{desc}</p>
    <button 
      disabled={disabled}
      onClick={onOpen}
      className="w-full flex items-center justify-center gap-3 bg-slate-950 border border-slate-800 py-4 rounded-2xl text-white font-black hover:bg-white hover:text-black transition-all"
    >
      {currency === 'coins' ? <Coins size={18} /> : <Zap size={18} />}
      {price} {currency === 'coins' ? 'MONEDAS' : 'POLVO'}
    </button>
  </div>
);
