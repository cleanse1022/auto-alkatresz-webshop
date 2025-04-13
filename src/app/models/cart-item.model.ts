import { Part } from './part.model';

export interface CartItem {
  part: Part;
  quantity: number;
}