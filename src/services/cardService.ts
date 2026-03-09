import cards from '@/data/cards.json';
import type { Card } from '@/types/card';

const cardList: Card[] = cards;

export function getAllCards(): Card[] {
  return cardList;
}

// 根据参数查询卡片
export function getCards(params: Partial<Card>): Card[] {
  return cardList.filter((card) => {
    return (Object.keys(params) as Array<keyof Card>).every((key) => card[key] === params[key]);
  });
}
