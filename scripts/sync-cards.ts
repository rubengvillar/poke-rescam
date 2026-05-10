import axios from 'axios';
import admin from 'firebase-admin';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Load credentials
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();
const TCGDEX_API = 'https://api.tcgdex.net/v2/en/cards';
const POKEAPI = 'https://pokeapi.co/api/v2/pokemon';

export async function syncHybridData() {
  console.log('--- Starting Hybrid Sync (TCGdex + PokéAPI) ---');
  
  try {
    const response = await axios.get(TCGDEX_API);
    const cards = response.data;
    const selectedCards = cards.slice(0, 100); 

    const batch = db.batch();

    for (const summary of selectedCards) {
      try {
        // 1. Fetch TCG Data
        const detailRes = await axios.get(`${TCGDEX_API}/${summary.id}`);
        const card = detailRes.data;

        // 2. Fetch Video Game Data from PokéAPI
        let cryUrl = null;
        let animatedSprite = null;
        let fallbackArtwork = null;

        try {
          const pokeName = card.name.toLowerCase().split(' ')[0].replace(/[^a-z]/g, '');
          const pokeRes = await axios.get(`${POKEAPI}/${pokeName}`);
          const p = pokeRes.data;
          
          cryUrl = p.cries?.latest || p.cries?.legacy;
          animatedSprite = p.sprites.other?.showdown?.front_default || p.sprites.front_default;
          fallbackArtwork = p.sprites.other?.['official-artwork']?.front_default;
        } catch (e) {
          console.log(`No PokéAPI data for ${card.name}`);
        }

        const cardRef = db.collection('cards').doc(card.id);
        
        // Handle images with fallback logic
        const images = card.image ? {
          small: `${card.image}/low.jpg`,
          large: `${card.image}/high.jpg`,
          isFallback: false
        } : {
          small: fallbackArtwork || 'https://images.pokemontcg.io/base1/back.png',
          large: fallbackArtwork || 'https://images.pokemontcg.io/base1/back.png',
          isFallback: true
        };

        batch.set(cardRef, {
          name: card.name,
          tcgId: card.id,
          hp: card.hp || '0',
          types: card.types || [],
          stage: card.stage || 'Basic',
          evolveFrom: card.evolveFrom || null,
          rarity: card.rarity || 'Common',
          description: card.description || card.flavorText || '',
          attacks: card.attacks || [],
          randomSeed: Math.random(),
          images: images,
          cryUrl: cryUrl,
          animatedSprite: animatedSprite,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Synced: ${card.name} ${images.isFallback ? '(Fallback Card)' : ''}`);
      } catch (err) {
        console.error(`Error syncing ${summary.id}`);
      }
    }

    await batch.commit();
    console.log('Hybrid sync completed.');
  } catch (error) {
    console.error('Fatal sync error:', error);
  }
}

syncHybridData();
