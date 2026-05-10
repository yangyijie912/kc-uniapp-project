import type { CardStatus, CardStatusCode, CardStatusLabel } from '@/types/card';

export const CARD_STATUS_LABELS = {
  unknown: '未知',
  fuzzy: '模糊',
  mastered: '掌握',
} as const satisfies Record<CardStatus, CardStatusLabel>;

export const CARD_STATUS_TO_CODE = {
  unknown: 0,
  fuzzy: 1,
  mastered: 2,
} as const satisfies Record<CardStatus, CardStatusCode>;

export const CARD_STATUS_FROM_CODE = {
  0: 'unknown',
  1: 'fuzzy',
  2: 'mastered',
} as const satisfies Record<CardStatusCode, CardStatus>;

export const STATUS_OPTIONS = [
  { label: '全部', value: undefined },
  { label: CARD_STATUS_LABELS.mastered, value: 'mastered' },
  { label: CARD_STATUS_LABELS.fuzzy, value: 'fuzzy' },
  { label: CARD_STATUS_LABELS.unknown, value: 'unknown' },
] as const satisfies Array<{ label: CardStatusLabel | '全部'; value?: CardStatus }>;
