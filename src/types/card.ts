export type CardStatus = 'unknown' | 'fuzzy' | 'mastered';

export type Category = {
  id: string;
  name: string;
  sort: number;
};

export type Subcategory = {
  id: string;
  name: string;
  categoryId: string;
};

export interface Card {
  id: string;
  categoryId: string;
  subcategoryId: string;
  question: string;
  answer: string;
  content?: string;
  tags?: string[];
  status?: CardStatus;
  createdAt?: string;
  updatedAt?: string;
}
