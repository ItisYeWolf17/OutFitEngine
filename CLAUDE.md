# Ropero virtual

PWA personal que cataloga ropa, genera combinaciones válidas con un motor de
reglas local, y opcionalmente renderiza cómo se ve el usuario con el outfit
puesto. Copy en español, voz activa, sentence case.

## Decisiones cerradas (no reabrir sin motivo)

| Decisión | Elección |
|---|---|
| Plataforma | PWA instalable, no app nativa |
| Framework | React + Vite + TypeScript |
| Base de datos | Firestore, con persistencia offline |
| Auth | Firebase Auth, proveedor Google, usuario único |
| Imágenes | Comprimidas en cliente + Firebase Storage |
| Motor de sugerencias | Reglas deterministas en el cliente, sin IA |
| Etiquetado de prendas | Modelo con visión, una vez por prenda |
| Try-on | Bajo demanda, con caché por `outfitId` y presupuesto acotado |
| Costo objetivo | < $10 una sola vez, ~$0/mes en régimen |

**Lo que NO se hace:** no hay IA decidiendo qué combina — las reglas deciden y
la IA solo dibuja. No se pregeneran todas las combinaciones, solo las de mayor
score.

## Reglas duras

1. **Las API keys de modelos nunca van al cliente.** Toda llamada a Gemini pasa
   por una Cloud Function que valida el usuario autenticado antes de reenviar.
   Una key en el bundle de una PWA es una key pública. Las `VITE_FIREBASE_*` sí
   son públicas por diseño: lo que protege los datos son las reglas.
2. **El cliente nunca decide si puede gastar.** `presupuestoImagenes` e
   `imagenesGeneradas` se decrementan en transacción del lado del servidor, y
   `firestore.rules` le prohíbe al cliente escribir esos campos. Lo mismo con
   `renderUrl`.
3. **Se consulta el caché antes de cualquier llamada paga**, sin excepción.
4. **`npm test` tiene que pasar antes de cada commit.**

## Comandos

```bash
npm run dev      # vite en :5173
npm test         # vitest, una corrida
npm run build    # tsc -b && vite build
npm run emul     # emuladores de firebase
npm run deploy   # build + firebase deploy
```

## Estructura

```
src/
├── domain/        types.ts, outfitEngine.ts, outfitEngine.test.ts
├── data/          firebase.ts, prendasRepo.ts, outfitsRepo.ts, schemas.ts
├── features/      captura/ ropero/ sugerencias/ collage/ tryon/ auth/
├── components/ui/
└── hooks/
functions/         Cloud Functions (cortarFacturacion, etiquetarPrenda, renderizarOutfit)
```

## Diseño

El sujeto es un armario, no un dashboard. La app compite con abrir la puerta
del closet y mirar: tiene que ser más rápida que eso.

- Una decisión por pantalla. La principal responde "qué me pongo hoy" y nada más.
- La prenda es el contenido. Fondo neutro; el color viene de la ropa.
- Densidad alta en el ropero, densidad baja en la sugerencia.
- Gestos, no menús. El caso de uso es una mano, medio dormido.

## Estado

Fase 0 completa y verificada: proyecto `ropero-outfitengine`, auth con Google,
PWA instalada en Android con la sesión persistiendo, Hosting en
`https://ropero-outfitengine.web.app`, reglas desplegadas, presupuesto de $5
midiendo gasto bruto y `cortarFacturacion` desvinculando la facturación al
superarlo.

Acceso limitado por lista blanca de correos en `firestore.rules` y
`storage.rules`. Por ahora solo el correo del dueño. Si más adelante se suman
usuarios, se agregan a esa lista en ambos archivos y se redespliegan las
reglas: cada quien tendría su propio ropero, pero el presupuesto de
facturación seguiría siendo uno solo para todo el proyecto.

Sigue la fase 1. Las fases están en `PLAN.md`. Se trabaja una fase por sesión,
corriendo los criterios de aceptación antes de avanzar.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
