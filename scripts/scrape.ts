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
  tipoCapacitacion: string | null;
  cupo: string | null;
  modulos: { titulo: string; detalle: string }[];
  url: string;
};

function uncomment(html: string): string {
  return html.replace(/<!--([\s\S]*?)-->/g, "\n$1\n");
}

function clean(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.includes("-->"))
    .join("\n")
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

function parseListing(html: string): Map<number, { estado: Course["estado"]; horas: number | null; nombre: string }> {
  const $ = cheerio.load(uncomment(html));
  const byId = new Map<number, { estado: Course["estado"]; horas: number | null; nombre: string }>();

  $("a.h5[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const match = href.match(/curso(\d+)\.php/i);
    if (!match) return;
    const id = Number(match[1]);
    const card = $(el).closest(".col-lg-4");
    const badgeText = card
      .find("small")
      .toArray()
      .map((s) => $(s).text())
      .join(" ");
    const estado: Course["estado"] = /\bABIERTO\b/.test(badgeText)
      ? "ABIERTO"
      : /\bCERRADO\b/.test(badgeText)
        ? "CERRADO"
        : "CERRADO";
    const hoursMatch = badgeText.match(/(\d+)\s*HORAS/i);
    const horas = hoursMatch ? Number(hoursMatch[1]) : null;
    const nombre = clean($(el).text());
    byId.set(id, { estado, horas, nombre });
  });

  return byId;
}

function labeledValue(items: { label: string; value: string }[], ...needles: string[]): string | null {
  for (const item of items) {
    const hay = item.label.toLowerCase();
    if (needles.every((n) => hay.includes(n))) {
      const value = clean(item.value);
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

function assignAudience(
  precios: Course["precios"],
  n: number,
  ctx: string,
): void {
  const c = ctx.toLowerCase();
  if (precios.docenteUta === null && /graduad|docente|administrativ/.test(c)) {
    precios.docenteUta = n;
    return;
  }
  if (precios.publico === null && (c.includes("general") || c.includes("úblico") || c.includes("publico"))) {
    precios.publico = n;
    return;
  }
  if (precios.estudianteUta === null && (c.includes("estudiante") || c.includes("egresado"))) {
    precios.estudianteUta = n;
  }
}

function parsePrecios(blob: string): Course["precios"] {
  const precios = {
    estudianteUta: null as number | null,
    docenteUta: null as number | null,
    publico: null as number | null,
  };
  const re = /(\d+)\s*USD|\$\s*(\d+(?:[.,]\d{2})?)/gi;
  const matches = [...blob.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const raw = match[1] ?? match[2] ?? "";
    const n = Math.trunc(Number(String(raw).replace(",", ".")));
    if (!Number.isFinite(n) || n <= 0) continue;
    const prevEnd = i === 0 ? 0 : (matches[i - 1].index ?? 0) + matches[i - 1][0].length;
    const nextStart = i + 1 < matches.length ? (matches[i + 1].index ?? blob.length) : blob.length;
    const idx = match.index ?? 0;
    const dollarStyle = match[0].includes("$");
    const ctx = dollarStyle
      ? blob.slice(Math.max(prevEnd, idx - 70), idx + match[0].length)
      : blob.slice(idx, Math.min(nextStart, idx + match[0].length + 70));
    assignAudience(precios, n, ctx);
  }
  return precios;
}

function parseDetail(
  id: number,
  html: string,
  listing: { estado: Course["estado"]; horas: number | null; nombre: string } | undefined,
): Course {
  const $ = cheerio.load(uncomment(html));
  const h1 = clean($("h1.tituloCurso").last().text() || $("h1").last().text());
  const nombre = h1 && !h1.includes("CTT-FISEI") ? h1 : listing?.nombre ?? h1;

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

  const modalidad = labeledValue(items, "modalidad");
  const horasTexto = labeledValue(items, "horas");
  const horasFromDetail = horasTexto?.match(/(\d+)/)?.[1];
  const horas = horasFromDetail ? Number(horasFromDetail) : (listing?.horas ?? null);

  const fechaCurso = labeledValue(items, "fecha", "curso");
  const periodoInscripcion =
    labeledValue(items, "inscripciones") ??
    labeledValue(items, "inscripcion") ??
    labeledValue(items, "período") ??
    labeledValue(items, "periodo");
  const requisitos = labeledValue(items, "conocimientos") ?? labeledValue(items, "requisitos");
  const pageText = clean($.root().text());
  const tipoCapacitacion =
    labeledValue(items, "tipo", "capacitaci") ??
    pageText.match(/tipo de capacitaci[oó]n:\s*([^\n]+)/i)?.[1]?.trim() ??
    null;
  const cupo =
    labeledValue(items, "cupo") ??
    pageText.match(/(?:el )?cupo de inscripciones:\s*([^\n]+)/i)?.[1]?.trim() ??
    null;
  const priceBlob = $(".pc-tab div.tab1")
    .toArray()
    .map((el) => $(el).text())
    .join("\n");
  const precios = parsePrecios(priceBlob);

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
    tipoCapacitacion,
    cupo,
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
  const realPath = join(outDir, "courses.json");
  writeFileSync(realPath, `${JSON.stringify(courses, null, 2)}\n`);

  const emptyNames = courses.filter((c) => !c.nombre || c.nombre.includes("-->") || c.nombre.includes("CTT-FISEI"));
  const longDesc = courses.filter((c) => c.descripcion.length > 100).length;
  const withPublic = courses.filter((c) => typeof c.precios.publico === "number").length;
  const withEst = courses.filter((c) => typeof c.precios.estudianteUta === "number").length;
  const withDoc = courses.filter((c) => typeof c.precios.docenteUta === "number").length;
  const withPeriodo = courses.filter((c) => c.periodoInscripcion).length;
  const withTipo = courses.filter((c) => c.tipoCapacitacion).length;
  const withCupo = courses.filter((c) => c.cupo).length;
  const c1 = courses.find((c) => c.id === 1);
  const c10 = courses.find((c) => c.id === 10);
  const c18 = courses.find((c) => c.id === 18);

  console.log(`wrote ${courses.length} courses → ${realPath}`);
  console.log(`dirty names: ${emptyNames.length}`);
  console.log(`descripcion>100: ${longDesc} publico: ${withPublic} est: ${withEst} doc: ${withDoc}`);
  console.log(`periodo: ${withPeriodo} tipoCapacitacion: ${withTipo} cupo: ${withCupo}`);
  console.log(`id1 estado=${c1?.estado} pub=${c1?.precios.publico} est=${c1?.precios.estudianteUta} doc=${c1?.precios.docenteUta}`);
  console.log(`id10=${c10?.estado} id11=${courses.find((c) => c.id === 11)?.estado} id12=${courses.find((c) => c.id === 12)?.estado}`);
  console.log(`id18=${c18?.estado}`);
}

await main();
