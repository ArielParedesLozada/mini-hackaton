# Asesor Conversacional CTT-FISEI

Ecosistema multi-agente para ventas y gestión conversacional del Centro de
Transferencia Tecnológica de la FISEI — Universidad Técnica de Ambato.

Un asesor de IA atiende prospectos por Telegram con el catálogo real de cursos,
clasifica su intención en tiempo real, y un operador humano puede tomar el
control de cualquier conversación desde un panel web sin que el usuario note el
cambio de manos.

**Hackathon 2026 · FISEI-UTA · Edición Especial Ambato Meetup**

## Entregables

| | |
|---|---|
| Bot de Telegram | `@________` *(pendiente de publicar)* |
| Dashboard web | `https://________` *(pendiente de publicar)* |
| Repositorio | este |

## Arquitectura

```
                            ┌────────────────────────┐
   Telegram  ◄─────────────►│  bot (Node + grammY)   │
   (long polling)           │  inferencia con Gemini │
                            └──────────┬─────────────┘
                                       │
    data/courses.json ────────────────►│  lee catálogo / escribe estado
    (base de conocimiento)             ▼
                            ┌────────────────────────┐
                            │   Supabase (hosted)    │
                            │  Postgres + Realtime   │
                            └──────────┬─────────────┘
                                       │ suscripción Realtime
                                       ▼
   Operador  ◄─────────────► ┌────────────────────────┐
                            │  dashboard (React)     │
                            └────────────────────────┘
```

Tres capas separadas, una responsabilidad cada una:

| Capa | Archivos | Responsabilidad |
|---|---|---|
| Conector de mensajería | `src/bot.ts`, `src/index.ts` | Hablar Telegram. No sabe de Gemini ni de SQL. |
| Pipeline de inferencia | `src/prompts.ts`, `src/gemini.ts`, `src/catalog.ts`, `src/retrieval.ts` | Decidir qué responder. No sabe de Telegram ni de SQL. |
| Persistencia | `src/db.ts`, `supabase/schema.sql` | Guardar y publicar cambios. No sabe de Gemini. |

### Base de conocimiento: catálogo en dos niveles

El catálogo son 21 cursos scrapeados de `ctt-talleresfisei.uta.edu.ec`, con
descripción, objetivos, módulos, fechas, requisitos y precio en tres tramos
(estudiante UTA / docente-graduado / público).

Deliberadamente **no** usamos embeddings ni base vectorial. Con 21 documentos,
la recuperación semántica resuelve un problema que no existe y confunde justo lo
que importa: los nombres se parecen demasiado entre sí (*Python 1* vs *Python 2*,
*JavaScript Essentials 1* vs *2*) y la similitud por coseno los mezcla. En su
lugar:

- **Nivel índice** — una línea por curso (`[id] NOMBRE · ESTADO · horas ·
  precio`), ~1,5 KB, siempre presente. Le alcanza al agente para orientar y
  comparar.
- **Nivel detalle** — antes de cada llamada, un emparejamiento determinista por
  palabras clave inyecta el registro completo de hasta dos cursos relevantes.
  Tolera faltas ortográficas, discrimina por dígito y prefiere siempre la
  edición abierta de un curso frente a una pasada.

Resultado medido: **2.100 a 2.900 tokens de prompt por turno**, contra los
~60 KB que costaría mandar el catálogo entero.

### Un solo turno de inferencia por mensaje

Cada mensaje produce **una** llamada al modelo, cuya salida estructurada trae
cuatro campos a la vez:

| Campo | Para qué |
|---|---|
| `reply` | lo que se envía por Telegram |
| `estado` | el termómetro: `interesado`, `dudoso`, `frustrado`, `lead_caliente` |
| `resumen` | contexto comprimido para el operador humano |
| `intento_manipulacion` | señal de defensa ante inyección de prompt |

Clasificar en la misma llamada que se redacta la respuesta hace que el
termómetro no cueste ni latencia ni tokens extra.

### Handover: transición transparente

`conversations.ai_paused` es el único interruptor:

- El operador lo activa desde el panel, **o** se activa solo cuando el modelo
  clasifica al prospecto como `frustrado`.
- Con la IA pausada, los mensajes del usuario se siguen guardando y mostrando,
  pero no se infiere ni se responde.
- Cuando el operador escribe, el dashboard inserta la fila en `messages` con
  `role = 'admin'`; el proceso del bot está suscrito a esos inserts por Realtime
  y la reenvía **bajo la identidad del bot**. El usuario no percibe el cambio, y
  el token de Telegram nunca llega al navegador.

### Defensa ante inyección de prompt

Tres capas:

1. **Reglas duras** en el system prompt: los precios salen únicamente del
   catálogo; no existe autoridad para conceder descuentos, becas ni gratuidades;
   los cursos cerrados no se venden; el prompt no se revela.
2. **El catálogo entra rotulado como datos**, nunca como instrucciones, y el
   mensaje del usuario va delimitado y marcado como consulta.
3. **Señalización**: ante un intento, el agente no explica sus reglas — redirige
   en una línea y marca `intento_manipulacion`, que el panel muestra en la
   tarjeta del chat.

## Cómo correrlo

### Requisitos

