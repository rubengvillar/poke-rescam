// src/lib/scanner-service.ts
import Tesseract from 'tesseract.js';

export const getLevenshtein = (a: string, b: string) => {
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

export const fetchPokeAPI = async (name: string) => {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase().replace(/[^a-z]/g, '')}`);
    if (!res.ok) return null;
    const data = await res.json();
    
    // Get species for description
    const speciesRes = await fetch(data.species.url);
    const speciesData = await speciesRes.json();
    const description = speciesData.flavor_text_entries.find((e: any) => e.language.name === 'es')?.flavor_text || 
                        speciesData.flavor_text_entries.find((e: any) => e.language.name === 'en')?.flavor_text || "";

    return {
      name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
      hp: data.stats.find((s: any) => s.stat.name === 'hp')?.base_stat,
      types: data.types.map((t: any) => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)),
      description: description.replace(/\f/g, ' '),
      animatedSprite: data.sprites.versions['generation-v']['black-white'].animated.front_default || data.sprites.front_default,
      cryUrl: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${data.id}.ogg`
    };
  } catch (e) {
    console.warn("PokeAPI failed", e);
    return null;
  }
};

export const reIdentifyCard = async (cardName: string, cardNum: string, originalOcrText: string = "") => {
  let apiCard = null;
  let warning = null;

  // 0. RIGOR CHECK: Verify if user input matches something in the original OCR
  const normalizedOcr = originalOcrText.toUpperCase();
  const normalizedManual = cardName.toUpperCase();
  
  const words = normalizedOcr.split(/\s+/);
  let maxSim = 0;
  words.forEach(word => {
    if (word.length < 3) return;
    const dist = getLevenshtein(normalizedManual, word);
    const sim = 1 - (dist / Math.max(normalizedManual.length, word.length));
    if (sim > maxSim) maxSim = sim;
  });

  // Option B: Warning if similarity < 40%
  if (originalOcrText && maxSim < 0.4) {
    warning = `La cámara detectó algo muy diferente. ¿Estás seguro de que es un ${cardName}?`;
  }

  // 1. Primary API (Direct search by Name and Number)
  const query = `name:"${cardName}" number:"${cardNum}"`;
  const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  
  if (data.data && data.data[0]) {
    apiCard = data.data[0];
    apiCard.rigorLog = `Validación Manual: Similitud OCR ${Math.round(maxSim * 100)}%${warning ? ' (Advertencia)' : ''}`;
    apiCard.verifiedByUser = true;
  } 

  // 2. TCGdex Fallback (Direct)
  if (!apiCard) {
    const resDex = await fetch(`https://api.tcgdex.net/v2/en/cards?localId=${cardNum}`);
    const dataDex = await resDex.json();
    if (dataDex && dataDex.length > 0) {
      // Find the one that matches name best
      const match = dataDex.find((c: any) => c.name.toLowerCase().includes(cardName.toLowerCase())) || dataDex[0];
      const resFull = await fetch(`https://api.tcgdex.net/v2/en/cards/${match.id}`);
      const dexFull = await resFull.json();
      apiCard = {
        ...dexFull,
        images: { small: dexFull.image + '/low.jpg', large: dexFull.image + '/high.jpg' },
        rigorLog: "Validación Manual (TCGdex): Datos confirmados por el usuario."
      };
    }
  }

  // 3. Fallback PokeAPI (for stats/sprites if custom)
  if (!apiCard) {
    const pokeData = await fetchPokeAPI(cardName);
    if (pokeData) {
      apiCard = {
        ...pokeData,
        id: `custom-${cardName}-${cardNum}`,
        isCustom: true,
        // No overwrite images object here to preserve the original capture
        rigorLog: "Validación Manual (PokeAPI): Datos enriquecidos vía PokeAPI"
      };
    }
  }

  return { card: apiCard, warning };
};
