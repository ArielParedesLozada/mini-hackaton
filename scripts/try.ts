import { runAgentTurn } from "../src/gemini.ts";

const userMessage = process.argv.slice(2).join(" ").trim();
if (!userMessage) {
  console.error("uso: npx tsx scripts/try.ts \"mensaje\"");
  process.exit(1);
}

const turn = await runAgentTurn({ userMessage, history: [], resumenPrevio: "" });
console.log(JSON.stringify(turn, null, 2));
