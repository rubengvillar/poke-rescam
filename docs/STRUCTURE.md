# Estructura del Proyecto (STRUCTURE.md)

Este documento detalla la organización técnica y los patrones de diseño de `poke_rescam`.

## Arquitectura de Carpetas

- **`/src/pages`**: Define las rutas del sitio.
    - `index.astro`: Página de inicio.
    - `scan.astro`: Interfaz de escaneo de cartas.
    - `inventory.astro`: Colección del usuario.
    - `games/`: Subrutas para mini-juegos específicos.
- **`/src/components`**: Componentes React y Astro reutilizables.
    - `ScannerComponent.tsx`: Lógica compleja de cámara y OCR.
    - `CardHologram.tsx`: Renderizado visual premium de las cartas.
- **`/src/lib`**: Configuración de servicios externos.
    - `firebase.ts`: Inicialización de Firebase (Auth/Firestore).
    - `trade-service.ts`: Lógica de negocio para intercambios.
- **`/src/layouts`**: Plantillas globales.
    - `Layout.astro`: Contiene el `<head>`, fuentes (Outfit) y estilos globales de Tailwind.
- **`/scripts`**: Utilidades de desarrollo (ej. `sync-cards.ts`).

## Sistema de Estilos
- **Tailwind CSS**: Se utiliza como motor principal.
- **Paleta de Colores**: Basada en `slate-950` para fondos, con acentos en `cyan-400/50` y `emerald-500` para estados positivos.
- **Animaciones**: Se utiliza `framer-motion` para transiciones de UI y `framer-motion-3d` (si aplica) para efectos de cartas.
- **Fuentes**: `Outfit` (Google Fonts), cargada globalmente en `Layout.astro`.

## Funcionalidades Principales

### 1. Escaneo (OCR)
Usa `tesseract.js` en el cliente para leer texto de imágenes capturadas por la cámara. Los datos extraídos se normalizan y se guardan en la colección `users/{uid}/inventory`.

### 2. Mini-Juegos
Basados en React para la interactividad. Utilizan los datos del inventario del usuario para dinámicas de juego (ej. comparar atributos de cartas).

### 3. Sincronización de Cartas
El script en `scripts/sync-cards.ts` permite actualizar la base de datos local o de Firebase con datos externos de APIs de Pokémon TCG.

## Errores Conocidos y Soluciones
- **Acceso a Cámara**: Requiere HTTPS o `localhost` para funcionar en navegadores modernos.
- **Firestore Latency**: Usar estados optimistas en React para una experiencia más fluida.
