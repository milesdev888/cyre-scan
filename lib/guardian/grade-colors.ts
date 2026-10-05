/**
 * Unified Guardian grade palette — scanner UI, share cards, seal bands.
 * Red is reserved exclusively for fraud flags / revocation — never for a low grade.
 *
 * AA metallic platinum tokens live in `./aa-platinum` (single style definition).
 */

import type { Grade } from "@/lib/guardian/types";
import { AA_PLATINUM } from "@/lib/guardian/aa-platinum";

export { AA_PLATINUM, AA_PLATINUM_SHEEN } from "@/lib/guardian/aa-platinum";

export const GRADE_HEX: Record<Exclude<Grade, "U"> | "U", string> = {
  AA: AA_PLATINUM.mid, // platinum mid — metal treatment via aa-platinum
  A: "#E8C56A", // gold — share-card / canvas. Scanner A tile uses .grade-a-tile (navy accent).
  B: "#4FD1C5", // teal — distinct from Grade A steel-blue #8FB0DE
  C: "#9AA4B2", // grey
  D: "#E09A3C", // amber
  F: "#E09A3C", // amber — not red
  U: "#9AA4B2",
};

/** Tailwind class bundles matching GRADE_HEX (no red on D/F). AA uses `.grade-aa-tile`. */
export const GRADE_TILE_CLASS: Record<Grade, string> = {
  AA: "grade-aa-tile",
  A: "grade-a-tile",
  B: "border-[#4FD1C5]/45 bg-[#4FD1C5]/10 text-[#4FD1C5]",
  C: "border-[#9AA4B2]/40 bg-[#9AA4B2]/10 text-[#9AA4B2]",
  D: "border-[#E09A3C]/45 bg-[#E09A3C]/10 text-[#E09A3C]",
  F: "border-[#E09A3C]/45 bg-[#E09A3C]/10 text-[#E09A3C]",
  U: "border-border bg-secondary text-muted-foreground",
};

export function gradeHex(grade: Grade | string | null | undefined): string {
  const g = String(grade || "U").toUpperCase() as Grade;
  return GRADE_HEX[g] ?? GRADE_HEX.U;
}
