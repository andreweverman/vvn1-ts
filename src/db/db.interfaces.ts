import { Document } from "mongoose";
export interface findOrCreateResponse {
  created: boolean;
  message: string;
  doc?: Document;
}

export interface updateOneResponse {
  n: number;
  nModified: number;
  ok: number;
  updateResponse: string;
  noUpdateResponse: string;
}
