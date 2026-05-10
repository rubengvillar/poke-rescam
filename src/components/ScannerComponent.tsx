import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, X, Sparkles, CheckCircle2, ChevronLeft, Upload, Image as ImageIcon } from 'lucide-react';
import { ToastProvider, useToast } from './Toast';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const ScannerComponent = () => {
  return (
    <ToastProvider>
       <ScannerContent />
    </ToastProvider>
  );
};

const ScannerContent = () => {
  const { showToast } = useToast();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setError(null);
    try {
      if (stream) stopCamera();
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: 'environment' } } 
      });
      setStream(s);
    } catch (err: any) {
      console.error("Camera Error:", err);
      showToast("No se pudo iniciar cámara. Usa la opción de subir foto.", "warning");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  };

  const processImage = async (imageSrc: string) => {
    setIsScanning(true);
    try {
      const { data: { text } } = await Tesseract.recognize(imageSrc, 'eng');
      console.log("OCR Result:", text);
      
      // Expanded keywords for better detection (English + Spanish)
      const keywords = [
        'HP', 'PS', 'STAGE', 'FASE', 'ABILITY', 'HABILIDAD', 'ATTACK', 'ATAQUE', 
        'WEAKNESS', 'DEBILIDAD', 'RESISTANCE', 'RESISTENCIA', 'RETREAT', 'RETIRADA',
        'EVOLVES', 'EVOLUCIONA', 'POKÉMON', 'TRAINER', 'ENTRENADOR', 'ENERGY', 'ENERGÍA', 
        'BASIC', 'BÁSICO', 'LEVEL', 'ITEM', 'SUPPORTER', 'PARTIDARIO'
      ];
      
      const normalizedText = text.toUpperCase();
      // Look for at least one match or any number/number pattern (e.g. 120/150)
      const hasKeyword = keywords.some(k => normalizedText.includes(k));
      const hasNumberPattern = /\d+\/\d+/.test(normalizedText);

      if (!hasKeyword && !hasNumberPattern) {
        showToast("No se detectó una carta válida. Intenta con más luz.", "error");
        return;
      }

      const typesList = [
        'Fire', 'Water', 'Grass', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Fairy', 'Dragon', 'Colorless',
        'Fuego', 'Agua', 'Planta', 'Rayo', 'Psíquico', 'Lucha', 'Oscuridad', 'Acero', 'Hada', 'Dragón', 'Incoloro'
      ];
      
      const foundType = typesList.find(t => normalizedText.includes(t.toUpperCase())) || "Unknown";
      const weaknessMatch = normalizedText.match(/(WEAKNESS|DEBILIDAD)\s*([A-Z]+)\s*([X×]\d+)/i);

      const foundCard = {
        id: 'scanned-' + Date.now(),
        name: normalizedText.split('\n')[0] || "Carta Escaneada",
        hp: normalizedText.match(/(\d+)\s*(HP|PS)/)?.[1] || "???",
        type: foundType,
        text: text.substring(0, 300),
        images: { small: imageSrc },
        rarity: "Custom",
        isCustom: true,
        attributes: {
          hp: normalizedText.match(/(\d+)\s*(HP|PS)/)?.[1] || "???",
          stage: normalizedText.match(/(STAGE|FASE)\s*(\d+)/i)?.[2] || "Basic",
          type: foundType,
          weakness: weaknessMatch ? `${weaknessMatch[2]} ${weaknessMatch[3]}` : "None",
          attacks: text.split('\n').filter(l => l.length > 20).slice(0, 2)
        }
      };

      if (auth.currentUser) {
        await addDoc(collection(db, `users/${auth.currentUser.uid}/inventory`), {
          ...foundCard,
          scannedAt: serverTimestamp()
        });
      }
      setResult(foundCard);
      showToast("¡Carta añadida a tu colección!");
    } catch (err) {
      showToast("Error al procesar la imagen", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const captureFromVideo = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    if (video.videoWidth === 0) {
      showToast("Esperando señal de video...", "info");
      return;
    }

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    processImage(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        processImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const getTypeConfig = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('fire') || t.includes('fuego')) return { icon: '🔥', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    if (t.includes('water') || t.includes('agua')) return { icon: '💧', color: 'text-blue-500', bg: 'bg-blue-500/10' };
    if (t.includes('grass') || t.includes('planta')) return { icon: '🌿', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    if (t.includes('lightning') || t.includes('rayo')) return { icon: '⚡', color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    if (t.includes('psychic') || t.includes('psíquico')) return { icon: '🔮', color: 'text-purple-500', bg: 'bg-purple-500/10' };
    if (t.includes('fighting') || t.includes('lucha')) return { icon: '👊', color: 'text-red-700', bg: 'bg-red-700/10' };
    if (t.includes('darkness') || t.includes('oscuridad')) return { icon: '🌙', color: 'text-slate-400', bg: 'bg-slate-400/10' };
    if (t.includes('metal') || t.includes('acero')) return { icon: '⚙️', color: 'text-slate-300', bg: 'bg-slate-300/10' };
    if (t.includes('fairy') || t.includes('hada')) return { icon: '✨', color: 'text-pink-400', bg: 'bg-pink-400/10' };
    if (t.includes('dragon') || t.includes('dragón')) return { icon: '🐲', color: 'text-indigo-500', bg: 'bg-indigo-500/10' };
    return { icon: '⚪', color: 'text-slate-500', bg: 'bg-slate-500/10' };
  };

  console.log("ScannerContent rendering. Stream:", !!stream, "Result:", !!result);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
      </div>

      <header className="absolute top-8 left-8 z-[60]">
        <a href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest text-white/50">Dashboard</span>
        </a>
      </header>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileUpload} 
      />

      <div className="w-full max-w-4xl flex flex-col items-center justify-center">
        {!stream && !result && (
          <div className="text-center">
            <div className="w-24 h-24 bg-cyan-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.1)]">
              <Camera className="text-cyan-400" size={40} />
            </div>
            <h2 className="text-4xl font-black text-white italic uppercase mb-3 tracking-tighter">Escáner de Cartas</h2>
            <p className="text-slate-500 mb-10 max-w-xs mx-auto text-sm font-medium">Usa tu cámara para identificar cartas o sube una imagen desde tu galería</p>
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={startCamera}
                className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-xl active:scale-95"
              >
                Abrir Cámara
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest border border-white/5 hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
              >
                <Upload size={20} /> Subir Foto
              </button>
            </div>
          </div>
        )}

        {stream && !result && (
          <div className="relative w-full max-w-md aspect-[3/4] bg-slate-900 rounded-[3rem] overflow-hidden border-2 border-white/10 shadow-2xl">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-88 border-2 border-dashed border-cyan-400/30 rounded-3xl relative">
                  <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-cyan-400 rounded-tl-2xl" />
                  <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-cyan-400 rounded-tr-2xl" />
                  <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-cyan-400 rounded-bl-2xl" />
                  <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-cyan-400 rounded-br-2xl" />
              </div>
            </div>

            <div className="absolute bottom-8 left-0 w-full flex justify-center gap-4 px-8">
              <button 
                onClick={stopCamera}
                className="p-5 bg-black/50 backdrop-blur-xl rounded-2xl text-white border border-white/10 hover:bg-red-500/20 hover:text-red-400 transition-all"
              >
                <X size={24} />
              </button>
              <button 
                disabled={isScanning}
                onClick={captureFromVideo}
                className="flex-1 bg-cyan-500 text-black py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
              >
                {isScanning ? <RefreshCw className="animate-spin" size={24} /> : (
                  <>
                    <ImageIcon size={20} /> Analizar
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-slate-900/50 border border-white/5 p-8 rounded-[3rem] max-w-md w-full text-center backdrop-blur-2xl shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
              <CheckCircle2 className="text-emerald-400" size={32} />
            </div>
            
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-4">{result.name}</h2>
              
              <div className="flex justify-center gap-3 mb-6">
                <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border border-white/5 ${getTypeConfig(result.type).bg}`}>
                  <span className="text-lg">{getTypeConfig(result.type).icon}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${getTypeConfig(result.type).color}`}>{result.type}</span>
                </div>
                <div className="px-4 py-2 rounded-xl flex items-center gap-2 bg-red-500/10 border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400">HP {result.hp}</span>
                </div>
              </div>

              {result.attributes.weakness !== "None" && (
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">
                  Debilidad: <span className="text-slate-300">{result.attributes.weakness}</span>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => { setResult(null); startCamera(); }}
              className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-xl mb-4"
            >
              Escanear Otra
            </button>
            <a 
              href="/inventory"
              className="block text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] hover:text-white transition-colors"
            >
              Ir a mi Inventario
            </a>
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold uppercase tracking-widest backdrop-blur-xl">
          {error}
        </div>
      )}
    </div>
  );
};
