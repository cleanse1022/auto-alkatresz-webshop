export interface Part {
  id?: string;            // Firestore dokumentum ID
  name: string;
  category: string;
  brand: string;          // Alkatrész márka/gyártó
  price: number;
  description?: string;
  imageUrl?: string;      // Kép URL tárolására
}