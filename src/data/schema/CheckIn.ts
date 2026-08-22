/** A single user response to one question, for one active GIS. */
export interface Response {
  gisId: string;
  questionId: string;
  optionIds: string[];
}

export interface CheckIn {
  id: string;
  endeavourId: string;
  timestamp: string; // ISO string
  responses: Response[];
  rawScore: number;
}
