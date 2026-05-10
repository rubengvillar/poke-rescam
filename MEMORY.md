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
- **Hito**: Estabilización y Mejora del Escáner (Overhaul).
    - Se implementó un sistema de **Doble Vía**: Cámara en vivo + Subida de archivos (Fallback) para máxima compatibilidad móvil.
    - Se añadió **Validación OCR**: El sistema ahora verifica que la imagen sea una carta de Pokémon buscando palabras clave (HP, PS, Stage, etc.) en español e inglés.
    - Se implementó **Extracción Estructurada de Datos**: Ahora se parsea automáticamente el HP/PS, Nombre, Tipo, Debilidad y Fase, guardándolos en campos específicos de Firestore.
    - Se añadió **Mapeo Visual de Tipos**: Iconos emoji y colores temáticos según el elemento detectado (Fuego, Agua, etc.).
    - Mejora de UX: Botón de retorno al Dashboard y logs de depuración integrados.
- **Hito**: Optimización del Dashboard.
    - Se reordenó el grid para dispositivos móviles: Acciones primero, Perfil después.
    - Se compactaron las tarjetas de acción para reducir el scroll.
    - Se corrigieron errores de navegación y se aseguró la persistencia del estado en el menú lateral.

## Próximos Pasos (Pendientes)
1.  **Refinar Escáner**: Mejorar la precisión del OCR o integrar una API de reconocimiento visual más robusta.
2.  **Finalizar Juegos**: Asegurar que todos los mini-juegos en `src/pages/games/` sean funcionales y estén conectados al inventario real.
- **Hito**: Sistema de Intercambio (Trade Room) en tiempo real.
    - Se implementó la **Sala de Intercambio** con vista dividida (Split-View).
    - Se integró un **Selector de Cartas** dinámico desde el inventario.
    - Se estableció el sistema de **Doble Confirmación** (Double-Check) para evitar estafas.
    - Sincronización instantánea mediante Firestore `onSnapshot`.
    - Animaciones de éxito y transición fluida entre estados.
- **Hito**: Optimización de Inventario y Control de Duplicados.
    - Se implementó el **Stacking de Cartas**: Las cartas repetidas se agrupan visualmente con un contador (x2, x3), limpiando la interfaz.
    - Se corrigió el error de **Keys duplicadas** en React usando IDs de Firestore únicos para cada instancia.
    - Se implementó la **Prevención de Escaneo Duplicado**: El sistema bloquea el escaneo de una carta que el usuario ya posee basándose en un ID normalizado (Nombre + HP + Número).
    - Se mejoró el **Procesamiento de Imagen**: Ahora el escáner realiza un **Auto-Crop** (recorte) al área del marco guía, eliminando el fondo y mejorando el OCR.
    - Se pulió la estética del escáner con efectos de **Glassmorphism**, desenfoque de fondo y líneas de escaneo animadas.

- **Hito**: Motor de Rigor y Precisión Total en el Escáner.
    - Se implementó el **Motor de Rigor Pro**: Un sistema de validación de 6 factores que compara Nombre, HP, Tipo (Visual + OCR), Fase, Ataques y Número para una identificación exacta.
    - Se integró una **Doble API con Consenso**: El sistema consulta `PokemonTCG.io` y `TCGdex` simultáneamente, eligiendo el resultado con mayor puntuación de rigor.
    - Se añadió **Detección de Color Dominante**: La cámara ahora analiza los colores de la carta para confirmar su tipo elemental (ej: Verde para Planta), reduciendo errores de identificación masivamente.
    - Se implementó una **Arquitectura de Resiliencia Móvil**: Fallback automático a resoluciones bajas para evitar errores de hardware (`OverconstrainedError`) y timeout de 10s para inicialización de cámara.
    - Se corrigieron errores críticos de referencia (`ReferenceError`) y se optimizó el procesamiento de imagen dual (HQ para el usuario, Filtrada para el OCR).
- **Hito**: Estabilización de Perfiles y Dashboard.
    - Se implementó la **Normalización de Datos**: Ahora el Dashboard inyecta automáticamente atributos y objetos por defecto en cuentas antiguas, evitando crashes por campos inexistentes.
    - Se añadieron diagnósticos de carga detallados para identificar problemas de permisos en Firebase.
- **Hito**: Recuperación de Mini-Juegos.
    - Se resolvieron errores de carga en "Memoria Evolutiva" y "Type Quiz" mediante la corrección de importaciones de `firebase/auth`.
    - Se implementó una lógica de **Consulta de Respaldo (Fallback)** que garantiza que los juegos siempre tengan cartas, incluso si la búsqueda aleatoria falla por falta de semillas.

---
*Mantener este registro actualizado es vital para la continuidad del desarrollo.*