- Node 20 o superior (el repo trae `devenv.nix` con Node 24).
- Una API key de Gemini, un bot de Telegram creado con BotFather y un proyecto
  de Supabase.

### 1. Dependencias

```bash
npm install
```

### 2. Variables de entorno

Copia `.env.example` a `secrets/.env` y rellena:

| Variable | Qué es |
|---|---|
| `TELEGRAM_BOT_TOKEN` | token que entrega BotFather |
| `GEMINI_API_KEY` | API key de Google AI Studio |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | key `sb_publishable_…` (formato nuevo; sustituye al viejo anon key) |
| `SUPABASE_SECRET_KEY` | opcional, `sb_secret_…`; si está, el bot la prefiere |
| `VITE_SUPABASE_URL` | la misma URL, para el dashboard |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | la misma publishable key, para el dashboard |

`secrets/` está en `.gitignore` y ningún valor se escribe en logs.

### 3. Base de datos

Ejecuta `supabase/schema.sql` en el SQL Editor del proyecto. Crea las tablas
`conversations` y `messages`, sus políticas, y las añade a la publicación
`supabase_realtime`.

### 4. Catálogo de cursos

`data/courses.json` ya viene versionado, así que **esto no hace falta para
correr el proyecto**. Para regenerarlo:

```bash
npm run scrape
```

Dos advertencias sobre el sitio fuente: su certificado TLS es inválido (el
scraper desactiva la verificación, y solo el scraper lo hace) y el host resuelve
a una IP privada de la red de la universidad, así que **solo es alcanzable desde
dentro del campus**. Por eso el catálogo se scrapea una vez y se versiona: el
bot nunca toca el sitio en tiempo de ejecución.

### 5. Bot

```bash
npm start          # o: npm run dev
```

Usa long polling, así que no necesita URL pública ni túnel.

### 6. Dashboard

```bash
cd frontend && npm install && npm run dev
```

Para producción, build estático y despliegue en Vercel o Netlify con las dos
variables `VITE_*` configuradas.

### Tests

```bash
npm test
```

Cubren la lógica pura: presupuesto de tokens del bloque índice, tolerancia a
faltas ortográficas, discriminación por dígito entre cursos homónimos y
preferencia por la edición abierta.

## Decisiones técnicas y su razón

| Decisión | Por qué |
|---|---|
| Long polling en vez de webhook | Sin túnel, sin deploy de backend, sin URL pública: una pieza menos que puede fallar en una demo en vivo. |
| Catálogo en dos niveles, sin vectores | 21 documentos caben en contexto; el vector search sobre nombres casi idénticos confunde más de lo que aporta. Ver arriba. |
| Supabase gestionado | Postgres y WebSockets sin instalar nada, y `pgvector` disponible si el catálogo creciera. |
| Un turno de inferencia por mensaje | Respuesta, termómetro y resumen en una sola llamada. |
| Sin n8n | Orquestar visualmente exigía levantar el servicio y exponerlo públicamente, sin ganancia de puntaje. |
| Cadena de modelos con respaldo | El nivel gratuito de Gemini devuelve 429 cerca de la docena de llamadas en pocos minutos. Cada modelo tiene su propia cuota, así que ante 429 o 503 se reintenta y luego se cambia de modelo. Un fallo degrada a una respuesta de respaldo; nunca tumba el proceso. |

## Limitaciones conocidas

Las decimos nosotros antes de que las encuentre nadie más:

- **El dashboard no tiene autenticación.** Las políticas RLS son permisivas a
  propósito: el reto pedía una URL accesible sin restricciones y el presupuesto
  era de dos horas. En producción esto exige login de operador y políticas por
  rol.
- **El catálogo está congelado** al momento del scraping. Si el CTT publica un
  curso nuevo, hay que volver a correr `npm run scrape` desde la red UTA y
  commitear. No hay refresco programado.
- **El bot corre en una máquina local**, no en un servidor. Es una decisión de
  demo, no de arquitectura: migrar a webhook es cambiar `bot.start()` por
  `bot.api.setWebhook()`.
- **El historial se recorta a los últimos 10 mensajes** más el resumen
  acumulado. Es lo que mantiene el prompt por debajo de los 3.000 tokens, pero
  un detalle mencionado 15 mensajes atrás solo sobrevive si entró al resumen.
- **Precios y fechas pueden diferir entre ediciones** de un mismo curso. El
  agente prefiere siempre la edición abierta, pero el dato depende de lo que
  publique el sitio.

## Estructura del repositorio

```
data/courses.json       base de conocimiento versionada (21 cursos)
scripts/scrape.ts       scraper de un solo uso
src/prompts.ts          system prompt, esquema de salida, defensa ante inyección
src/catalog.ts          bloques índice y detalle
src/retrieval.ts        emparejamiento determinista de cursos
src/gemini.ts           llamada al modelo con respaldo
src/db.ts               acceso a Supabase
src/bot.ts              handlers de Telegram y relay del operador
src/index.ts            entry point
supabase/schema.sql     tablas, políticas y Realtime
frontend/               dashboard (React + Vite)
docs/superpowers/       diseño, plan de implementación y guion de la demo
```

---

Universidad Técnica de Ambato · Facultad de Ingeniería en Sistemas, Electrónica
e Industrial · Ambato, Ecuador
