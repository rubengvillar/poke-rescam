import { db } from './firebase';
import { doc, setDoc, updateDoc, onSnapshot, serverTimestamp, collection, addDoc } from 'firebase/firestore';

export interface TradeSession {
  id?: string;
  proposerId: string;
  receiverId: string;
  proposerCards: string[]; // Card IDs
  receiverCards: string[]; // Card IDs
  status: 'pending' | 'active' | 'accepted_proposer' | 'accepted_receiver' | 'completed' | 'cancelled';
  updatedAt: any;
}

export const createTradeSession = async (proposerId: string, receiverId: string) => {
  const tradeData: TradeSession = {
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

// This function would be called when BOTH have accepted (logic in the component snapshot listener)
export const finalizeTrade = async (tradeId: string) => {
  const tradeRef = doc(db, 'trades', tradeId);
  await updateDoc(tradeRef, {
    status: 'completed',
    updatedAt: serverTimestamp()
  });
  // Note: Actual inventory transfer should happen via Cloud Functions for security
};
