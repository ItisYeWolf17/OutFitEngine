# Ropero Virtual — Plan de construcción

Documento de especificación para ejecutar con Claude Code. Cada fase es
autocontenida, entrega algo usable y tiene criterios de aceptación verificables.

---

## 0. Contexto y decisiones ya cerradas

**Qué es:** una PWA personal que cataloga ropa, zapatos y accesorios, genera
combinaciones válidas mediante un motor de reglas local, y opcionalmente
renderiza cómo se ve el usuario con cada outfit puesto.

**Decisiones tomadas (no reabrir sin motivo):**

| Decisión | Elección | Razón |
|---|---|---|
| Plataforma | PWA instalable (no app nativa) | Un solo código para móvil y escritorio; evita $99/año de App Store y $25 de Play Store |
| Framework | React + Vite + TypeScript | Reutiliza experiencia previa con React/Firestore |
| Base de datos | Firestore | Free tier real; ya conocido |
| Auth | Firebase Auth (Google provider) | Usuario único, sin fricción |
| Imágenes | Comprimidas en cliente + Firebase Storage | Con Blaze ya vinculado, el motivo para evitarlo desapareció; un proveedor menos |
| Motor de sugerencias | Reglas deterministas en el cliente | Costo cero, offline, instantáneo |
| Etiquetado de prendas | Modelo con visión, **una vez por prenda** | ~$0.50 total para todo el ropero |
| Try-on | Bajo demanda, con caché por hash, presupuesto de ~30 renders | El resto se resuelve con collage |
| Costo objetivo | < $10 una sola vez, ~$0/mes en régimen | Requisito del proyecto |

**Lo que NO se hace:**
- No hay IA decidiendo qué combina. Las reglas deciden; la IA solo dibuja.
- No se pregeneran todas las combinaciones. Solo las de mayor score.
- No se conecta a cuentas de Claude/ChatGPT — técnicamente imposible.

---

## 1. Stack

```
React 18 + TypeScript + Vite
├── Estado          Zustand (simple, sin boilerplate de Redux)
├── Datos           Firestore + listeners en tiempo real
├── Auth            Firebase Auth (Google)
├── Offline         Firestore persistence + vite-plugin-pwa (Workbox)
├── Ruteo           React Router v6
├── Validación      Zod
├── Estilos         Tailwind CSS
├── Imágenes        browser-image-compression + @imgly/background-removal
├── Storage         Firebase Storage
├── Visión          Gemini API (structured output)
└── Try-on          Nano Banana Pro / Gemini Image (a través de Cloud Function)
```

**Regla de seguridad crítica:** las API keys de Gemini **nunca** van en el
cliente. Todas las llamadas a modelos pasan por una Firebase Cloud Function
(o una función de Vercel) que valida el usuario autenticado antes de reenviar.
Una key en el bundle de una PWA es una key pública.

---

## 2. Estructura de carpetas

La estructura real vive en `CLAUDE.md` y `docs/architecture/overview.md`, que
son los que se mantienen al día. Este documento es de planificación, no de
arquitectura.

Las features que faltan por construir, con la fase que las trae:

| Feature | Fase |
|---|---|
| `features/capture` — cámara, compresión, recorte de fondo | 2 |
| `features/wardrobe` — grid, detalle, edición | 2 (esqueleto ya existe) |
| `features/suggestions` — "¿qué me pongo hoy?" | 4 |
| `features/collage` — composición flat-lay en canvas | 4 |
| `features/tryon` — render, presupuesto, galería | 5 |
| `functions/tagGarment` — foto → atributos JSON | 3 |
| `functions/renderOutfit` — foto persona + prendas → imagen | 5 |

---

## 3. Modelo de datos

```
users/{uid}
├── modelPhotoUrl
├── imageBudget: number                  # contador restante, solo servidor
├── imagesGenerated: number              # solo servidor
├── garments/{garmentId}                 # ver Garment en src/domain/types.ts
├── outfits/{outfitId}                   # id = hash determinístico
│   ├── garmentIds[], formality, occasions[], seasons[]
│   ├── renderUrl?                       # solo si se pagó, solo servidor
│   ├── timesWorn, lastWorn, rating
├── wearLog/{date}                       # qué se usó cada día
├── spending/{entryId}                   # costo estimado por llamada
└── rateLimits/{window}                  # contadores de rate limit
```

