import { db } from './firebase';
import { doc, setDoc, updateDoc, onSnapshot, serverTimestamp, collection, addDoc, getDoc, writeBatch, deleteDoc } from 'firebase/firestore';

export interface TradeSession {
  id: string;
  proposerId: string;
  receiverId: string;
  proposerCards: string[];
  receiverCards: string[];
  status: 'pending' | 'active' | 'accepted_proposer' | 'accepted_receiver' | 'completed' | 'cancelled';
  updatedAt: any;
}

export const createTradeSession = async (proposerId: string, receiverId: string) => {
  const tradeData: any = {
    proposerId,
    receiverId,
    proposerCards: [],
    receiverCards: [],
    status: 'pending',
    updatedAt: serverTimestamp()
  };
  
  return await addDoc(collection(db, 'trades'), tradeData);
};

export const updateTradeCards = async (tradeId: string, userId: string, isProposer: boolean, cardIds: string[]) => {
  const tradeRef = doc(db, 'trades', tradeId);
  const field = isProposer ? 'proposerCards' : 'receiverCards';
  
  await updateDoc(tradeRef, {
    [field]: cardIds,
    status: 'active',
    updatedAt: serverTimestamp()
  });
};

export const acceptTrade = async (tradeId: string, isProposer: boolean) => {
  const tradeRef = doc(db, 'trades', tradeId);
  const statusField = isProposer ? 'accepted_proposer' : 'accepted_receiver';
  
  await updateDoc(tradeRef, {
    status: statusField,
    updatedAt: serverTimestamp()
  });
};

export const finalizeTrade = async (trade: TradeSession) => {
  const batch = writeBatch(db);
  const tradeRef = doc(db, 'trades', trade.id);

  // 1. Move Proposer Cards to Receiver
  for (const cid of trade.proposerCards) {
    const cardRef = doc(db, `users/${trade.proposerId}/inventory`, cid);
    const cardSnap = await getDoc(cardRef);
    if (cardSnap.exists()) {
      const newCardRef = doc(collection(db, `users/${trade.receiverId}/inventory`));
      batch.set(newCardRef, { ...cardSnap.data(), transferredFrom: trade.proposerId, updatedAt: serverTimestamp() });
      batch.delete(cardRef);
    }
  }

  // 2. Move Receiver Cards to Proposer
  for (const cid of trade.receiverCards) {
    const cardRef = doc(db, `users/${trade.receiverId}/inventory`, cid);
    const cardSnap = await getDoc(cardRef);
    if (cardSnap.exists()) {
      const newCardRef = doc(collection(db, `users/${trade.proposerId}/inventory`));
      batch.set(newCardRef, { ...cardSnap.data(), transferredFrom: trade.receiverId, updatedAt: serverTimestamp() });
      batch.delete(cardRef);
    }
  }

  // 3. Complete Trade
  batch.update(tradeRef, {
    status: 'completed',
    updatedAt: serverTimestamp()
  });

  await batch.commit();
};
