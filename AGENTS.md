# Instrucciones para el agente implementador (Cursor)

Hackathon con **dos horas de reloj**. Tú escribes el código. Claude mantiene el
diseño, el plan y el prompt del agente conversacional, y trabaja en paralelo en
esta misma carpeta.

## Lee esto primero, en este orden

1. `docs/superpowers/specs/2026-10-29-bot-telegram-ctt-design.md` — el **qué** y el por qué. Ya está aprobado por el usuario; no lo renegocies.
2. `docs/superpowers/plans/2026-10-29-bot-telegram-ctt.md` — el **cómo**. Es tu contrato: siete tareas, cada una con archivos exactos, firmas exactas y criterio de éxito. Ejecútalas en orden y commitea al cerrar cada una.

## Tu alcance

Tareas 1 a 7 del plan. Empieza por la **Tarea 1** (scraper) y sigue con la
**Tarea 2** (catálogo y recuperación): ninguna de las dos necesita credenciales
de Supabase, y esas credenciales todavía no están. La Tarea 3 se desbloquea
cuando el usuario pegue el anon key y el service_role key.

## Lo que no es tuyo

- **`src/prompts.ts`** lo escribe y lo mantiene Claude. Impórtalo y úsalo tal
  cual. Si una respuesta del agente sale mal, **no lo edites**: reporta la
  entrada exacta y la salida obtenida. Está calibrado contra la rúbrica.
- El diseño y el plan. Si encuentras un problema real con ellos, dilo en una
  línea y sigue con la tarea; no los reescribas por iniciativa propia.

## Reglas que no se negocian

- **Secretos.** Están en `./secrets/`, que está gitignored: `botfather` (token de
  Telegram), `gemini` (API key), `supabase` (connection string de Postgres, que
  **no** necesitas) y `.env` con las variables de Supabase. Léelos desde
  `src/config.ts`. Nunca escribas un valor de secreto en código, en un commit,
  en un log ni en el README.
- **Nombres de las keys de Supabase.** El proyecto usa el formato nuevo:
  `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY`. Los nombres
  `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_KEY` **no existen aquí**; no los
  inventes. Detalle en la Tarea 3 del plan.
- **El token de Telegram jamás llega al navegador.** El dashboard solo habla con
  Supabase, con la **publishable key**.
- **TLS sin verificar solo en `scripts/scrape.ts`.** El certificado del sitio UTA
  es inválido y sin eso el fetch falla con exit 60. En ningún otro archivo.
- **El sitio UTA es intranet** (`172.21.123.71`): solo se alcanza desde la red de
  la universidad. Por eso se scrapea una vez y `data/courses.json` se commitea.
  En runtime el bot **no** toca el sitio.
- **Modelo:** `MODEL` y `FALLBACK_MODELS` de `src/prompts.ts`, hoy
  `gemini-3-flash-preview` con respaldo `gemini-3.1-flash-lite`. No los
  sustituyas por un id de la familia `gemini-2.5-*`: esa familia devuelve 404
  para cuentas nuevas y lo comprobé contra esta API key.
- **Nada de n8n, Docker, MongoDB ni embeddings.** Se evaluaron y se descartaron;
  el razonamiento está en la §6 del diseño.
- **Ninguna excepción sin manejar en los caminos de Telegram y Gemini.** Esto se
  demuestra en vivo ante un jurado: un fallo degrada a una respuesta de respaldo,
  no tumba el proceso.

## Si te quedas sin tiempo

El orden de sacrificio es: Tarea 7 (docs), luego las notas de voz de la Tarea 5.
Todo lo demás puntúa en la rúbrica y se entrega.
