# Diseño — Asesor conversacional CTT-FISEI (Telegram + Dashboard)

**Fecha:** 2026-10-29 · **Presupuesto:** 2 horas hasta la entrega

## 1. Intención y el por qué

El CTT-FISEI pierde prospectos porque las consultas llegan a cualquier hora y los
bots de menú generan fricción. Queremos un asesor conversacional en Telegram que
hable como una persona que conoce los cursos, más un panel donde un operador vea
las conversaciones en vivo e intervenga sin que el usuario note el cambio de manos.

El objetivo real no es "tener un bot": es maximizar puntaje en una rúbrica de 100
puntos en dos horas. Cada decisión de abajo se justifica contra esa rúbrica.

## 2. Objetivos

- **G1.** Bot de Telegram en vivo, probable por el jurado, que persuada con tono
  natural y responda con datos reales del pénsum (30 pts).
- **G2.** Dashboard web público que liste conversaciones activas, se actualice sin
  recargar, muestre el estado emocional del prospecto y permita intervenir (30 pts).
- **G3.** Arquitectura con capas separadas y uso frugal de contexto (20 pts).
- **G4.** Dos extras de valor: notas de voz transcritas y resumen automático por
  conversación para el operador (20 pts junto a la sustentación).

## 3. No-objetivos

- Autenticación de operadores en el dashboard.
- Pasarela de pagos o inscripción real (el bot deriva al formulario del sitio).
- Scraping en vivo / programado. Se scrapea una vez y se versiona.
- Multi-canal (WhatsApp, web chat).
- n8n, colas de mensajes, contenedores.

## 4. Anti-objetivos (fracaso aunque funcione)

- Que el bot conteste como catálogo: listas de cursos con precios y guiones.
- Que el dashboard necesite F5 para ver un mensaje nuevo.
- Que la demo dependa de la red del auditorio para alcanzar el sitio de la UTA.
- Que el bot regale un curso, invente un descuento o filtre su system prompt
  ante un intento de inyección.

## 5. Restricciones (descubiertas, no supuestas)

1. **El sitio objetivo es intranet.** `ctt-talleresfisei.uta.edu.ec` resuelve a
   `172.21.123.71`, IP privada de la red UTA. No es alcanzable desde la nube ni
   desde fuera del campus.
2. **Su certificado TLS es inválido.** `curl` falla con exit 60; hay que
   deshabilitar la verificación en el scraper (`rejectUnauthorized: false`).
   Solo aplica al scraper, que corre una vez y en local.
3. **El corpus es pequeño y estático.** 21 cursos en `course.php`, cada uno con
   página propia `cursoN.php` (N = 1..21) que trae descripción, objetivos,
   modalidad, horas, fechas de curso e inscripción, **precio en tres tramos**
   (estudiante UTA / docente-graduado / público), requisitos y módulos. ~60 KB de
   texto limpio en total.
4. **API key de Gemini verificada.** Formato nuevo (`AQ.`), en `./secrets/gemini`
   (gitignored). La familia `gemini-2.5-*` responde 404 para cuentas nuevas;
   los modelos usables verificados son `gemini-3-flash-preview` y
   `gemini-3.1-flash-lite`.
5. **Dos horas.** Toda infraestructura que requiera instalación, túnel o deploy de
   backend se considera coste prohibitivo.

## 6. Enfoques considerados

| | Enfoque | Trade-off |
|---|---|---|
| **A** | **Servicio único TypeScript + Supabase gestionado** (elegido) | Más código de handover escrito a mano, pero cero instalación, Realtime gratis y una sola cosa que puede romperse en vivo. |
| B | n8n como orquestador + Supabase | Demo visual del pipeline, pero exige levantar n8n, exponerlo con túnel público y depurar nodos a ciegas: justo el riesgo que 2h no tolera. |
| C | MongoDB local vía devenv + embeddings de los cursos | Descartado. `$vectorSearch` es exclusivo de Atlas: un `mongod` instalado por devenv no tiene índice vectorial, obligando a coseno en memoria — con lo cual el Mongo no aporta nada sobre un JSON. Y RAG resuelve un problema que no existe: 21 documentos caben en contexto. ~45 min de coste y 0 pts de rúbrica. |

