/**
 * The arithmetic of the coin.
 *
 * A face can pay prose the engine cannot price ("a sandwich"), money, or the
 * forfeit of everything won so far. Only the last two are arithmetic, so the pot
 * is a number the engine keeps only when one of the faces is priced; for a coin
 * whose faces are prose the pot stays out of the prompt entirely and the model
 * is left to hold whatever the words mean.
 *
 * Pure and tiny on purpose: the prompt builder, the runner and the summary all
 * have to agree on what a toss was worth, and they agree by calling this.
 */
import { COIN_FACES, type CoinPayoff, type StPetersburgConfig } from "@/lib/domain/run";

/** True when either face pays money or takes the pot back — when there is a pot at all. */
export function isPriced(faces: StPetersburgConfig["faces"]): boolean {
  return COIN_FACES.some((face) => faces[face].payoff.kind !== "text");
}

/**
 * What one toss does to the pot, or `undefined` when the face's payoff is prose.
 *
 * `flip` is the 1-based turn, so a doubling $2 pays $2, $4, $8… on flips 1, 2, 3
 * — the escalation the paradox is named for. A forfeit is minus the whole pot as
 * it stands, which leaves the running total at zero however much was in it.
 */
export function payoutFor(payoff: CoinPayoff, flip: number, pot: number): number | undefined {
  switch (payoff.kind) {
    case "text":
      return undefined;
    case "amount":
      return payoff.doubles ? payoff.amount * 2 ** (flip - 1) : payoff.amount;
    case "forfeit":
      return -pot;
  }
}
