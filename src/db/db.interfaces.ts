import {Document} from 'mongoose'
export interface findOrCreateResponse {
  created: boolean;
  message: string;
  doc?: Document;
}
