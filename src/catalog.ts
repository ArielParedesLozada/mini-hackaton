import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

const dataPath = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "courses.json");

export function loadCourses(): Course[] {
  return JSON.parse(readFileSync(dataPath, "utf8")) as Course[];
}

export function buildIndexBlock(courses: Course[]): string {
  return courses
    .map((course) => {
      const hours = course.horas !== null ? ` · ${course.horas}h` : "";
      const price = course.precios.publico !== null ? ` · $${course.precios.publico} público` : "";
      return `[${course.id}] ${course.nombre} · ${course.estado}${hours}${price}`;
    })
    .join("\n");
}

export function buildDetailBlock(course: Course): string {
  const objetivos = course.objetivos.map((o) => `- ${o}`).join("\n") || "(sin objetivos)";
  const modulos = course.modulos.map((m) => `- ${m.titulo}: ${m.detalle}`).join("\n") || "(sin módulos)";
  const { estudianteUta, docenteUta, publico } = course.precios;
  return [
    `Nombre: ${course.nombre}`,
    `Estado: ${course.estado}`,
    `Modalidad: ${course.modalidad ?? "no indicada"}`,
    `Horas: ${course.horas ?? "no indicadas"}`,
    `Fecha del curso: ${course.fechaCurso ?? "no indicada"}`,
    `Período de inscripción: ${course.periodoInscripcion ?? "no indicado"}`,
    `Precio estudiante UTA: ${estudianteUta ?? "no indicado"}`,
    `Precio docente/graduado UTA: ${docenteUta ?? "no indicado"}`,
    `Precio público: ${publico ?? "no indicado"}`,
    `Descripción:\n${course.descripcion}`,
    `Objetivos:\n${objetivos}`,
    `Requisitos: ${course.requisitos ?? "no indicados"}`,
    `Tipo de capacitación: ${course.tipoCapacitacion ?? "no indicado"}`,
    `Cupo: ${course.cupo ?? "no indicado"}`,
    `Módulos:\n${modulos}`,
    `URL: ${course.url}`,
  ].join("\n");
}
