import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, getDocs, doc, deleteDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { CardHologram } from './CardHologram';
import { Trash2, Sparkles, Filter, ChevronLeft, RefreshCw, Database } from 'lucide-react';
import { ToastProvider, useToast } from './Toast';
import { reIdentifyCard } from '../lib/scanner-service';

export const InventoryComponent = () => {
  return (
    <ToastProvider>
      <InventoryContent />
    </ToastProvider>
  );
};

const InventoryContent = () => {
  const { showToast } = useToast();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Manual Verification Modal State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedCardForVerify, setSelectedCardForVerify] = useState<any>(null);
  const [manualName, setManualName] = useState("");
  const [manualNum, setManualNum] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUserId(u.uid);
        const q = query(collection(db, `users/${u.uid}/inventory`));
        const unsubInv = onSnapshot(q, (snap) => {
          const rawCards = snap.docs
            .map(doc => ({ ...doc.data(), firestoreId: doc.id }))
            .filter((card: any) => card && (card.name || card.id));
          
          // Group by name + id (to be unique per card type)
          const groups: Record<string, any> = {};
          rawCards.forEach(card => {
            const groupKey = card.id || card.name;
            if (!groups[groupKey]) {
              groups[groupKey] = { ...card, count: 1, firestoreIds: [card.firestoreId] };
            } else {
              groups[groupKey].count++;
              groups[groupKey].firestoreIds.push(card.firestoreId);
            }
          });

          const cardGroups = Object.values(groups);
          console.log("INVENTORY GROUPS:", cardGroups.length);
          setCards(cardGroups);
          setLoading(false);
        });
        return unsubInv;
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const openVerifyModal = (card: any) => {
    setSelectedCardForVerify(card);
    setManualName(card.name);
    setManualNum(card.id?.split('-').pop() || "");
    setIsVerifyModalOpen(true);
  };

  const reVerifyCard = async (card: any, nameOverride?: string, numOverride?: string) => {
    if (!userId) return;
    const searchName = nameOverride || card.name;
    const searchNum = numOverride || card.id?.split('-').pop() || "";
    
    showToast(`Buscando ${searchName}...`, "info");
    
    try {
      const { card: updatedData, warning } = await reIdentifyCard(searchName, searchNum, card.text);
      
      if (warning) {
        const confirm = window.confirm(warning);
        if (!confirm) return;
      }

      if (updatedData) {
        for (const firestoreId of card.firestoreIds) {
          const cardRef = doc(db, `users/${userId}/inventory`, firestoreId);
          await updateDoc(cardRef, {
            ...updatedData,
            name: updatedData.name || searchName,
            isScanned: true,
            lastVerified: new Date().toISOString()
          });
        }
        showToast("¡Datos de carta actualizados!", "success");
        setIsVerifyModalOpen(false);
      } else {
        showToast("No se encontró información. Se mantendrá como personalizada.", "info");
      }
    } catch (err) {
      console.error(err);
      showToast("Error al re-verificar", "error");
    }
  };

  const burnCard = async (cardId: string) => {
    if (!userId) return;
    
    try {
      const cardRef = doc(db, `users/${userId}/inventory`, cardId);
      const userRef = doc(db, 'users', userId);
      
      await deleteDoc(cardRef);
      await updateDoc(userRef, {
        stardust: increment(50)
      });
      
      showToast("¡Carta quemada! +50 Polvo Estelar", "success");
    } catch (err) {
      console.error("Error burning card:", err);
      showToast("No se pudo quemar la carta", "error");
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
                  key={card.id || card.name}
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
                  className="flex flex-col items-center gap-4 group relative"
                >
                  <CardHologram card={card} />
                  
                  {card.count > 1 && (
                    <div className="absolute top-4 right-4 z-20 bg-cyan-500 text-black px-3 py-1 rounded-full font-black text-xs shadow-xl border-2 border-white/20">
                      x{card.count}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openVerifyModal(card)}
                      className="flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-white transition-all shadow-lg"
                    >
                      <Database size={14} />
                      Re-verificar
                    </button>
                    <button 
                      onClick={() => burnCard(card.firestoreIds[0])}
                      className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={14} />
                      Quemar Uno
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* MANUAL VERIFY MODAL */}
      <AnimatePresence>
        {isVerifyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsVerifyModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-emerald-500" />
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                  <Database className="text-cyan-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Asistente de Identificación</h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Corrige los datos para una búsqueda precisa</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-3 bg-slate-950/50 rounded-xl border border-white/5">
                  <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Texto detectado por cámara</label>
                  <p className="text-[10px] text-slate-400 italic line-clamp-2">{selectedCardForVerify?.text || "No hay texto disponible"}</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre del Pokémon</label>
                  <input 
                    type="text" 
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-cyan-500 outline-none transition-colors"
                    placeholder="Ej: Pikachu"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Número de Colección</label>
                  <input 
                    type="text" 
                    value={manualNum}
                    onChange={(e) => setManualNum(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-cyan-500 outline-none transition-colors"
                    placeholder="Ej: 131/091"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-10">
                <button 
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => reVerifyCard(selectedCardForVerify, manualName, manualNum)}
                  className="bg-cyan-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-black hover:bg-cyan-400 transition-all active:scale-95 shadow-xl shadow-cyan-500/20"
                >
                  Confirmar y Buscar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
