# Directrices para Agentes y Desarrolladores (Agents.md)

Este documento es la **Ley Suprema** del proyecto `poke_rescam`. Cualquier agente de IA o humano que trabaje en este repositorio DEBE seguir estas reglas sin excepción.

## 1. Regla de Oro: Prohibido Asumir
**NUNCA asumas una funcionalidad, un estilo o una lógica de negocio.**
- Si vas a implementar algo que no está explícitamente detallado paso a paso, **PREGUNTA**.
- Es preferible hacer 10 preguntas que cometer 1 error por suposición.
- Si crees que "esto debería funcionar así", detente y confirma con el usuario.

## 2. Flujo de Trabajo Obligatorio
Antes de realizar cualquier cambio, el agente DEBE:
1.  **Leer `MEMORY.md`**: Para entender el contexto actual y los últimos avances.
2.  **Leer `docs/STRUCTURE.md`**: Para entender la arquitectura y dónde colocar el nuevo código.
3.  **Proponer un Plan**: Crear o actualizar un `implementation_plan.md` (en el directorio de datos del agente) y esperar aprobación.
4.  **Actualizar `MEMORY.md`**: Inmediatamente después de completar una tarea, registrar el avance.

## 3. Estándares Técnicos y Estéticos
- **Framework**: Astro (SSR) + React (Islands).
- **Estilos**: Tailwind CSS puro. 
    - No uses CSS en línea ni hojas de estilo externas a menos que sea estrictamente necesario y aprobado.
    - Mantén la estética "Premium/Gamer": Degradados sutiles, fuentes modernas (Outfit), micro-animaciones (Framer Motion).
- **Base de Datos**: Firebase (Firestore/Auth).
    - Siempre verifica las reglas de seguridad antes de proponer cambios en el esquema.

## 4. Casos de Uso y Escenarios
### Cuándo preguntar:
- Siempre que el usuario diga "añade X" pero no especifique cómo debe verse o comportarse exactamente.
- Cuando encuentres un error y no estés 100% seguro de la causa raíz.
- Antes de instalar nuevas dependencias.

### Cuándo NO preguntar:
- Tareas triviales de formato (corregir una sangría, añadir un comentario aclaratorio).
- Ejecutar comandos de lectura (listar directorios, ver archivos).

## 5. Errores Críticos a Evitar
- **Hydration Mismatch**: Al usar componentes React en Astro, asegúrate de usar la directiva `client:*` correcta.
- **Seguridad en Firebase**: No dejes campos sensibles expuestos en el cliente si pueden ser validados en el servidor o mediante reglas.
- **Rendimiento**: No cargues bibliotecas pesadas en páginas que no las necesitan.

---
*Este documento es dinámico y debe ser actualizado si se descubren nuevos patrones o errores comunes.*