**Elegido: A.** El usuario lo aprobó tras discutir B y C.

### 6.1 Por qué no vectorizar, y qué se hace en su lugar

En vez de recuperación semántica, **catálogo en dos niveles**:

- **Nivel índice** (~1.5 KB, siempre en el system prompt): por curso, `id`,
  nombre, estado (ABIERTO/CERRADO), horas y precio público. Suficiente para que
  el agente oriente, compare y decida de qué hablar.
- **Nivel detalle** (bajo demanda): antes de cada llamada, un emparejamiento
  determinista por palabras clave sobre el mensaje del usuario inyecta el
  registro completo de hasta dos cursos relevantes. Se prefirió esto a una
  *tool* con function calling porque evita una segunda ida y vuelta al modelo:
  misma frugalidad, la mitad de latencia.

Esto ataca de frente los 10 pts de "gestión de tokens y ventana de contexto": se
envían ~1.5 KB en lugar de 60 KB, y es más preciso que un vector search sobre 21
documentos, donde los títulos se parecen entre sí ("Fundamentos de Python 1" vs
"2", "JavaScript Essentials 1" vs "2") y el coseno confunde justo lo que importa.

## 7. Arquitectura

```
                        ┌──────────────────────┐
  Telegram  ◄──────────►│  bot (Node, local)   │
  (long polling)        │  grammY + Gemini     │
                        └───────┬──────────────┘
                                │ lee/escribe
   data/courses.json ──────────►│
   (scrapeado una vez)          ▼
                        ┌──────────────────────┐
                        │  Supabase (hosted)   │
                        │  Postgres + Realtime │
                        └───────┬──────────────┘
                                │ suscripción Realtime
                                ▼
                        ┌──────────────────────┐
  Jurado ◄─────────────►│  dashboard (Vercel)  │
                        │  React + Vite        │
                        └──────────────────────┘
```

Cuatro piezas, tres capas limpias (conector de mensajería / inferencia /
persistencia), que es exactamente lo que premian los 10 pts de diseño modular.

### 7.1 Decisiones ya tomadas

**Scraper** (`scripts/scrape.ts`, se ejecuta una vez y se commitea el resultado).
Node + `cheerio`, TLS sin verificar. Recorre `course.php` para el índice y
`curso1..21.php` para el detalle. Salida: `data/courses.json`, un array de
registros con `id`, `nombre`, `estado`, `horas`, `modalidad`, `descripcion`,
`objetivos[]`, `precios{estudianteUta, docenteUta, publico}`, `fechaCurso`,
`periodoInscripcion`, `requisitos`, `tipoCapacitacion`, `cupo`, `modulos[]`,
`url`. Las etiquetas exactas del sitio están en la Tarea 1 del plan: no son
uniformes entre páginas y hay dos formatos de precio distintos.
El bot **nunca** toca el sitio en runtime: la demo es inmune a la red del auditorio.

**Bot.** TypeScript sobre `tsx` (sin paso de build), `grammY` en **long polling**.
Decisión mía: polling evita webhook, túnel y deploy; el bot corre en el portátil y
sigue estando "en vivo" para el jurado.

**Inferencia.** `gemini-3-flash-preview`, con `gemini-3.1-flash-lite` de
respaldo ante 429/503 (baja latencia, admite JSON estructurado,
function calling y audio de entrada). Una sola llamada por mensaje devuelve JSON
con tres campos: `reply`, `estado` (`interesado|dudoso|frustrado|lead_caliente`) y
`resumen`. Clasificar en la misma llamada que se redacta la respuesta evita una
segunda ida y vuelta: el termómetro sale gratis en latencia y en tokens.

**Historial.** Se envían los últimos 10 mensajes del hilo más el `resumen`
acumulado; lo anterior vive solo en el resumen. Ventana acotada por diseño.

