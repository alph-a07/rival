/** A single user response to one question, for one active GIS. */
export interface CheckInResponse {
  gisId: string;
  questionId: string;
  optionIds: string[];
}

export interface CheckIn {
  id: string;
  endeavourId: string;
  timestamp: string; // ISO string
  responses: CheckInResponse[];
  rawScore: number;
}
