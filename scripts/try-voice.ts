import { readFileSync } from "node:fs";
import { transcribeAudio } from "../src/gemini.ts";

const path = process.argv[2] ?? "/tmp/ctt-voice.wav";
const mime = path.endsWith(".ogg") ? "audio/ogg" : path.endsWith(".mp3") ? "audio/mp3" : "audio/wav";
const buf = readFileSync(path);
console.log("audio", path, buf.length, mime);
const text = await transcribeAudio(buf, mime);
console.log("transcripción:", JSON.stringify(text));
if (!text) process.exit(1);
