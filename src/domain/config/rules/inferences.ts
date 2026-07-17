export type InferenceAction = "pre_select" | "auto_skip";

export interface InferenceRule {
  sourceGisId: string;
  sourceOptionId: string;
  targetGisId: string;
  targetOptionId: string;
  action: InferenceAction;
}

/**
 * Smart-flow rules for daily check-ins. Allows the UI to infer answers for i+1
 * questions based on earlier selections.
 */
export const INFERENCE_RULES: InferenceRule[] = [
  // First real rule per rival-v1-content-decisions.md
  // {
  //   sourceGisId: "depth_of_focus",
  //   sourceOptionId: "flow",
  //   targetGisId: "friction_encountered",
  //   targetOptionId: "none",
  //   action: "pre_select"
  // }
];
