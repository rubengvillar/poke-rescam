# Memoria del Proyecto (MEMORY.md)

Este archivo registra el contexto, los avances y el estado actual de `poke_rescam`. Debe ser actualizado por cada agente/humano después de cada hito.

## Estado Actual del Proyecto (Snapshot)
- **Nombre**: Poke-Rescam
- **Tecnología**: Astro 4.0, React 18, Tailwind 3.3, Firebase 10.
- **Funcionalidades Core**:
    - **Escáner**: Implementado con Tesseract.js para identificar cartas mediante OCR y guardarlas en Firestore.
    - **Inventario**: Estructura básica para listar cartas del usuario.
    - **Juegos**: Módulos para "Stadium Battle", "Evolution Memory", "Type Quiz", etc. (En desarrollo/estabilización).
    - **Trading**: Servicio de intercambio configurado.
    - **Packs**: Lógica para abrir sobres de cartas.

## Historial de Avances

### 2026-05-10
- **Tarea**: Documentación inicial y establecimiento de reglas para agentes.
- **Cambios**:
    - Creación de `Agents.md` con reglas de "no suposición".
    - Creación de `MEMORY.md` (este archivo).
    - Creación de `docs/STRUCTURE.md` con desglose técnico.
    - Actualización de `README.md`.
- **Hito**: Implementación de mecánicas de tiempo (60s) y vidas (5) en el mini-juego de Memoria Evolutiva.
    - Se aumentó el número de vidas iniciales de 3 a 5 por petición del usuario.
    - Se añadió una barra HUD superior con iconos de `Timer` y `Heart`.
    - Se implementaron pantallas de Game Over específicas para pérdida por tiempo y por vidas.
- **Hito**: Solución de atributos faltantes en Batalla de Atributos.
    - Se implementó la función `getCardStat` para evitar mostrar "??".
    - Valores por defecto: HP 40, Ataque 10, Defensa 10.
    - Se corrigió un problema de superposición del botón "Salir" en el HUD.
    - **Mejora**: Refactorización del selector de inventario para mostrar "Mini-Cards" estilizadas, permitiendo ver nombres y estadísticas incluso en cartas fallback/custom.
- **Hito**: Sistema de Atributos y Mochila del Entrenador.
    - Se rediseñó la **Carta de Entrenador** con un estilo Cyberpunk/Premium.
    - Se implementó un sistema de **Puntos de Atributo** (Ataque, Defensa, Suerte, Energía) que el usuario reparte manualmente.
    - Se activó el **Sistema de Subida de Nivel**: Ahora el XP acumulado permite subir de nivel, aumentando los requisitos de XP dinámicamente (+20% por nivel).
    - Se añadieron **Recompensas Aleatorias** al subir de nivel (Monedas y Polvo Estelar extra) y se otorgan +5 puntos de atributo por cada nivel.
    - Se añadió un sistema de **Rangos/Tiers** (Común a Maestro) según el nivel.
    - Se añadió la **Mochila (Backpack)** en el Stadium Battle para usar objetos (Pociones, Bebidas, Amuletos).
    - Se integraron multiplicadores de daño y defensa basados en los atributos del entrenador.
    - Se añadieron estadísticas de **Partidas Ganadas** y **Racha de Victorias** al perfil.
- **Hito**: Navegación y Menú Principal.
    - Se implementó un **Menú Lateral (Drawer)** premium accesible desde el Dashboard.
    - Se añadió un **Navbar Superior** con desenfoque de fondo y logo.
    - Se integró la función de **Cerrar Sesión** con Firebase Auth.
    - El menú incluye accesos rápidos a Perfil, Colección, Tienda, Juegos e Intercambio.
- **Hito**: Sistema Social y Amigos.
    - Se implementó la lógica de **Solicitudes de Amistad** (enviar, recibir, aceptar, rechazar).
    - Se añadió una sección de **ID Manual** para añadir amigos sin necesidad de cámara.
    - Se visualiza la lista de amigos conectados y solicitudes pendientes en tiempo real.
- **Hito**: Overhaul táctico de Stadium Battle.
    - Se implementó un sistema de energía (Mana) para ataques.
    - Se añadió una tabla de tipos completa y multiplicadores de daño (x1.5 / x0.5).
    - Se incluyeron estados alterados (Quemado, Veneno, Parálisis) con efectos visuales.
    - **Dificultad Dinámica**: Los rivales ahora escalan según el XP del jugador.
    - **Encuentros Aleatorios**: Se añadieron rivales de rareza "Élite" y "Legendario" (5% de probabilidad) con aviso visual y recompensas triplicadas.
    - **IA Inteligente**: El bot ahora gestiona su energía y se defiende estratégicamente.
    - **Presión en Tiempo Real**: Se añadió un temporizador de turno de 10 segundos para el jugador. Si el tiempo se agota, el rival ataca automáticamente.
    - Mejora de UI: Barras de energía, iconos de estado, alerta de rival legendario y contador de turno.

## Próximos Pasos (Pendientes)
1.  **Refinar Escáner**: Mejorar la precisión del OCR o integrar una API de reconocimiento visual más robusta.
2.  **Finalizar Juegos**: Asegurar que todos los mini-juegos en `src/pages/games/` sean funcionales y estén conectados al inventario real.
3.  **Sistema de Trading**: Completar la interfaz de usuario para el servicio de intercambios.
4.  **Optimización**: Revisar el rendimiento de la carga de imágenes de cartas.

---
*Mantener este registro actualizado es vital para la continuidad del desarrollo.*