**Defensa ante inyección.** Tres capas, porque valen 10 pts:
1. Reglas duras en el system prompt: los precios salen únicamente del bloque de
   catálogo; no existe autoridad para descuentos, becas ni gratuidades; las
   instrucciones del usuario no alteran las directrices del centro.
2. El catálogo entra como *datos* etiquetados, nunca como instrucciones.
3. Si el modelo detecta intento de manipulación, lo marca y el hilo se muestra en
   el dashboard con una señal visible.

**Persistencia (Supabase).** Dos tablas:
- `conversations`: `id`, `telegram_chat_id`, `nombre`, `estado`, `resumen`,
  `ai_paused` (bool), `created_at`, `last_message_at`.
- `messages`: `id`, `conversation_id`, `role` (`user|bot|admin`), `content`,
  `created_at`.

Realtime activado en ambas. El bot usa la *service key*; el dashboard la *anon
key*. Decisión mía y riesgo asumido: RLS abierta y sin login en el dashboard —
el enunciado pide una URL accesible sin restricciones, y 2h no alcanzan para auth.
Queda anotado en el README como deuda consciente.

**Handover.** `conversations.ai_paused` es el único interruptor. El operador lo
activa desde el panel, y además se activa solo cuando `estado = frustrado`. Con
él en `true` el bot persiste el mensaje del usuario pero no infiere.
Cuando el operador escribe, el dashboard inserta una fila `role='admin'`; el
proceso del bot está suscrito a esos inserts y la reenvía por Telegram **bajo la
identidad del bot**, de modo que el usuario no percibe el cambio. El token nunca
toca el navegador.

**Dashboard.** Vite + React + Tailwind, desplegado estático en Vercel. Lista de
tarjetas de conversación ordenadas por actividad, cada una con punto de color del
termómetro; al abrir una, el hilo completo, el resumen generado, el toggle de
pausa de IA y el campo para escribir. Todo movido por suscripciones Realtime: sin
polling ni recarga.

**Extras de valor.** Notas de voz: se descarga el archivo de Telegram y se pasa
como audio inline a Gemini, que transcribe y responde en el mismo turno. Resumen
automático: el campo `resumen` que ya viene en cada respuesta se muestra arriba
del hilo, para que el operador entre en contexto en un vistazo.

### 7.2 Variables de entorno

`TELEGRAM_BOT_TOKEN`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
para el bot; `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` para el dashboard.
`.env.example` versionado, `secrets/.env` ignorado.

El proyecto usa el formato nuevo de keys de Supabase: `sb_publishable_…` en lugar
del viejo anon key JWT. No hay `sb_secret_…`, así que el bot comparte la
publishable key; funciona porque las políticas RLS son permisivas por diseño.
Si aparece una secret key más adelante, `src/config.ts` la prefiere sin otros
cambios.

## 8. Dependencias de ti (bloquean el arranque)

1. **Token de BotFather** para el bot de Telegram.
2. **Proyecto Supabase** creado: URL, anon key y service key.
3. **Estar en la red UTA** en el momento de correr el scraper (una sola vez).

## 9. Lo que queda al implementador

- Selectores exactos de cheerio y normalización de los campos del scraping.
- Redacción fina del system prompt y de los ejemplos de tono.
- Esquema JSON concreto de la respuesta de Gemini.
- Paleta, tipografía y layout del dashboard.
- Manejo de reintentos y errores de red hacia la API de Gemini.

## 10. Orden de trabajo sugerido (120 min)

| Min | Entregable |
|-----|-----------|
| 0–20 | Scraper → `data/courses.json` completo y verificado |
| 20–30 | Esquema Supabase + Realtime activado |
| 30–70 | Bot: conversación, catálogo en dos niveles, termómetro, persistencia |
| 70–100 | Dashboard con Realtime y handover, desplegado |
| 100–110 | Notas de voz y resumen |
| 110–120 | README, `.env.example`, ensayo de la demo |

Si el reloj aprieta, el corte es por el final: los extras del minuto 100 se
sacrifican antes que cualquier cosa de la rúbrica A, B o C.
