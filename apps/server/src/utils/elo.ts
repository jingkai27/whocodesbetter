/**
 * ELO Rating System Utility
 *
 * Uses the standard ELO formula with K-factor of 32 (appropriate for new players
 * where ratings should be more volatile).
 */

const K_FACTOR = 32;

/**
 * Calculate the expected probability of winning for player A against player B
 */
function getExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate ELO rating changes after a match
 *
 * @param winnerElo - Current ELO rating of the winner
 * @param loserElo - Current ELO rating of the loser
 * @returns Object with points to add to winner and subtract from loser
 */
export function calculateEloChange(
  winnerElo: number,
  loserElo: number
): { winnerDelta: number; loserDelta: number } {
  const expectedWinner = getExpectedScore(winnerElo, loserElo);
  const expectedLoser = getExpectedScore(loserElo, winnerElo);

  // Winner gets points based on how unexpected the win was
  // Beating a higher-rated player gives more points
  const winnerDelta = Math.round(K_FACTOR * (1 - expectedWinner));

  // Loser loses points based on how expected the loss was
  // Losing to a lower-rated player loses more points
  const loserDelta = Math.round(K_FACTOR * (0 - expectedLoser));

  return {
    winnerDelta,
    loserDelta: Math.abs(loserDelta), // Return positive value (will be subtracted)
  };
}

/**
 * Calculate new ELO ratings after a match
 *
 * @param winnerElo - Current ELO rating of the winner
 * @param loserElo - Current ELO rating of the loser
 * @returns Object with new ratings for both players
 */
export function calculateNewRatings(
  winnerElo: number,
  loserElo: number
): { newWinnerElo: number; newLoserElo: number } {
  const { winnerDelta, loserDelta } = calculateEloChange(winnerElo, loserElo);

  return {
    newWinnerElo: winnerElo + winnerDelta,
    newLoserElo: Math.max(0, loserElo - loserDelta), // ELO cannot go below 0
  };
}

/**
 * Calculate ELO change for a draw (not used in CodeDuel but included for completeness)
 */
export function calculateDrawEloChange(
  playerAElo: number,
  playerBElo: number
): { playerADelta: number; playerBDelta: number } {
  const expectedA = getExpectedScore(playerAElo, playerBElo);
  const expectedB = getExpectedScore(playerBElo, playerAElo);

  const playerADelta = Math.round(K_FACTOR * (0.5 - expectedA));
  const playerBDelta = Math.round(K_FACTOR * (0.5 - expectedB));

  return { playerADelta, playerBDelta };
}
