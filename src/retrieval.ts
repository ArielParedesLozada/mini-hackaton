import type { Course } from "./catalog.ts";

const STOPWORDS = new Set(["de", "la", "y", "en", "para", "del", "a", "al", "curso", "los", "las"]);

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 99;
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function present(needle: string, haystack: string[]): boolean {
  if (haystack.includes(needle)) return true;
  if (needle.length < 5) return false;
  return haystack.some((t) => t.length >= 5 && editDistance(needle, t) <= 1);
}

function digitsIn(tokensList: string[]): string[] {
  return tokensList.filter((t) => /^\d+$/.test(t));
}

export function matchCourses(text: string, courses: Course[], limit = 2): Course[] {
  const queryTokens = tokens(text);
  const queryDigits = digitsIn(queryTokens);
  const scored: { course: Course; score: number }[] = [];

  for (const course of courses) {
    const nameTokens = tokens(course.nombre);
    const nameDigits = digitsIn(nameTokens);

    if (nameDigits.length > 0 && queryDigits.length > 0) {
      const overlap = queryDigits.some((d) => nameDigits.includes(d));
      if (!overlap) continue;
    }

    let score = 0;
    for (const token of nameTokens) {
      if (/^\d+$/.test(token)) continue;
      if (present(token, queryTokens)) score += 1;
    }

    if (queryDigits.length > 0 && nameDigits.some((d) => queryDigits.includes(d))) {
      score += 10;
    }

    if (score > 0) scored.push({ course, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.course);
}
