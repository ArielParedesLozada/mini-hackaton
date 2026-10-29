# Puesta en marcha y prueba de humo

De cero a "todo funciona", en orden. Hazlo **antes** de abrir
`docs/guion-demo.md`: este documento verifica que el circuito corre, y el guion
asume que ya corre.

Necesitas **dos terminales** abiertas en la raíz del repo y Telegram a mano.

---

## 0 · El handle del bot: decide esto primero

El bot que existe hoy es:

```
@conferencia_grok_bot        (nombre visible: "conferencia_grok")
```

**Los usernames de Telegram son permanentes.** BotFather deja cambiar el nombre
visible, la descripción y la foto, pero **no** el `@handle`.

Tienes dos caminos y conviene elegir ahora, porque el token cambia:

**Camino A — crear un bot nuevo (recomendado, 1 minuto).**
El handle es parte del entregable: el jurado va a abrir ese enlace. Que diga
"grok" en una hackathon de IA, y que no diga nada del CTT-FISEI, resta sin
necesidad. En el chat con [@BotFather](https://t.me/BotFather):

1. `/newbot`
2. Nombre visible: `Dani · CTT-FISEI`
3. Username: prueba `CttFiseiAsesorBot`, y si está tomado `AsesorCttFiseiBot`
   o `CttFiseiUtaBot`. Tiene que terminar en `bot`.
4. BotFather devuelve un token nuevo. **Reemplaza el contenido de
   `secrets/botfather` con ese token** (el archivo entero, sin salto de línea
   extra ni comillas).

**Camino B — quedarte con el bot actual.**
Funciona igual, pero haz al menos `/setname` para que la cabecera del chat diga
`Dani · CTT-FISEI` en vez de `conferencia_grok`. El `@handle` seguirá saliendo
en el perfil y en el enlace.

### Terminado el camino que elijas, configura el perfil

Siempre en [@BotFather](https://t.me/BotFather), un comando por mensaje; te
pregunta de qué bot y luego el valor:

| Comando | Valor |
|---|---|
| `/setname` | `Dani · CTT-FISEI` |
| `/setabouttext` | `Asesor de capacitaciones del CTT-FISEI — Universidad Técnica de Ambato.` |
| `/setdescription` | `Hola, soy Dani. Te ayudo a encontrar el curso del CTT-FISEI que te sirve: contenidos, fechas, requisitos y precios para estudiantes, docentes y público general.` |
| `/setcommands` | `start - Empezar a conversar con el asesor` |
| `/setuserpic` | El logo del CTT-FISEI o de la UTA |

La `description` es lo que se ve en la pantalla **vacía**, junto al botón
*Iniciar*, antes de que el jurado escriba nada. En blanco se lee como proyecto a
medio terminar.

### Comprueba el handle

```bash
curl -s "https://api.telegram.org/bot$(tr -d '\n' < secrets/botfather)/getMe"
```

Tiene que devolver `"ok":true` y el `username` que esperas. Si devuelve
`401 Unauthorized`, el token de `secrets/botfather` está mal copiado.

**Apunta el handle resultante**: va al README como Entregable 1.

---

## 1 · Preflight: cuatro cosas que tienen que estar

### 1.1 Secretos

`secrets/.env` tiene que contener al menos estas dos, porque `src/config.ts`
las lee **solo** del entorno:

```
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

El token de Telegram y la key de Gemini se leen de `secrets/botfather` y
`secrets/gemini` si no están en el entorno, así que esos ya están cubiertos.

### 1.2 Entorno del panel

`frontend/apps/web/.env`:

```
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Mismos valores que arriba. Vite solo expone las variables con prefijo `VITE_`.

### 1.3 Esquema y trigger aplicados en Supabase

En el SQL Editor del proyecto, comprueba que las dos tablas existen, que
Realtime está activo en ambas y que el trigger está puesto:

```sql
select tablename from pg_publication_tables where pubname = 'supabase_realtime';
-- esperado: conversations y messages

select tgname from pg_trigger where tgname = 'messages_bump_conversation';
-- esperado: una fila
```

Si falta algo, vuelve a ejecutar `supabase/schema.sql` completo (es idempotente)
más el trigger.

### 1.4 Dependencias

```bash
npm install
cd frontend && npm install && cd ..
```

---

## 2 · Levanta las dos piezas

**Terminal 1 — el bot:**

```bash
npm start
```

Esperado: `bot en long polling`.

Si en su lugar sale `Falta SUPABASE_URL…`, es el punto 1.1.

> **Hay 1 mensaje en cola** en la API de Telegram de pruebas anteriores. En
> cuanto arranque el bot lo va a procesar y responder. No te asustes si ves
> actividad que no provocaste; es eso.

**Terminal 2 — el panel:**

```bash
cd frontend/apps/web && npm run dev
```

Esperado: Vite sirviendo en **http://localhost:5173**. Ábrelo.

El panel tiene que mostrar el indicador de conexión en **"live"**. Si dice
"offline", el problema es Realtime (punto 1.3) o las variables del punto 1.2 —
no el bot.

Deja las dos terminales corriendo todo el tiempo. **Si matas el bot, los
mensajes del operador dejan de llegar a Telegram**, porque es el proceso del bot
el que los reenvía.

---

## 3 · Prueba de humo, siete comprobaciones

Hazlas en orden. Las tres primeras no gastan cuota de Gemini.

| # | Qué haces | Qué tiene que pasar |
|---|---|---|
| 1 | Abre el chat con el bot y pulsa **Iniciar** (o escribe `/start`) | Respuesta **instantánea** con la presentación de Dani. Si tarda, algo está llamando a Gemini cuando no debe. |
| 2 | Mira el panel | Aparece una tarjeta nueva con tu nombre, sin recargar |
| 3 | Manda un sticker o una foto | Contesta pidiendo texto o nota de voz, y el bot **sigue vivo** en la terminal |
| 4 | `hola, qué cursos de python tienen?` | Menciona Python 1 y 2 con horas reales, pregunta por tu perfil, y **no** lista 21 cursos. En el panel, el termómetro y el resumen se rellenan |
| 5 | Manda una **nota de voz** diciendo "¿cuánto cuesta el curso de Arduino?" | Responde sobre Arduino. En el panel, tu mensaje aparece con el prefijo 🎤 |
| 6 | En el panel, escribe un mensaje como operador | Llega a Telegram **bajo la identidad del bot**, y la tarjeta queda marcada como "Operador" |
| 7 | Desde Telegram, responde algo | Aparece en el panel y el bot **no** contesta (la IA quedó pausada en el paso 6). Pulsa "Reanudar IA" y vuelve a contestar |

Si los siete pasan, el circuito funciona completo y puedes ir al guion.

**La 5 es la que más probabilidad tiene de fallar**: la transcripción se probó
contra la API con audio, pero nunca con una nota real de Telegram. Si devuelve
"(nota de voz sin transcripción)", no es un fallo bloqueante — el bot degrada
sin caerse — pero sáltate ese paso en la demo y no lo menciones.

---

## 4 · Limpia antes de presentar

El panel va a tener tus conversaciones de prueba. Para arrancar la demo limpio,
en el SQL Editor:

```sql
delete from public.messages;
delete from public.conversations;
```

Y en Telegram, borra el chat con el bot desde tu lado (**Eliminar chat**) para
que la pantalla de *Iniciar* vuelva a salir como la verá el jurado.

Luego **no vuelvas a escribirle al bot**. Cada mensaje de ensayo gasta cuota de
Gemini, y hoy solo `gemini-3.1-flash-lite` tiene cupo: si lo agotas, el bot
responde con la frase de respaldo durante la demo. Para probar que sigue vivo
usa `/start`, que no llama al modelo.

---

## 5 · Diagnóstico rápido

| Síntoma | Causa más probable |
|---|---|
| `Falta SUPABASE_URL…` al arrancar | `secrets/.env` incompleto → 1.1 |
| `401 Unauthorized` de Telegram | Token mal copiado en `secrets/botfather` |
| El bot arranca pero nunca responde | Mira la Terminal 1. Un `429` es cuota de Gemini agotada; espera o acepta la frase de respaldo |
| Responde siempre la frase de respaldo | Cuota agotada en toda la cadena de modelos |
| El panel dice "offline" | Realtime no activo o variables `VITE_*` ausentes → 1.2 y 1.3 |
| El panel no muestra conversaciones pero el bot responde | Políticas RLS no aplicadas → vuelve a correr `schema.sql` |
| El mensaje del operador no llega a Telegram | El proceso del bot no está corriendo. Es él quien reenvía |
| Las tarjetas no se reordenan al llegar un mensaje | Bug conocido del panel. No bloquea nada; si no está arreglado, no lo señales en la demo |
| `/start` tarda en responder | Está pasando por el handler de texto; debe estar registrado antes |

---

## 6 · Cuando todo pase

Tres cosas, en este orden:

1. **Apunta el handle del bot** y dímelo: va al README como Entregable 1.
2. **Decide qué entregas como Entregable 2.** El panel está en
   `localhost:5173`, que no es accesible para el jurado desde sus equipos. Si lo
   vas a demostrar desde tu máquina en la pantalla compartida, funciona; si el
   jurado va a querer abrirlo, hace falta una URL pública.
3. **Abre `docs/guion-demo.md`** y sigue los ocho pasos. Lee antes la nota sobre
   la cuota: el guion gasta 8 llamadas y no conviene ensayarlo justo antes.
