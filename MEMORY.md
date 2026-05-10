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
- **Contexto**: El proyecto fue creado inicialmente por IA pero carecía de documentación estructurada. Se establecen estas bases para evitar regresiones y suposiciones incorrectas en el futuro.

## Próximos Pasos (Pendientes)
1.  **Refinar Escáner**: Mejorar la precisión del OCR o integrar una API de reconocimiento visual más robusta.
2.  **Finalizar Juegos**: Asegurar que todos los mini-juegos en `src/pages/games/` sean funcionales y estén conectados al inventario real.
3.  **Sistema de Trading**: Completar la interfaz de usuario para el servicio de intercambios.
4.  **Optimización**: Revisar el rendimiento de la carga de imágenes de cartas.

---
*Mantener este registro actualizado es vital para la continuidad del desarrollo.*