**Índices compuestos:** ninguno por ahora. El ropero completo son unas decenas
de documentos que se leen de una y se filtran en memoria, que es lo que el
motor hace igual. Se agregan cuando una consulta real los pida.

**Reglas de seguridad:** ya desplegadas. Niegan por defecto, filtran por una
lista de uids permitidos, y le prohíben al cliente escribir `imageBudget`,
`imagesGenerated` y `renderUrl`. Ver `docs/decisions/0003-access-allowlist.md`.

---

## 4. Fases

### Fase 0 — Scaffolding · ✅ completa
**Entregable:** app vacía desplegada y auth funcionando.

- Vite + React + TS + Tailwind + React Router
- Firebase project, Firestore en modo producción, reglas de seguridad
- Login con Google, ruta protegida
- `vite-plugin-pwa` con manifest e íconos; instalable en Android e iOS
- Deploy en Vercel o Firebase Hosting

**Aceptación:** se instala en el home screen del celular, abre sin barra de
navegador, el login persiste al cerrar y reabrir.

---

### Fase 1 — Dominio y pruebas · ✅ completa
**Entregable:** motor de reglas probado, sin UI.

- Copiar `types.ts` y `outfitEngine.ts`
- Suite de tests con Vitest sobre un ropero fixture de ~20 prendas
- Casos obligatorios: formalidad fuera de rango se rechaza; dos estampados se
  rechazan; negro con azul marino se rechaza; `outfitId` es estable ante
  reordenamiento; la poda temprana no descarta combinaciones válidas

**Aceptación:** `npm test` verde. Un ropero de 15/8/5 genera outfits viables en
menos de 100 ms — medido: 1 ms.

> El rango "entre 150 y 250" del plan original se reemplazó. Ese número mide
> qué prendas tiene el fixture, no si el motor funciona: aflojar un color en el
> fixture lo mete en rango sin tocar el motor. En su lugar hay un snapshot del
> conteo, que avisa cuando una regla cambia el resultado, y una banda ancha que
> detecta los dos fracasos reales: que la cascada no filtre nada o que vacíe el
> ropero.

---

### Fase 2 — Captura y catálogo · ⏳ siguiente
**Entregable:** poder cargar el ropero completo a mano.

- Formulario de prenda con todos los campos de `Garment`
- Captura de foto vía `<input type="file" accept="image/*" capture>`
- Compresión: WebP, lado mayor 800 px, calidad 0.8, objetivo < 60 KB
- Subida a Firebase Storage, URL en Firestore
- Grid del ropero con filtros por categoría y estado activo/inactivo
- Edición y desactivación de prendas

**Aceptación:** 30 prendas cargadas ocupan menos de 2 MB de storage. El grid
carga en menos de 1 s con caché en frío.

---

### Fase 3 — Etiquetado automático
**Entregable:** la foto llena el formulario sola.

- Cloud Function `tagGarment`: recibe imagen base64, llama a Gemini con
  el prompt de extracción, devuelve JSON
- Validación con Zod; si falla el parseo, un reintento y luego formulario manual
- El formulario se pre-llena y queda editable — el modelo propone, el usuario confirma
- Rate limit: máximo 20 llamadas por usuario por hora

**Aceptación:** en 10 prendas de prueba, categoría y color aciertan al menos 9
veces; formalidad al menos 7. Costo total del etiquetado registrado y menor a $0.50.

---

### Fase 4 — Motor de sugerencias
**Entregable:** la pantalla que resuelve el problema real.

- Pantalla principal: selector de ocasión + estado del clima
- Llama a `suggest()` y muestra 5 outfits ordenados por score
- Cada outfit se muestra como **collage flat-lay**: recorte de fondo con
  `@imgly/background-removal` (corre local, sin costo), composición en canvas
