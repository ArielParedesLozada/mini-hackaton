import { expect, test } from "vitest";
import { buildIndexBlock, loadCourses } from "./catalog.ts";

test("el bloque índice entra en el presupuesto de tokens", () => {
  const block = buildIndexBlock(loadCourses());
  expect(block.length).toBeLessThan(3000);
});

test("el índice marca el estado de cada curso", () => {
  const block = buildIndexBlock(loadCourses());
  expect(block).toContain("CERRADO");
  expect(block).toContain("ABIERTO");
});
