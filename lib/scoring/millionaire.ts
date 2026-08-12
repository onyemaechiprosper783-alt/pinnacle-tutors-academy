export interface PrizeTier {
  tier: number; // 1-indexed
  prize: string;
  isSafeHaven: boolean;
}

// Prize labels only — this is a points/badge game, not real money. Framed
// as "Pinnacle Points" to stay clearly original and avoid implying a real
// cash payout.
export const PRIZE_LADDER: PrizeTier[] = [
  { tier: 1, prize: '1,000 pts', isSafeHaven: false },
  { tier: 2, prize: '2,000 pts', isSafeHaven: false },
  { tier: 3, prize: '3,000 pts', isSafeHaven: false },
  { tier: 4, prize: '5,000 pts', isSafeHaven: false },
  { tier: 5, prize: '10,000 pts', isSafeHaven: true },
  { tier: 6, prize: '15,000 pts', isSafeHaven: false },
  { tier: 7, prize: '25,000 pts', isSafeHaven: false },
  { tier: 8, prize: '50,000 pts', isSafeHaven: false },
  { tier: 9, prize: '75,000 pts', isSafeHaven: false },
  { tier: 10, prize: '100,000 pts', isSafeHaven: true },
  { tier: 11, prize: '150,000 pts', isSafeHaven: false },
  { tier: 12, prize: '250,000 pts', isSafeHaven: false },
  { tier: 13, prize: '500,000 pts', isSafeHaven: false },
  { tier: 14, prize: '750,000 pts', isSafeHaven: false },
  { tier: 15, prize: '1,000,000 pts', isSafeHaven: false },
];

export function safeHavenPrizeForTier(reachedTier: number): string {
  // reachedTier = highest tier successfully answered (0 if none).
  const passedSafeHavens = PRIZE_LADDER.filter((t) => t.isSafeHaven && t.tier <= reachedTier);
  if (passedSafeHavens.length === 0) return '0 pts';
  return passedSafeHavens[passedSafeHavens.length - 1].prize;
}