- Botón "me puse esto" que incrementa `timesWorn`, setea `lastWorn` en el
  outfit y en cada prenda, y escribe en `wearLog/{date}`
- Vista "no me he puesto" ordenada por días sin uso

**Aceptación:** con el ropero real cargado, la primera sugerencia para
"oficina" es algo que el usuario efectivamente se pondría. Ninguna prenda usada
en los últimos 7 días aparece en el top 3.

---

### Fase 5 — Try-on con presupuesto
**Entregable:** verse con la ropa puesta, sin sorpresas en la factura.

- Subida de foto modelo (cuerpo completo, fondo neutro, buena luz)
- Cloud Function `renderOutfit`: foto modelo + fotos de prendas → imagen
- **Antes de llamar:** buscar `outfitId` en Firestore. Si tiene `renderUrl`, devolver esa
- **Guarda dura:** la function verifica `imageBudget > 0`, decrementa
  atómicamente con una transacción, y rechaza si llegó a cero
- Botón "vérmelo puesto" solo en el detalle del outfit, nunca automático
- Pantalla de presupuesto: cuántos renders quedan, cuánto se ha gastado

**Aceptación:** pedir el mismo outfit dos veces produce una sola llamada a la
API. Con presupuesto en cero, el botón se deshabilita y no hay forma de gastar más.

---

### Fase 6 — Pregeneración por lotes
**Entregable:** catálogo visual de los outfits que más se usan.

- Vista de administración: lista `renderPriority(outfits, garments, N)`
- Envío por Batch API (50% de descuento, SLA 24 h)
- Job asíncrono con estado visible; al completar, escribe `renderUrl` en cada outfit
- Presupuesto inicial sugerido: 10 formales + 15 de salidas + 5 comodines = 30

**Aceptación:** 30 renders entregados por menos de $4 total, verificado contra
el dashboard de facturación de Google Cloud.

---

### Fase 7 — Pulido
- Modo offline completo: el ropero y las sugerencias funcionan sin red
- Estadísticas: prendas nunca usadas, costo por uso, piezas más versátiles
- Exportación del catálogo a JSON
- Ajuste de constantes (`CLASHES`, umbral de formalidad, `DEFAULT_WEIGHTS`)
  contra las combinaciones que el usuario aceptó o rechazó en la práctica

---

## 5. Dirección de diseño

**El sujeto es un armario, no un dashboard.** La app compite con abrir la
puerta del closet y mirar. Debe ser más rápida que eso o no se usa.

- **Una decisión por pantalla.** La pantalla principal responde "qué me pongo
  hoy" y nada más. Filtros y estadísticas viven en otro lado.
- **La prenda es el contenido.** Fondo neutro y sobrio; el color viene de la
  ropa, no de la interfaz. Nada de acentos saturados compitiendo con las fotos.
- **Densidad alta en el ropero, densidad baja en la sugerencia.** El grid
  muestra muchas prendas pequeñas; la sugerencia muestra un outfit grande.
- **Gestos, no menús.** Swipe para descartar una sugerencia y ver la siguiente.
  El caso de uso es una mano, medio dormido, antes de bañarse.
- **Elemento firma:** la vista de "descanso de prendas" — una línea de tiempo
  que muestra cuánto hace que no usás cada pieza, con las olvidadas destacadas.
  Es lo que ninguna app de closet hace bien y es el valor real del registro.

Copy en español, voz activa, sentence case. El botón dice "Me puse esto" y el
toast dice "Registrado". Estado vacío del ropero: "Agregá tu primera prenda"
con el botón de cámara, no una ilustración decorativa.

---

## 6. Guardas de costo

Implementar en Fase 0, no al final:

1. **Budget alert en Google Cloud a $5** con notificación por correo
2. **Contador en Firestore** decrementado en transacción, verificado del lado
   del servidor. El cliente nunca decide si puede gastar
3. **Rate limit por función:** 20 etiquetados/hora, 10 renders/día
4. **Log de cada llamada** con costo estimado en una colección `gastos`
5. **Caché consultado antes de cualquier llamada**, sin excepción

