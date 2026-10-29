import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { Agent, fetch } from "undici";

const BASE = "https://ctt-talleresfisei.uta.edu.ec";
const agent = new Agent({ connect: { rejectUnauthorized: false } });

export type Course = {
  id: number;
  nombre: string;
  estado: "ABIERTO" | "CERRADO";
  horas: number | null;
  modalidad: string | null;
  descripcion: string;
  objetivos: string[];
  precios: {
    estudianteUta: number | null;
    docenteUta: number | null;
    publico: number | null;
  };
  fechaCurso: string | null;
  periodoInscripcion: string | null;
  requisitos: string | null;
  modulos: { titulo: string; detalle: string }[];
  url: string;
};

function clean(text: string): string {
  return text
    .replace(/[^\n]*-->[^\n]*/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

async function getHtml(path: string): Promise<string> {
  const res = await fetch(`${BASE}/${path}`, {
    dispatcher: agent,
    headers: { "User-Agent": "Mozilla/5.0 (CTT-FISEI scraper)" },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} → ${res.status}`);
  }
  return await res.text();
}

function parseListing(html: string): Map<number, { estado: Course["estado"]; horas: number | null }> {
  const $ = cheerio.load(html);
  const byId = new Map<number, { estado: Course["estado"]; horas: number | null }>();

  $("a.h5[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const match = href.match(/curso(\d+)\.php/i);
    if (!match) return;
    const id = Number(match[1]);
    const card = $(el).closest(".col-lg-4");
    const blob = clean(card.text());
    const estado: Course["estado"] = /\bCERRADO\b/.test(blob)
      ? "CERRADO"
      : /\bABIERTO\b/.test(blob)
        ? "ABIERTO"
        : "CERRADO";
    const hoursMatch = blob.match(/(\d+)\s*HORAS/i);
    const horas = hoursMatch ? Number(hoursMatch[1]) : null;
    byId.set(id, { estado, horas });
  });

  return byId;
}

function fieldFromItems(
  items: { label: string; value: string }[],
  ...needles: string[]
): string | null {
  for (const item of items) {
    const hay = item.label.toLowerCase();
    if (needles.every((n) => hay.includes(n))) {
      const value = clean(item.value);
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

function parsePrecios(blob: string): Course["precios"] {
  const precios = {
    estudianteUta: null as number | null,
    docenteUta: null as number | null,
    publico: null as number | null,
  };
  const re = /(\d+)\s*USD|\$\s*(\d+(?:[.,]\d{2})?)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(blob)) !== null) {
    const raw = match[1] ?? match[2] ?? "";
    const n = Math.round(Number(raw.replace(",", ".")));
    if (!Number.isFinite(n) || n <= 0) continue;
    const dollarStyle = match[0].includes("$");
    const ctx = dollarStyle
      ? blob.slice(Math.max(0, match.index - 80), match.index).toLowerCase()
      : blob.slice(match.index, match.index + match[0].length + 80).toLowerCase();
    if (ctx.includes("estudiante")) precios.estudianteUta = n;
    else if (ctx.includes("docente") || ctx.includes("graduado")) precios.docenteUta = n;
    else if (ctx.includes("general") || ctx.includes("público") || ctx.includes("publico")) {
      precios.publico = n;
    }
  }
  return precios;
}

function parseDetail(id: number, html: string, listing: { estado: Course["estado"]; horas: number | null } | undefined): Course {
  const $ = cheerio.load(html);
  const nombre = clean($("h1.tituloCurso").first().text() || $("h1").first().text() || $("title").first().text());

  const descripcion = clean($("div.descripcion p").first().text());

  const objetivos = $("div.objetivos li")
    .toArray()
    .map((li) => clean($(li).text()))
    .filter(Boolean);

  const tab = $(".pc-tab").last();
  const tab1 = tab.find("div.tab1").first();
  const items: { label: string; value: string }[] = [];

  tab1.find("li").each((_, li) => {
    const $li = $(li);
    if ($li.parents("div.tab1 ul ul").length > 0) return;
    const strong = clean($li.find("strong").first().text()).replace(/:$/, "");
    const clone = $li.clone();
    clone.find("strong").first().remove();
    const value = clean(clone.text());
    if (strong) items.push({ label: strong, value });
    else if (value) items.push({ label: "", value });
  });

  const modalidad = fieldFromItems(items, "modalidad");
  const horasTexto = fieldFromItems(items, "horas");
  const horasFromDetail = horasTexto?.match(/(\d+)/)?.[1];
  const horas = listing?.horas ?? (horasFromDetail ? Number(horasFromDetail) : null);

  const fechaCurso = fieldFromItems(items, "fecha", "curso") ?? fieldFromItems(items, "fecha del curso");
  const periodoInscripcion =
    fieldFromItems(items, "inscripcion") ??
    fieldFromItems(items, "inscripciones") ??
    fieldFromItems(items, "período") ??
    fieldFromItems(items, "periodo");
  const requisitos = fieldFromItems(items, "conocimientos") ?? fieldFromItems(items, "requisitos");
  const precios = parsePrecios(tab1.text());

  const modulos = tab
    .find("div.tab3 li")
    .toArray()
    .map((li) => {
      const $li = $(li);
      const titulo = clean($li.find("strong").first().text()).replace(/^•\s*/, "");
      const clone = $li.clone();
      clone.find("strong").first().remove();
      const detalle = clean(clone.text());
      return { titulo: titulo || detalle, detalle };
    })
    .filter((m) => m.titulo.length > 0);

  return {
    id,
    nombre,
    estado: listing?.estado ?? "CERRADO",
    horas,
    modalidad,
    descripcion,
    objetivos,
    precios,
    fechaCurso,
    periodoInscripcion,
    requisitos,
    modulos,
    url: `${BASE}/curso${id}.php`,
  };
}

async function main() {
  const listingHtml = await getHtml("course.php");
  const listing = parseListing(listingHtml);

  const courses: Course[] = [];
  for (let id = 1; id <= 21; id++) {
    const html = await getHtml(`curso${id}.php`);
    courses.push(parseDetail(id, html, listing.get(id)));
  }
  courses.sort((a, b) => a.id - b.id);

  const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "courses.json");
  writeFileSync(outPath, `${JSON.stringify(courses, null, 2)}\n`);

  const emptyNames = courses.filter((c) => !c.nombre || c.nombre.includes("-->"));
  const longDesc = courses.filter((c) => c.descripcion.length > 100).length;
  const withPublicPrice = courses.filter((c) => typeof c.precios.publico === "number").length;
  const estados = new Set(courses.map((c) => c.estado));

  console.log(`wrote ${courses.length} courses → ${outPath}`);
  console.log(`empty/dirty names: ${emptyNames.length}`);
  console.log(`descripcion > 100: ${longDesc}`);
  console.log(`precios.publico numeric: ${withPublicPrice}`);
  console.log(`estados: ${[...estados].join(", ")}`);
}

await main();
