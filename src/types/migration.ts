import type { Card, Category } from './card';

export type ExportType = 'json';
export type ImportType = 'json';

export interface ExportData {
  categories: Category[];
  cards: Card[];
  version: string;
  exportedAt: number;
}

export interface ImportData {
  categories: Category[];
  cards: Card[];
  version: string;
  exportedAt: number;
}

export interface ImportResult {
  categroryCount: number;
  cardCount: number;
}