El riesgo real no es el gasto esperado sino un bug en un `useEffect` que
dispare llamadas en loop. Las guardas son contra eso.

---

## 7. Riesgos conocidos

| Riesgo | Mitigación |
|---|---|
| El modelo de visión falla la formalidad | El formulario queda editable; se corrige en 5 segundos |
| El recorte de fondo falla con prendas claras sobre fondo claro | Sugerir fotografiar sobre superficie contrastante; permitir subir sin recorte |
| Los renders no preservan el parecido facial | Probar con 3 fotos modelo distintas antes de gastar el presupuesto |
| Zapatos y accesorios mal renderizados | Limitar el try-on a top + bottom + calzado; los accesorios solo en el collage |
| Los modelos de imagen cambian de precio o se retiran | Aislar el proveedor detrás de la Cloud Function; el cliente no sabe cuál es |
| ~~Firebase Storage exige Blaze~~ | Resuelto: la cuenta ya tiene Blaze vinculado |

---

## 8. Cómo ejecutar esto con Claude Code

Crear un `CLAUDE.md` en la raíz con:

- El resumen de la sección 0 (decisiones cerradas)
- La estructura de carpetas de la sección 2
- La regla de que las API keys nunca van al cliente
- El comando de tests y la exigencia de que pasen antes de cada commit

Trabajar **una fase por sesión**, no el proyecto completo de un tirón. Al
terminar cada fase, correr los criterios de aceptación antes de avanzar. Las
fases 1 y 4 son las que definen si la app sirve; las fases 5 y 6 son opcionales
y se pueden posponer indefinidamente sin perder el valor del producto.

Orden de trabajo recomendado: 0 → 1 → 2 → **cargar el ropero real completo** →
3 → 4 → evaluar si el try-on hace falta → 5 → 6.

Ese paso de cargar el ropero real antes de la fase 4 no es opcional. Las
constantes del motor de reglas solo se pueden calibrar contra ropa de verdad.

---

## 9. Deuda técnica

Cosas que funcionan pero que hay que pagar en algún momento. No bloquean nada
hoy; cada una tiene un momento natural para saldarse.

| Deuda | Por qué existe | Cuándo saldarla |
|---|---|---|
| `generateOutfits` devuelve siempre `timesWorn: 0` y `lastWorn: null` | Falta el merge contra los outfits persistidos por `outfitId`. Sin eso el término de novedad es una constante | Fase 4, cuando exista el repositorio |
| `firebase-functions@6` desactualizado | Se fijó al arrancar y salió una major nueva | Antes de escribir `tagGarment`, no después |
| Los pesos del scoring son constantes del módulo | Con un solo usuario alcanza | Si la app llega a tener más de uno |
| El presupuesto de $5 es uno solo para todo el proyecto | Es un límite de Cloud Billing, no del código | Si se suman usuarios que rendericen |
| El topic de Pub/Sub se llama `alertas-presupuesto`, en español | Renombrarlo obliga a recrear topic y presupuesto | Solo si molesta; es churn sobre la guarda de costo |
| No hay `repositories/` en `functions/` | Ninguna function toca Firestore todavía | Fase 3, cuando haya que registrar gasto |

---

## 10. Mejoras futuras

Ideas que valen pero que no están comprometidas en ninguna fase.

- **Calibrar las constantes contra uso real.** `CLASHES`, el umbral de
  formalidad y `DEFAULT_WEIGHTS` se afinan contra las combinaciones que se
  aceptaron o rechazaron en la práctica. Requiere haber usado la app un tiempo.
- **Convertir el descanso en filtro duro.** Hoy es un peso blando: un outfit con
  tres favoritas puede ganarle a la penalización por prenda usada ayer. Si el
  criterio "ninguna prenda usada en los últimos 7 días en el top 3" importa de
  verdad, tiene que ser un filtro, no un peso.
- **Carga diferida de Firestore.** El bundle ya bajó a 390 KB al separar los
  módulos de Firebase, pero cuando la fase 2 importe Firestore volverá a subir.
  Ahí conviene cargarlo bajo demanda.
- **Modo offline completo y estadísticas** — ya están como fase 7.
