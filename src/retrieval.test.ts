import { expect, test } from "vitest";
import { loadCourses } from "./catalog.ts";
import { matchCourses } from "./retrieval.ts";

test("tolera faltas ortográficas y acentos ausentes", () => {
  const [c] = matchCourses("quiero aprender pyton", loadCourses());
  expect(c.nombre.toLowerCase()).toContain("python");
});

test("un dígito en la consulta no cae en el curso del otro dígito", () => {
  const [c] = matchCourses("fundamentos de python 2", loadCourses());
  expect(c.nombre).toMatch(/2/);
  expect(c.nombre).not.toMatch(/1/);
});

test("sin coincidencia devuelve vacío en lugar de ruido", () => {
  expect(matchCourses("hola buenas tardes", loadCourses())).toHaveLength(0);
});

test("respeta el límite", () => {
  expect(matchCourses("python javascript redes arduino", loadCourses(), 2)).toHaveLength(2);
});
