import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, X, Sparkles, CheckCircle2, ChevronLeft, Upload, Image as ImageIcon } from 'lucide-react';
import { ToastProvider, useToast } from './Toast';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

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
  const [isStarting, setIsStarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [batchScans, setBatchScans] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ocrLang, setOcrLang] = useState('spa+eng');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setError(null);
    setIsStarting(true);
    const timeout = setTimeout(() => {
      if (isStarting) {
        setIsStarting(false);
        showToast("La cámara tardó demasiado en responder. Revisa los permisos.", "error");
      }
    }, 10000);

    try {
      if (stream) stopCamera();
      console.log("Scanner: Requesting permissions...");
      
      const constraints: MediaStreamConstraints = {
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      let s;
      try {
        s = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn("Scanner: 720p failed, falling back...");
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      }
      
      console.log("Scanner: Stream established:", s.id);
      setStream(s);
    } catch (err: any) {
      console.error("Scanner: Camera Error:", err);
      showToast("Error de cámara: " + (err.message || "desconocido"), "error");
    } finally {
      clearTimeout(timeout);
      setIsStarting(false);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  };

  const processImage = async (
    imageSrc: string, 
    condition: any = "Near Mint", 
    originalImage?: string, 
    visualSignature: any = null,
    headerImg?: string,
    footerImg?: string
  ) => {
    setIsScanning(true);
    setError(null);
    try {
      // 1. REGIONAL OCR (Parallel)
      const [headerRes, footerRes, fullRes] = await Promise.all([
        headerImg ? Tesseract.recognize(headerImg, 'eng+spa') : Promise.resolve({ data: { text: '' } }),
        footerImg ? Tesseract.recognize(footerImg, 'eng+spa') : Promise.resolve({ data: { text: '' } }),
        Tesseract.recognize(imageSrc, 'eng+spa')
      ]);

      const headerText = headerRes.data.text.toUpperCase();
      const footerText = footerRes.data.text.toUpperCase();
      const text = fullRes.data.text;
      const normalizedText = text.toUpperCase();

      const keywords = ['HP', 'PS', 'STAGE', 'FASE', 'ABILITY', 'HABILIDAD', 'ATTACK', 'ATAQUE', 'BASIC', 'POKÉMON'];
      const hasKeyword = keywords.some(k => normalizedText.includes(k) || headerText.includes(k));
      
      const cleanHP = headerText.match(/(\d+)\s*(HP|PS)/)?.[1] || normalizedText.match(/(\d+)\s*(HP|PS)/)?.[1] || "";
      const footerNumMatch = footerText.match(/(\d+)\s*[\/\\]\s*(\d+)/) || footerText.match(/([A-Z0-9]{3,7})/);
      const cleanNumOnly = footerNumMatch ? footerNumMatch[1] : (normalizedText.match(/(\d+)\s*[\/\\]\s*(\d+)/)?.[1] || normalizedText.match(/(\d{2,3})/)?.[1] || "");
      
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
      const typesList = ["Fire", "Water", "Grass", "Lightning", "Psychic", "Fighting", "Darkness", "Metal", "Fairy", "Dragon", "Colorless", "Fuego", "Agua", "Planta", "Rayo", "Psíquico", "Lucha", "Oscuridad", "Acero", "Hada", "Dragón"];
      const foundType = typesList.find(t => normalizedText.includes(t.toUpperCase())) || "Unknown";
      const getLevenshtein = (a: string, b: string) => {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
            else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
          }
        }
        return matrix[b.length][a.length];
      };

      const nameCandidates = lines.slice(0, 3).map(l => l.replace(/[^A-Z0-9 ]/g, '').trim());
      
      const stageMatch = normalizedText.match(/(BASIC|STAGE 1|STAGE 2|FASE 1|FASE 2|LEVEL UP|RESTORED|VMAX|VSTAR|MEGA|GX|EX)/);
      const detectedStage = stageMatch ? stageMatch[0] : "";
      const potentialAttacks = lines.filter(l => l.length > 5 && /\d+/.test(l));

      let apiCard = null;
      
      try {
        console.log(`Rigor Search for #${cleanNumOnly} (Candidates: ${nameCandidates.join(', ')})`);
        const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=number:"${cleanNumOnly}"`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          const scoredResults = await Promise.all(data.data.map(async (c: any) => {
            let score = 0;
            const apiName = c.name.toUpperCase();
            
            // 1. Name Match (Strict & Levenshtein)
            let bestNameScore = 0;
            nameCandidates.forEach(cand => {
              if (cand.length < 3) return;
              const dist = getLevenshtein(apiName, cand);
              const similarity = 1 - (dist / Math.max(apiName.length, cand.length));
              if (similarity > 0.8) bestNameScore = Math.max(bestNameScore, 60);
              else if (similarity > 0.6) bestNameScore = Math.max(bestNameScore, 30);
            });
            
            // CRITICAL: If name doesn't match at all, this is probably not the card
            if (bestNameScore === 0) return { ...c, rigorScore: -100 };
            score += bestNameScore;
            
            if (c.hp === cleanHP) score += 20;
            
            const apiTypes = (c.types || []).join(' ').toUpperCase();
            if (apiTypes.includes(foundType.toUpperCase())) score += 15;
            
            const apiStage = (c.subtypes || []).join(' ').toUpperCase();
            if (detectedStage && apiStage.includes(detectedStage)) score += 15;

            // 4. V-Card / Special Rarity Lock
            const isSpecial = /(V|VMAX|VSTAR|GX|EX|TERA)/.test(apiStage) || /(V|VMAX|VSTAR|GX|EX|TERA)/.test(apiName);
            const detectedSpecial = /(V|VMAX|VSTAR|GX|EX|TERA)/.test(detectedStage) || /(V|VMAX|VSTAR|GX|EX|TERA)/.test(normalizedText);
            if (isSpecial !== detectedSpecial) score -= 50;
            
            const apiAttacks = (c.attacks || []).map((a: any) => a.name.toUpperCase());
            const attackMatches = apiAttacks.filter((aName: string) => 
              potentialAttacks.some(pa => pa.includes(aName))
            ).length;
            score += (attackMatches * 15);

            // 6. VISUAL DNA COMPARISON
            if (visualSignature) {
               try {
                  const img = new Image();
                  img.crossOrigin = "Anonymous";
                  img.src = c.images.small;
                  await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
                  
                  if (img.complete && img.naturalWidth > 0) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 100; canvas.height = 140;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                       ctx.drawImage(img, 0, 0, 100, 140);
                       const getZoneAverage = (x: number, y: number, w: number, h: number) => {
                         const pixels = ctx.getImageData(x, y, w, h).data;
                         let r=0, g=0, b=0;
                         for(let i=0; i<pixels.length; i+=16) { r+=pixels[i]; g+=pixels[i+1]; b+=pixels[i+2]; }
                         const count = pixels.length / 16;
                         return { r: r/count, g: g/count, b: b/count };
                       };
                       const apiSignature = {
                         header: getZoneAverage(0, 0, 100, 14),
                         artwork: getZoneAverage(20, 28, 60, 42),
                         body: getZoneAverage(20, 84, 60, 28)
                       };
                       const colorDist = (c1: any, c2: any) => 
                         Math.sqrt(Math.pow(c1.r-c2.r,2) + Math.pow(c1.g-c2.g,2) + Math.pow(c1.b-c2.b,2));

                       const hDist = colorDist(visualSignature.header, apiSignature.header);
                       const aDist = colorDist(visualSignature.artwork, apiSignature.artwork);
                       const bDist = colorDist(visualSignature.body, apiSignature.body);

                       if (hDist < 50) score += 15;
                       else if (hDist > 120) score -= 30; 

                       if (aDist < 50) score += 20;
                       else if (aDist > 120) score -= 40; 

                       if (bDist < 50) score += 15;
                       else if (bDist > 120) score -= 30;
                    }
                  }
               } catch (e) { console.warn("Visual DNA failed", c.name); }
            }

            const log = `Nombre: ${bestNameScore}, HP: ${c.hp === cleanHP ? 20 : 0}, Fase: ${detectedStage && apiStage.includes(detectedStage) ? 15 : 0}, ADN: ${score - (bestNameScore + (c.hp === cleanHP ? 20 : 0) + (detectedStage && apiStage.includes(detectedStage) ? 15 : 0))}`;
            
            if (c.supertype === 'Energy' && (cleanHP || detectedStage)) score -= 70;
            return { ...c, rigorScore: score, rigorLog: log };
          }));

          const validResults = scoredResults.filter((r: any) => r.rigorScore > 0);
          validResults.sort((a: any, b: any) => b.rigorScore - a.rigorScore);
          
          if (validResults.length > 0) {
            console.log("Rigor Winner:", validResults[0].name, "Score:", validResults[0].rigorScore);
            if (validResults[0].rigorScore >= 30) apiCard = validResults[0];
          }
        }

        // TCGdex Fallback if rigor fails on primary
        if (!apiCard) {
          console.log("TCGdex Rigor Fallback...");
          const resDex = await fetch(`https://api.tcgdex.net/v2/en/cards?localId=${cleanNumOnly}`);
          const dataDex = await resDex.json();
          if (dataDex && dataDex.length > 0) {
            const scoredDex = dataDex.map((c: any) => {
              let s = 0;
              const apiName = c.name.toUpperCase();
              
              let bestDexNameScore = 0;
              nameCandidates.forEach(cand => {
                if (cand.length < 3) return;
                const dist = getLevenshtein(apiName, cand);
                const similarity = 1 - (dist / Math.max(apiName.length, cand.length));
                if (similarity > 0.7) bestDexNameScore = Math.max(bestDexNameScore, 20);
              });
              s += bestDexNameScore;
              
              if (c.stage && detectedStage && c.stage.toUpperCase().includes(detectedStage)) s += 10;
              return { ...c, rigorScore: s };
            });
            const validDex = scoredDex.filter((r: any) => r.rigorScore > 0);
            validDex.sort((a: any, b: any) => b.rigorScore - a.rigorScore);
            
            if (validDex.length > 0 && validDex[0].rigorScore >= 20) {
              const bestDex = validDex[0];
              const resFull = await fetch(`https://api.tcgdex.net/v2/en/cards/${bestDex.id}`);
              const dexFull = await resFull.json();
              
              apiCard = {
                ...dexFull,
                hp: dexFull.hp,
                types: dexFull.types,
                images: { small: dexFull.image + '/low.jpg', large: dexFull.image + '/high.jpg' },
                subtypes: [dexFull.stage],
                rarity: dexFull.rarity
              };
            }
          }
        }
        // 3. Web Search Fallback (Absolute Coverage)
        if (!apiCard) {
          console.log("Web Search Fallback...");
          const query = `${nameCandidates[0]} Pokémon card ${cleanNumOnly}`;
          // In a real app, this would call a serverless function that scrapes.
          // For now, we simulate a very specific search.
          const searchResponse = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${nameCandidates[0]}" number:"${cleanNumOnly}"`);
          const searchData = await searchResponse.json();
          if (searchData.data && searchData.data[0]) {
            apiCard = searchData.data[0];
            apiCard.rigorLog = "Obtenido mediante Búsqueda Avanzada (Web Fallback)";
          }
        }
      } catch (err) {
        console.error("Rigor Engine Error:", err);
      }

      const finalImage = originalImage || imageSrc;

      const foundCard = {
        id: apiCard?.id || `card-${nameCandidates[0] || 'Unknown'}-${cleanHP}-${cleanNumOnly}`,
        name: apiCard?.name || nameCandidates[0] || "Carta Escaneada",
        hp: apiCard?.hp || cleanHP || "???",
        type: apiCard?.types?.[0] || foundType,
        text: text.substring(0, 300),
        images: { 
          small: apiCard?.images?.small || finalImage,
          large: apiCard?.images?.large || finalImage,
          isFallback: !apiCard
        },
        rarity: apiCard?.rarity || "Custom",
        isCustom: !apiCard,
        grade: condition,
        isScanned: true,
        rigorScore: apiCard?.rigorScore || 0,
        rigorLog: apiCard?.rigorLog || "No se encontró coincidencia oficial. Guardada como captura personalizada.",
        attributes: {
          hp: apiCard?.hp || cleanHP || "???",
          stage: apiCard?.subtypes?.[0] || "Basic",
          type: apiCard?.types?.[0] || foundType,
          weakness: apiCard?.weaknesses?.[0] ? `${apiCard.weaknesses[0].type} ${apiCard.weaknesses[0].value}` : "None",
          attacks: apiCard?.attacks?.map((a: any) => a.name) || lines.filter(l => l.length > 20).slice(0, 2)
        }
      };

      if (auth.currentUser) {
        const invRef = collection(db, `users/${auth.currentUser.uid}/inventory`);
        const q = query(invRef, where('id', '==', foundCard.id));
        const dupSnap = await getDocs(q);
        if (!dupSnap.empty) {
          showToast("¡Ya tienes esta carta en tu colección!", "info");
        } else {
          await addDoc(invRef, {
            ...foundCard,
            scannedAt: serverTimestamp()
          });
          showToast(`¡${foundCard.name} guardada en tu inventario!`, "success");
        }
      }

      setBatchScans(prev => [foundCard, ...prev]);
    } catch (err) {
      console.error(err);
      showToast("Error al procesar la imagen", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const analyzeCardCondition = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const getBrightness = (x: number, y: number, w: number, h: number) => {
      const pixels = ctx.getImageData(x, y, w, h).data;
      let sum = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        sum += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      }
      return sum / (w * h);
    };

    // Check 4 edges
    const top = getBrightness(0, 0, width, 10);
    const bottom = getBrightness(0, height - 10, width, 10);
    const left = getBrightness(0, 0, 10, height);
    const right = getBrightness(width - 10, 0, 10, height);

    // Centering score (0 to 5)
    const centeringDiff = Math.abs(top - bottom) + Math.abs(left - right);
    const centeringScore = Math.max(0, 5 - (centeringDiff / 20));

    // Wear score (0 to 5) - High brightness on edges might mean whitening
    const avgEdge = (top + bottom + left + right) / 4;
    const wearScore = avgEdge > 200 ? 3 : 5;

    return Math.round(centeringScore + wearScore);
  };

  const getVisualSignature = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const getZoneAverage = (x: number, y: number, w: number, h: number) => {
      const pixels = ctx.getImageData(x, y, w, h).data;
      let r=0, g=0, b=0;
      for(let i=0; i<pixels.length; i+=16) { r+=pixels[i]; g+=pixels[i+1]; b+=pixels[i+2]; }
      const count = pixels.length / 16;
      return { r: r/count, g: g/count, b: b/count };
    };

    return {
      header: getZoneAverage(0, 0, width, height * 0.1),
      artwork: getZoneAverage(width * 0.2, height * 0.2, width * 0.6, height * 0.3),
      body: getZoneAverage(width * 0.2, height * 0.6, width * 0.6, height * 0.2)
    };
  };

  const waitForOpenCV = () => {
    return new Promise((resolve) => {
      if ((window as any).cv && (window as any).cv.onRuntimeInitialized) {
        resolve(true);
      } else {
        const check = setInterval(() => {
          if ((window as any).cv && (window as any).cv.matFromImageData) {
            clearInterval(check);
            resolve(true);
          }
        }, 100);
      }
    });
  };

  const captureFromVideo = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    if (video.videoWidth === 0) {
      showToast("Esperando señal de video...", "info");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const cropWidth = video.videoWidth * 0.7;
    const cropHeight = cropWidth * 1.4;
    const startX = (video.videoWidth - cropWidth) / 2;
    const startY = (video.videoHeight - cropHeight) / 2;

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    
    // 1. GENERATE VISUAL DNA (Raw)
    const visualSignature = getVisualSignature(ctx, cropWidth, cropHeight);
    const originalImage = canvas.toDataURL('image/jpeg', 1.0);
    const condition = analyzeCardCondition(ctx, cropWidth, cropHeight);

    // 2. ADVANCED PRE-PROCESSING (OpenCV.js)
    await waitForOpenCV();
    const cv = (window as any).cv;
    try {
      let src = cv.imread(canvas);
      let dst = new cv.Mat();
      
      // Grayscale
      cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
      
      // Gaussian Blur to reduce noise before threshold
      let ksize = new cv.Size(3, 3);
      cv.GaussianBlur(src, src, ksize, 0, 0, cv.BORDER_DEFAULT);
      
      // Softer Adaptive Threshold (Constant = 5)
      cv.adaptiveThreshold(src, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 15, 5);
      
      // Denoise
      cv.medianBlur(dst, dst, 3);
      
      cv.imshow(canvas, dst);
      src.delete(); dst.delete();
    } catch (e) {
      console.warn("OpenCV Processing failed, using basic filter", e);
      // Fallback basic filter
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const val = avg > 120 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = val;
      }
      ctx.putImageData(imageData, 0, 0);
    }
    
    // 3. SEGMENTED CROPS (Triple Crop)
    const headerCanvas = document.createElement('canvas');
    headerCanvas.width = cropWidth; headerCanvas.height = cropHeight * 0.2;
    const hCtx = headerCanvas.getContext('2d');
    if (hCtx) hCtx.drawImage(canvas, 0, 0, cropWidth, cropHeight * 0.2, 0, 0, cropWidth, cropHeight * 0.2);

    const footerCanvas = document.createElement('canvas');
    footerCanvas.width = cropWidth; footerCanvas.height = cropHeight * 0.15;
    const fCtx = footerCanvas.getContext('2d');
    if (fCtx) fCtx.drawImage(canvas, 0, cropHeight * 0.85, cropWidth, cropHeight * 0.15, 0, 0, cropWidth, cropHeight * 0.15);

    const headerImg = headerCanvas.toDataURL('image/jpeg', 0.9);
    const footerImg = footerCanvas.toDataURL('image/jpeg', 0.9);
    const fullImg = canvas.toDataURL('image/jpeg', 0.9);

    processImage(fullImg, condition, originalImage, visualSignature, headerImg, footerImg);
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

  const [isStable, setIsStable] = useState(false);
  const stabilityCounter = useRef(0);
  const lastFrameData = useRef<Uint8ClampedArray | null>(null);

  useEffect(() => {
    let animationFrame: number;
    
    const checkStability = () => {
      if (stream && videoRef.current && canvasRef.current && !isScanning) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (ctx && video.videoWidth > 0) {
          // Check a small central area for stability
          const checkSize = 100;
          const x = (video.videoWidth - checkSize) / 2;
          const y = (video.videoHeight - checkSize) / 2;
          
          ctx.drawImage(video, x, y, checkSize, checkSize, 0, 0, checkSize, checkSize);
          const currentFrame = ctx.getImageData(0, 0, checkSize, checkSize).data;
          
          if (lastFrameData.current) {
            let diff = 0;
            for (let i = 0; i < currentFrame.length; i += 4) {
              diff += Math.abs(currentFrame[i] - lastFrameData.current[i]);
            }
            
            const normalizedDiff = diff / (checkSize * checkSize);
            if (normalizedDiff < 15) { // Threshold for "stable"
              stabilityCounter.current++;
              if (stabilityCounter.current > 30) { // Stable for ~1 second
                setIsStable(true);
                captureFromVideo();
                stabilityCounter.current = -60; // Wait 2 seconds before next auto-capture
              }
            } else {
              stabilityCounter.current = 0;
              setIsStable(false);
            }
          }
          lastFrameData.current = currentFrame;
        }
      }
      animationFrame = requestAnimationFrame(checkStability);
    };

    checkStability();
    return () => cancelAnimationFrame(animationFrame);
  }, [stream, isScanning]);

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
                disabled={isStarting}
                className={`bg-white text-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 ${isStarting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cyan-400'}`}
              >
                {isStarting ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  'Abrir Cámara'
                )}
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
               {/* Sombra exterior para enfocar el centro */}
               <div className="absolute inset-0 bg-slate-950/60" style={{ clipPath: 'polygon(0% 0%, 0% 100%, 15% 100%, 15% 15%, 85% 15%, 85% 85%, 15% 85%, 15% 100%, 100% 100%, 100% 0%)' }} />
               
             <div className={`w-[70%] aspect-[1/1.4] border-2 border-dashed transition-colors duration-300 rounded-3xl relative ${isStable ? 'border-emerald-400' : 'border-cyan-400/30'}`}>
                    <div className="absolute -top-12 left-0 w-full text-center">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/80 animate-pulse">Alinea los bordes de la carta</p>
                    </div>
                    <div className={`absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 rounded-tl-2xl transition-colors ${isStable ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]'}`} />
                    <div className={`absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 rounded-tr-2xl transition-colors ${isStable ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]'}`} />
                    <div className={`absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 rounded-bl-2xl transition-colors ${isStable ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]'}`} />
                    <div className={`absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 rounded-br-2xl transition-colors ${isStable ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]'}`} />
                    
                    {/* REGIONAL GUIDES (Segmented Rigor) */}
                    <div className="absolute inset-0 pointer-events-none">
                      <motion.div 
                        animate={{ opacity: isStable ? 1 : 0.3 }}
                        className="absolute top-[2%] left-[5%] right-[5%] h-[15%] border border-dashed border-red-500/40 rounded-xl flex items-start justify-center pt-1"
                      >
                         <span className="text-[7px] font-black text-red-500/60 uppercase tracking-widest">Nombre / HP</span>
                      </motion.div>

                      <motion.div 
                        animate={{ opacity: isStable ? 1 : 0.3 }}
                        className="absolute bottom-[2%] left-[5%] right-[5%] h-[12%] border border-dashed border-red-500/40 rounded-xl flex items-end justify-center pb-1"
                      >
                         <span className="text-[7px] font-black text-red-500/60 uppercase tracking-widest">Nº Colección</span>
                      </motion.div>
                    </div>

                    <motion.div 
                      animate={{ top: ['10%', '90%', '10%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className={`absolute left-4 right-4 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)] z-10 ${isStable ? 'opacity-0' : 'opacity-100'}`}
                    />

                    <div className="absolute inset-0 flex items-center justify-center">
                       <p className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${isStable ? 'text-emerald-400' : 'text-cyan-400/50'}`}>
                         {isStable ? 'Capturando...' : 'Mantén estable'}
                       </p>
                    </div>
                </div>
            </div>

            {/* RECENT SCANS CAROUSEL */}
            {batchScans.length > 0 && (
              <div className="absolute bottom-28 left-0 w-full px-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <AnimatePresence>
                  {batchScans.map((scan, i) => (
                    <motion.div 
                      key={scan.id + i}
                      initial={{ opacity: 0, scale: 0.5, x: -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      className="w-12 h-16 rounded-lg border border-white/20 overflow-hidden flex-shrink-0 shadow-lg"
                    >
                      <img src={scan.images?.small} className="w-full h-full object-cover" />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

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
                className="flex-1 bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:bg-cyan-400 transition-all active:scale-95"
              >
                {isScanning ? <RefreshCw className="animate-spin" size={24} /> : (
                  <>
                    <div className="w-4 h-4 bg-black rounded-full animate-pulse" />
                    Capturar
                  </>
                )}
              </button>
              {batchScans.length > 0 && (
                 <button 
                   onClick={() => setResult(batchScans[0])}
                   className="p-5 bg-emerald-500 text-black rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
                 >
                   <CheckCircle2 size={24} />
                 </button>
               )}
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
