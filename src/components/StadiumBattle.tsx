import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Heart, Zap, Shield, ChevronLeft, RefreshCw, Trophy, Target, Sparkles, Box, X } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, getDocs, doc, updateDoc, increment, where, limit } from 'firebase/firestore';
import { CardHologram } from './CardHologram';

const TYPE_CHART: Record<string, Record<string, number>> = {
  Fire: { Grass: 1.5, Water: 0.5, Metal: 1.5 },
  Water: { Fire: 1.5, Fighting: 0.5, Lightning: 0.5 },
  Grass: { Water: 1.5, Fire: 0.5, Lightning: 1.5 },
  Lightning: { Water: 1.5, Grass: 0.5 },
  Psychic: { Fighting: 1.5, Darkness: 0.5 },
  Fighting: { Colorless: 1.5, Psychic: 0.5, Darkness: 1.5 },
  Darkness: { Psychic: 1.5, Fighting: 0.5 },
  Metal: { Colorless: 1.5, Fire: 0.5 },
  Colorless: { Fighting: 0.5 },
};

type StatusEffect = 'burned' | 'paralyzed' | 'poisoned' | null;
type RivalRarity = 'common' | 'elite' | 'legendary';

export const StadiumBattle = () => {
  const [gameState, setGameState] = useState<'selecting' | 'loading' | 'battle' | 'result'>('selecting');
  const [turn, setTurn] = useState<'player' | 'bot'>('player');
  const [userCard, setUserCard] = useState<any>(null);
  const [botCard, setBotCard] = useState<any>(null);
  
  const [playerHP, setPlayerHP] = useState(100);
  const [botHP, setBotHP] = useState(100);
  const [playerMaxHP, setPlayerMaxHP] = useState(100);
  const [botMaxHP, setBotMaxHP] = useState(100);
  
  const [playerEnergy, setPlayerEnergy] = useState(100);
  const [botEnergy, setBotEnergy] = useState(100);
  const [playerStatus, setPlayerStatus] = useState<StatusEffect>(null);
  const [botStatus, setBotStatus] = useState<StatusEffect>(null);
  const [rivalRarity, setRivalRarity] = useState<RivalRarity>('common');
  const [trainerData, setTrainerData] = useState<any>(null);
  const [showBackpack, setShowBackpack] = useState(false);
  
  const [isDefending, setIsDefending] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [userXP, setUserXP] = useState(0);
  const [isChoosing, setIsChoosing] = useState(false);
  const [turnTimer, setTurnTimer] = useState(10);
  const [loading, setLoading] = useState(true);
  const [showLegendaryAlert, setShowLegendaryAlert] = useState(false);
  const turnIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (gameState === 'battle' && turn === 'player' && turnTimer > 0) {
      turnIntervalRef.current = setInterval(() => {
        setTurnTimer(prev => prev - 1);
      }, 1000);
    } else if (turnTimer === 0 && turn === 'player' && gameState === 'battle') {
      setLogs(prev => ["¡Demasiado lento! El rival aprovecha tu duda.", ...prev]);
      setTurn('bot');
      setTimeout(botTurn, 1000);
    }
    return () => { if (turnIntervalRef.current) clearInterval(turnIntervalRef.current); };
  }, [gameState, turn, turnTimer]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchInventory(user.uid);
        fetchUserProfile(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserProfile = async (uid: string) => {
    const docSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
    if (!docSnap.empty) {
      const data = docSnap.docs[0].data();
      setUserXP(data.xp || 0);
      setTrainerData(data);
    }
  };

  const fetchInventory = async (uid: string) => {
    try {
      const snap = await getDocs(collection(db, `users/${uid}/inventory`));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInventory(list);
      if (list.length > 0) setUserCard(list[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const calculateTypeMultiplier = (attackerType: string, defenderTypes: string[]) => {
    let multiplier = 1;
    defenderTypes?.forEach(defType => {
      if (TYPE_CHART[attackerType]?.[defType]) {
        multiplier *= TYPE_CHART[attackerType][defType];
      }
    });
    return multiplier;
  };

  const startBattle = async () => {
    if (!userCard) return;
    setGameState('loading');
    
    // Encounter Logic
    const rarityRoll = Math.random();
    let rarity: RivalRarity = 'common';
    if (rarityRoll > 0.95) rarity = 'legendary';
    else if (rarityRoll > 0.75) rarity = 'elite';
    setRivalRarity(rarity);

    const cardsRef = collection(db, 'cards');
    const randomSeed = Math.random();
    const q = query(cardsRef, where('randomSeed', '>=', randomSeed), limit(1));
    const snap = await getDocs(q);
    let rival = !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } : { name: "Rival", hp: 100, attacks: [{name: "Golpe", damage: 20}] };
    
    // Scale Difficulty
    const levelFactor = 1 + (Math.floor(userXP / 500) * 0.05);
    const rarityFactor = rarity === 'legendary' ? 1.5 : (rarity === 'elite' ? 1.2 : 1.0);
    const scale = levelFactor * rarityFactor;

    const scaledRival = {
      ...rival,
      hp: Math.floor((parseInt(rival.hp) || 100) * scale),
      attacks: rival.attacks?.map((a: any) => ({ ...a, damage: Math.floor((parseInt(a.damage) || 20) * scale) }))
    };

    setBotCard(scaledRival);
    setPlayerHP(parseInt(userCard.hp) || 100);
    setPlayerMaxHP(parseInt(userCard.hp) || 100);
    setBotHP(scaledRival.hp);
    setBotMaxHP(scaledRival.hp);
    
    // Apply Energy attribute
    const maxEnergy = 100 + ((trainerData?.attributes?.nrg || 10) - 10) * 5;
    setPlayerEnergy(maxEnergy);
    setBotEnergy(100);
    setPlayerStatus(null);
    setBotStatus(null);
    
    if (rarity === 'legendary') {
      setShowLegendaryAlert(true);
      setTimeout(() => setShowLegendaryAlert(false), 3000);
    }

    setLogs([`¡Comienza el duelo contra ${scaledRival.name} (${rarity.toUpperCase()})!`]);
    setGameState('battle');
    setTurn('player');
    setTurnTimer(10);
  };

  const applyStatusEffects = (hp: number, status: StatusEffect) => {
    if (status === 'burned' || status === 'poisoned') {
      return Math.floor(hp * 0.08);
    }
    return 0;
  };

  const executeAction = (type: 'attack' | 'defend', attackIdx: number = 0) => {
    if (turn !== 'player' || gameState !== 'battle') return;

    // Check Paralysis
    if (playerStatus === 'paralyzed' && Math.random() < 0.35) {
      setLogs(prev => ["¡Estás paralizado y no puedes moverte!", ...prev]);
      setTurn('bot');
      setTimeout(botTurn, 1500);
      return;
    }

    // Apply turn start damage
    const statusDmg = applyStatusEffects(playerHP, playerStatus);
    if (statusDmg > 0) {
      setPlayerHP(prev => Math.max(0, prev - statusDmg));
      setLogs(prev => [`¡El estado alterado te resta ${statusDmg} HP!`, ...prev]);
    }

    let logMsg = "";
    if (type === 'attack') {
      const atk = userCard.attacks?.[attackIdx] || { name: 'Ataque Base', damage: 20 };
      const cost = attackIdx === 0 ? 25 : 50;

      if (playerEnergy < cost) {
        setLogs(prev => ["¡No tienes suficiente energía!", ...prev]);
        return;
      }

      setPlayerEnergy(prev => prev - cost);

      // Accuracy check
      if (Math.random() < 0.1) {
        logMsg = `¡${userCard.name} falló el ataque!`;
      } else {
        let damage = parseInt(atk.damage) || 20;
        
        // Multipliers
        const typeMult = calculateTypeMultiplier(userCard.types?.[0], botCard.types);
        const attrMult = 1 + ((trainerData?.attributes?.atk || 10) - 10) * 0.01;
        damage = Math.floor(damage * typeMult * attrMult);
        
        // Critical
        const luckBonus = ((trainerData?.attributes?.lck || 10) - 10) * 0.005;
        const isCrit = Math.random() < (0.15 + luckBonus);
        if (isCrit) { damage *= 2; }

        logMsg = `¡${userCard.name} usa ${atk.name}! ${isCrit ? '¡GOLPE CRÍTICO! ' : ''}${typeMult > 1 ? '¡Es súper efectivo! ' : ''}(${damage} Daño)`;
        setBotHP(prev => Math.max(0, prev - damage));

        // Random status apply
        if (Math.random() < 0.2) {
          const effects: StatusEffect[] = ['burned', 'poisoned', 'paralyzed'];
          const effect = effects[Math.floor(Math.random() * effects.length)];
          setBotStatus(effect);
          logMsg += ` ¡El rival ha sido ${effect}!`;
        }
      }
    } else {
      setIsDefending(true);
      setPlayerEnergy(prev => Math.min(100, prev + 25));
      logMsg = `¡${userCard.name} se defiende y recupera energía!`;
    }

    setLogs(prev => [logMsg, ...prev]);
    
    if (botHP <= 0) {
      setTimeout(() => endBattle('user'), 1000);
    } else {
      setTurn('bot');
      setTurnTimer(10);
      setTimeout(botTurn, 1500);
    }
  };

  const botTurn = () => {
    if (gameState !== 'battle') return;

    // Check Status
    if (botStatus === 'paralyzed' && Math.random() < 0.35) {
      setLogs(prev => [`¡${botCard.name} está paralizado!`, ...prev]);
      setTurn('player');
      return;
    }

    const statusDmg = applyStatusEffects(botHP, botStatus);
    if (statusDmg > 0) {
      setBotHP(prev => Math.max(0, prev - statusDmg));
    }

    // Smart AI logic
    let action: 'attack' | 'defend' = 'attack';
    if (botEnergy < 25 || (botHP < botMaxHP * 0.3 && Math.random() < 0.4)) {
      action = 'defend';
    }

    let logMsg = "";
    if (action === 'attack') {
      const atk = botCard.attacks?.[0] || { name: 'Ataque Rival', damage: 20 };
      setBotEnergy(prev => prev - 25);

      if (Math.random() < 0.1) {
        logMsg = `¡${botCard.name} falló el ataque!`;
      } else {
        let damage = parseInt(atk.damage) || 15;
        if (isDefending) {
          const defBonus = 1 - ((trainerData?.attributes?.def || 10) - 10) * 0.01;
          damage = Math.floor(damage * 0.4 * Math.max(0.5, defBonus));
          setIsDefending(false);
        }
        
        const multiplier = calculateTypeMultiplier(botCard.types?.[0], userCard.types);
        damage = Math.floor(damage * multiplier);

        setPlayerHP(prev => Math.max(0, prev - damage));
        logMsg = `¡${botCard.name} usa ${atk.name} causando ${damage} de daño!`;
        
        if (Math.random() < 0.15) {
          setPlayerStatus('burned');
          logMsg += " ¡Has sido quemado!";
        }
      }
    } else {
      setBotEnergy(prev => Math.min(100, prev + 25));
      logMsg = `¡${botCard.name} se pone en guardia!`;
    }

    setLogs(prev => [logMsg, ...prev]);

    if (playerHP <= 0) {
      setTimeout(() => endBattle('bot'), 1000);
    } else {
      setTurn('player');
      setTurnTimer(10);
    }
  };

  const endBattle = async (winner: 'user' | 'bot') => {
    setGameState('result');
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const isWinner = winner === 'user';
      const prizeMultiplier = rivalRarity === 'legendary' ? 3 : (rivalRarity === 'elite' ? 1.5 : 1.0);
      const xpGained = isWinner ? Math.floor(100 * prizeMultiplier) : 10;
      const coinsGained = isWinner ? Math.floor(250 * prizeMultiplier) : 0;

      // Level Up Logic
      let newXP = (trainerData?.xp || 0) + xpGained;
      let newLevel = trainerData?.level || 1;
      let newXPToNext = trainerData?.xpToNext || 1000;
      let newPoints = trainerData?.pointsAvailable || 0;
      let levelUps = 0;
      let rewardsList: string[] = [];

      while (newXP >= newXPToNext) {
        newXP -= newXPToNext;
        newLevel++;
        newXPToNext = Math.floor(newXPToNext * 1.2);
        newPoints += 5;
        levelUps++;
        
        // Random Rewards
        const extraCoins = Math.floor(Math.random() * 300) + 200;
        const extraStardust = Math.floor(Math.random() * 100) + 50;
        rewardsList.push(`¡NVL ${newLevel}! +5 Puntos, ${extraCoins} Monedas, ${extraStardust} Polvo`);
      }

      await updateDoc(userRef, {
        coins: increment(coinsGained + (levelUps > 0 ? 500 : 0)), // Simple flat bonus for now + coinsGained
        xp: newXP,
        level: newLevel,
        xpToNext: newXPToNext,
        pointsAvailable: newPoints,
        'stats.gamesWon': increment(isWinner ? 1 : 0),
        'stats.winStreak': isWinner ? increment(1) : 0
      });

      if (levelUps > 0) {
        setLogs(prev => [...rewardsList, "¡HAS SUBIDO DE NIVEL!", ...prev]);
      }
    }
  };

  const useItem = async (itemType: string) => {
    if (turn !== 'player' || !trainerData?.items?.[itemType] || trainerData.items[itemType] <= 0) return;

    let logMsg = "";
    if (itemType === 'potion') {
      const heal = 50;
      setPlayerHP(prev => Math.min(playerMaxHP, prev + heal));
      logMsg = `¡Usaste Poción! Recuperaste ${heal} HP.`;
    } else if (itemType === 'energyDrink') {
      const nrg = 50;
      setPlayerEnergy(prev => Math.min(100 + ((trainerData?.attributes?.nrg || 10) - 10) * 5, prev + nrg));
      logMsg = `¡Usaste Bebida Energética! Recuperaste ${nrg} de Energía.`;
    } else if (itemType === 'luckCharm') {
      setLogs(prev => ["¡El Amuleto brilla! Tu suerte aumenta temporalmente.", ...prev]);
      // Temporary luck boost logic could go here or just impact next action
    }

    // Update Firestore
    const userRef = doc(db, 'users', auth.currentUser!.uid);
    await updateDoc(userRef, {
      [`items.${itemType}`]: increment(-1)
    });

    setTrainerData((prev: any) => ({
      ...prev,
      items: { ...prev.items, [itemType]: prev.items[itemType] - 1 }
    }));

    setLogs(prev => [logMsg, ...prev]);
    setShowBackpack(false);
    
    // Using an item doesn't end turn but consumes time
    setTurnTimer(prev => Math.max(1, prev - 2));
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950"><RefreshCw className="animate-spin text-cyan-500" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center relative overflow-hidden">
       {/* Background Effects */}
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)]" />

       <header className="absolute top-8 left-8 z-20">
          <a href="/games" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Salir del Estadio</span>
          </a>
       </header>

       <AnimatePresence>
         {showLegendaryAlert && (
           <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
              <div className="bg-yellow-500 text-black px-12 py-6 rounded-[2rem] font-black italic text-4xl uppercase shadow-[0_0_100px_rgba(234,179,8,0.5)] border-4 border-white animate-bounce">
                 ¡RIVAL LEGENDARIO!
              </div>
           </motion.div>
         )}
       </AnimatePresence>

       <AnimatePresence mode="wait">
         {gameState === 'selecting' && (
           <motion.div key="sel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center relative z-10">
              <h2 className="text-6xl font-black text-white italic uppercase mb-12 tracking-tighter">Stadium Battle</h2>
              <div className="flex flex-col items-center gap-8 bg-slate-900/50 backdrop-blur-xl p-12 rounded-[3rem] border border-white/5 shadow-2xl">
                 <div className="relative group">
                    <CardHologram card={userCard} />
                    <button onClick={() => setIsChoosing(true)} className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-2xl hover:bg-cyan-400 transition-colors">Elegir Pokémon</button>
                 </div>
                 <button onClick={startBattle} disabled={!userCard} className="mt-8 bg-cyan-500 text-black px-12 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] disabled:opacity-50">¡Entrar a Combatir!</button>
              </div>

              {/* Inventory Modal */}
              <AnimatePresence>
                {isChoosing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-50 p-12 overflow-y-auto">
                    <div className="flex justify-between items-center mb-12">
                      <h3 className="text-3xl font-black text-white uppercase italic">Selecciona tu Guerrero</h3>
                      <button onClick={() => setIsChoosing(false)} className="text-slate-500 hover:text-white font-black uppercase text-xs">Cerrar</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
                      {inventory.map(card => {
                        const isFallback = card.images?.isFallback || !card.images?.small?.startsWith('http');
                        return (
                          <div 
                            key={card.id} 
                            onClick={() => { setUserCard(card); setIsChoosing(false); }} 
                            className="cursor-pointer group relative"
                          >
                            <div className={`aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-800 group-hover:border-cyan-500 transition-all shadow-xl bg-slate-900 flex flex-col ${isFallback ? 'p-2' : ''}`}>
                               {isFallback ? (
                                 <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('/img/card-pattern.png')] opacity-5" />
                                    <div className="absolute top-2 left-2 right-2 flex justify-between items-center text-[6px] font-black text-white/70 uppercase z-10">
                                       <span className="truncate max-w-[40px]">{card.name}</span>
                                       <span>{card.hp} HP</span>
                                    </div>
                                    <img src={card.images?.small} className="w-4/5 h-4/5 object-contain drop-shadow-2xl relative z-10" />
                                    <div className="absolute bottom-2 right-2 z-10">
                                       <Sparkles size={10} className="text-white/20" />
                                    </div>
                                 </div>
                               ) : (
                                 <img src={card.images?.small} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                               )}
                            </div>
                            <div className="mt-2">
                               <p className="text-[10px] font-black text-white uppercase truncate group-hover:text-cyan-400 transition-colors">{card.name}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </motion.div>
         )}

         {gameState === 'battle' && (
           <motion.div key="bat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-7xl relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                 {/* PLAYER SIDE */}
                 <div className="flex flex-col items-center gap-6">
                    <div className="w-full bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                             <span className="text-white font-black italic">{userCard.name}</span>
                             {playerStatus && <div className={`w-2 h-2 rounded-full animate-pulse ${playerStatus === 'burned' ? 'bg-red-500' : playerStatus === 'poisoned' ? 'bg-green-500' : 'bg-yellow-400'}`} />}
                          </div>
                          <span className="text-cyan-400 font-bold text-xs">{playerHP} / {playerMaxHP} HP</span>
                       </div>
                       <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                          <motion.div className="bg-emerald-500 h-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" animate={{ width: `${(playerHP / playerMaxHP) * 100}%` }} />
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Energía</span>
                          <span className="text-yellow-500 font-bold text-[10px]">{playerEnergy}%</span>
                       </div>
                       <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                          <motion.div className="bg-yellow-500 h-full" animate={{ width: `${playerEnergy}%` }} />
                       </div>
                    </div>
                    <CardHologram card={userCard} />
                 </div>

                 {/* CONTROLS & LOGS */}
                 <div className="flex flex-col gap-6">
                    {/* Turn Timer Display */}
                    <div className="flex justify-center">
                       <div className={`px-6 py-2 rounded-full border-2 font-black italic text-xl tabular-nums ${turn === 'player' ? 'border-cyan-500 text-white bg-cyan-500/10' : 'border-slate-800 text-slate-500'}`}>
                          {turn === 'player' ? `TU TURNO: ${turnTimer}s` : 'ESPERANDO RIVAL...'}
                       </div>
                    </div>

                    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-[2rem] p-6 h-64 overflow-y-auto flex flex-col gap-3 font-mono text-[10px] shadow-inner">
                       {logs.map((log, i) => (
                         <div key={i} className={`pl-3 py-1 border-l-2 ${i === 0 ? 'text-white border-cyan-500 bg-cyan-500/5' : 'text-slate-500 border-slate-800'}`}>
                           {log}
                         </div>
                       ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       {userCard.attacks?.slice(0, 2).map((atk: any, i: number) => (
                         <button 
                           key={i}
                           disabled={turn !== 'player' || playerEnergy < (i === 0 ? 25 : 50)}
                           onClick={() => executeAction('attack', i)}
                           className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left hover:border-cyan-500 hover:bg-cyan-500/5 transition-all group disabled:opacity-30 relative overflow-hidden"
                         >
                            <p className="text-[10px] font-black text-slate-500 uppercase mb-1 group-hover:text-cyan-400">Ataque {i+1}</p>
                            <p className="text-white font-bold truncate text-xs">{atk.name}</p>
                            <div className="flex justify-between items-center mt-1">
                               <span className="text-cyan-400 font-black text-[10px]">{atk.damage || '20'} DMG</span>
                               <span className="text-yellow-500 font-black text-[10px] italic">{i === 0 ? '25' : '50'} E</span>
                            </div>
                         </button>
                       ))}
                       <button 
                         disabled={turn !== 'player'}
                         onClick={() => executeAction('defend')}
                         className="bg-slate-800 p-4 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50 border border-white/5"
                       >
                          <Shield size={18} /> Defender (+25 E)
                       </button>
                       <button 
                         disabled={turn !== 'player'}
                         onClick={() => setShowBackpack(true)}
                         className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase tracking-widest hover:bg-white/5 transition-all disabled:opacity-50"
                       >
                          <Box size={18} className="text-cyan-400" /> Mochila
                       </button>
                    </div>
                    
                    {turn === 'bot' && (
                       <div className="text-center animate-pulse text-red-400 font-black uppercase text-xs tracking-widest">Turno del Rival...</div>
                    )}
                 </div>

                 {/* RIVAL SIDE */}
                 <div className="flex flex-col items-center gap-6">
                    <div className="w-full bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                             <span className={`font-black italic ${rivalRarity === 'legendary' ? 'text-yellow-500' : 'text-white'}`}>{botCard.name}</span>
                             {botStatus && <div className={`w-2 h-2 rounded-full animate-pulse ${botStatus === 'burned' ? 'bg-red-500' : botStatus === 'poisoned' ? 'bg-green-500' : 'bg-yellow-400'}`} />}
                          </div>
                          <span className="text-red-400 font-bold text-xs">{botHP} / {botMaxHP} HP</span>
                       </div>
                       <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                          <motion.div className="bg-red-500 h-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" animate={{ width: `${(botHP / botMaxHP) * 100}%` }} />
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Energía</span>
                          <span className="text-yellow-500 font-bold text-[10px]">{botEnergy}%</span>
                       </div>
                       <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                          <motion.div className="bg-yellow-500 h-full" animate={{ width: `${botEnergy}%` }} />
                       </div>
                    </div>
                    <CardHologram card={botCard} />
                 </div>
              </div>
           </motion.div>
         )}

         {gameState === 'result' && (
           <motion.div key="res" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-slate-900 p-16 rounded-[4rem] border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
              <Trophy className="text-yellow-500 mx-auto mb-6 relative z-10" size={80} />
              <h2 className="text-5xl font-black text-white italic uppercase mb-2 relative z-10">¡Combate Finalizado!</h2>
              <p className="text-slate-500 mb-8 font-bold relative z-10">
                 {playerHP > 0 ? "Has demostrado una superioridad táctica absoluta." : "El estadio te ha superado esta vez..."}
              </p>
              {playerHP > 0 && (
                <div className="bg-yellow-500 text-black px-12 py-4 rounded-2xl font-black mb-12 inline-block relative z-10 shadow-xl">
                   +{Math.floor(250 * (rivalRarity === 'legendary' ? 3 : (rivalRarity === 'elite' ? 1.5 : 1.0)))} MONEDAS
                </div>
              )}
              <button onClick={() => setGameState('selecting')} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-all relative z-10">Volver al Lobby</button>
           </motion.div>
         )}
       </AnimatePresence>

       {/* BACKPACK MODAL */}
       <AnimatePresence>
         {showBackpack && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-md overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.2)]">
                 <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-cyan-500/10 to-transparent">
                    <div className="flex items-center gap-3">
                       <Box className="text-cyan-400" />
                       <h3 className="text-2xl font-black text-white italic uppercase">Tu Mochila</h3>
                    </div>
                    <button onClick={() => setShowBackpack(false)} className="text-slate-500 hover:text-white transition-colors">
                       <X size={24} />
                    </button>
                 </div>
                 <div className="p-8 grid grid-cols-1 gap-4">
                    <ItemRow 
                       icon="🧪" 
                       name="Poción de Vida" 
                       desc="Restaura 50 HP inmediatamente" 
                       count={trainerData?.items?.potion || 0}
                       onClick={() => useItem('potion')}
                    />
                    <ItemRow 
                       icon="⚡" 
                       name="Bebida Energética" 
                       desc="Recupera 50 de Energía" 
                       count={trainerData?.items?.energyDrink || 0}
                       onClick={() => useItem('energyDrink')}
                    />
                    <ItemRow 
                       icon="🧿" 
                       name="Amuleto Suerte" 
                       desc="Aumenta probabilidad de crítico" 
                       count={trainerData?.items?.luckCharm || 0}
                       onClick={() => useItem('luckCharm')}
                    />
                 </div>
                 <div className="p-6 bg-slate-950 text-center">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Los objetos se consumen al usarlos</p>
                 </div>
              </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};

const ItemRow = ({ icon, name, desc, count, onClick }: any) => (
  <button 
    disabled={count <= 0}
    onClick={onClick}
    className="flex items-center gap-4 bg-slate-950/50 border border-white/5 p-4 rounded-2xl hover:border-cyan-500/50 transition-all group disabled:opacity-30 text-left"
  >
     <div className="text-3xl bg-slate-900 w-16 h-16 rounded-xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">{icon}</div>
     <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
           <p className="text-white font-black uppercase text-xs">{name}</p>
           <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-lg text-[10px] font-black">x{count}</span>
        </div>
        <p className="text-slate-500 text-[10px] font-medium">{desc}</p>
     </div>
  </button>
);
