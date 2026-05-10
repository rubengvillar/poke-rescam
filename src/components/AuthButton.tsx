import React from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { motion } from 'framer-motion';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';

export const AuthButton = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  if (loading) return (
    <div className="h-14 w-48 bg-slate-900 animate-pulse rounded-2xl border border-slate-800" />
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {!user ? (
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={login}
          className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all"
        >
          <LogIn size={20} />
          CONECTAR CUENTA
        </motion.button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-3xl border border-slate-800 backdrop-blur-xl">
            <img 
              src={user.photoURL || ''} 
              alt={user.displayName || ''} 
              className="w-12 h-12 rounded-full border-2 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            />
            <div className="text-left">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Bienvenido,</p>
              <p className="text-white font-bold">{user.displayName?.split(' ')[0]}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
             <motion.a
              href="/dashboard"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider"
            >
              <UserIcon size={18} />
              Entrar
            </motion.a>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="flex items-center justify-center w-12 bg-slate-800 text-slate-400 p-3 rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-colors"
            >
              <LogOut size={18} />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};
