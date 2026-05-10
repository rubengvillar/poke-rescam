import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const ScannerComponent = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      setError("No se pudo acceder a la cámara. Asegúrate de dar permisos.");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsScanning(true);
    
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    
    const imageData = canvasRef.current.toDataURL('image/png');
    
    try {
      // 1. OCR to find card name/fields
      const { data: { text } } = await Tesseract.recognize(imageData, 'eng');
      console.log("OCR Result:", text);

      // 2. Simple logic to "identify" (Simplified for demo)
      // In a real app, you'd compare this text or a visual hash with the database
      const foundCard = {
        id: 'scanned-' + Date.now(),
        name: "Pokémon Detectado",
        text: text.substring(0, 100),
        images: { small: imageData }, // Use captured image for custom cards
        rarity: "Custom",
        isCustom: true
      };

      setResult(foundCard);
      
      // 3. Save to inventory
      if (auth.currentUser) {
        await addDoc(collection(db, `users/${auth.currentUser.uid}/inventory`), {
          ...foundCard,
          scannedAt: serverTimestamp()
        });
      }
    } catch (err) {
      setError("Error al procesar la imagen.");
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {!stream && !result ? (
          <motion.div 
            key="start"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-cyan-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
              <Camera className="text-cyan-400" size={40} />
            </div>
            <h2 className="text-3xl font-black text-white italic uppercase mb-2">Escáner de Cartas</h2>
            <p className="text-slate-500 mb-8 max-w-xs mx-auto">Apunta a una carta física para identificarla y añadirla a tu colección</p>
            <button 
              onClick={startCamera}
              className="bg-white text-black px-12 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors"
            >
              Iniciar Cámara
            </button>
          </motion.div>
        ) : stream && !result ? (
          <motion.div 
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full max-w-md aspect-[3/4] bg-black rounded-[2.5rem] overflow-hidden border-2 border-slate-800 shadow-2xl"
          >
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Viewfinder Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-88 border-2 border-dashed border-cyan-400/50 rounded-2xl">
                 <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl" />
                 <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl" />
                 <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl" />
                 <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-xl" />
              </div>
            </div>

            <div className="absolute bottom-8 left-0 w-full flex justify-center gap-4 px-8">
              <button 
                onClick={stopCamera}
                className="p-4 bg-slate-900/80 backdrop-blur-md rounded-2xl text-white hover:bg-red-500 transition-colors"
              >
                <X size={24} />
              </button>
              <button 
                disabled={isScanning}
                onClick={captureAndScan}
                className="flex-1 bg-cyan-500 text-black py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {isScanning ? <RefreshCw className="animate-spin" size={20} /> : "Analizar Carta"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] max-w-md w-full text-center"
          >
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-emerald-500" size={40} />
            </div>
            <h2 className="text-2xl font-black text-white italic uppercase mb-2">¡Carta Añadida!</h2>
            <p className="text-slate-500 mb-8">Hemos identificado y guardado la carta en tu inventario.</p>
            
            <div className="mb-8 flex justify-center">
               <CardHologram card={result} />
            </div>

            <button 
              onClick={() => { setResult(null); startCamera(); }}
              className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
            >
              Escanear Otra
            </button>
            <a 
              href="/inventory"
              className="block mt-4 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-cyan-400"
            >
              Ir a mi Colección
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
          {error}
        </div>
      )}
    </div>
  );
};
