export type CardStatus = 'unknown' | 'fuzzy' | 'mastered';

export interface Card {
  id: string;
  category: string;
  subcategory: string;
  question: string;
  answer: string;
  content?: string;
  tags?: string[];
  status?: CardStatus;
  createdAt?: string;
  updatedAt?: string;
}
