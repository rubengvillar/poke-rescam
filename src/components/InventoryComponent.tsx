import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, getDocs, doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { CardHologram } from './CardHologram';
import { Trash2, Sparkles, Filter, ChevronLeft } from 'lucide-react';

export const InventoryComponent = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUserId(u.uid);
        const q = query(collection(db, `users/${u.uid}/inventory`));
        const querySnapshot = await getDocs(q);
        const cardList = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((card: any) => card && card.name); // Ensure card exists and has at least a name
        setCards(cardList);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const burnCard = async (cardId: string) => {
    if (!userId) return;
    
    // In a real app, you'd confirm first
    try {
      const cardRef = doc(db, `users/${userId}/inventory`, cardId);
      const userRef = doc(db, 'users', userId);
      
      await deleteDoc(cardRef);
      await updateDoc(userRef, {
        stardust: increment(50) // Each card gives 50 stardust
      });
      
      setCards(cards.filter(c => c.id !== cardId));
    } catch (err) {
      console.error("Error burning card:", err);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <a href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-4 group">
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Volver al Dashboard</span>
            </a>
            <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">Mi Colección</h1>
            <p className="text-slate-500 font-medium">Gestiona tus cartas y obtén Polvo Estelar</p>
          </div>
          <div className="flex gap-4">
             <button className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-colors">
              <Filter size={20} />
            </button>
          </div>
        </header>

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem]">
            <Sparkles size={48} className="text-slate-700 mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest">Aún no tienes cartas</p>
            <a href="/packs" className="mt-4 text-cyan-500 font-bold hover:underline">¡Abre tu primer sobre!</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <AnimatePresence>
              {cards.map((card) => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ 
                    opacity: 0, 
                    filter: "blur(20px)", 
                    scale: 0.3, 
                    y: -150, 
                    rotate: 15,
                    transition: { duration: 0.8, ease: "easeIn" }
                  }}
                  className="flex flex-col items-center gap-4 group"
                >
                  <CardHologram card={card} />
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => burnCard(card.id)}
                      className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={14} />
                      Quemar
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
