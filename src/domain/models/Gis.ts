export type GisTier = "mandatory" | "optional" | "recommended";

export type QuestionType = "single-select" | "multi-select" | "scale";

/**
 * A single selectable choice for a Question. `value` is the fractional score
 * (0.0-1.0) this option contributes if selected — this is the only thing the
 * scoring engine ever reads. `label` is display-only, for the UI to render.
 */
export interface Option {
  id: string;
  label: string;
  value: number; // 0.0-1.0
}

/**
 * A single structured check-in question. Owns its options and their
 * values(contribution to growth if selected).
 */
export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: Option[];
}

/**
 * A GIS (Growth Indicating Strategy) — the content/definition layer. Owns its
 * questions and each question's options + values. Static: authored once,
 * identical for every user and every check-in. Never holds anything about what
 * a user actually answered — that lives on CheckIn/Response (see CheckIn.ts).
 */
export interface Gis {
  id: string;
  name: string;
  baseWeight: number;
  questions: Question[];
}
