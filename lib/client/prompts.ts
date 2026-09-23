/**
 * Client-side access to the prompt preview routes.
 *
 * These power the Prompt View: what would actually be sent to a model for a
 * given character or puzzle configuration, composed by the same code a run uses.
 */
import type { AdventurePromptResponse } from "@/app/api/prompts/adventure+api";
import type { FragmentSummary } from "@/app/api/prompts/fragments+api";
import type { PrisonersDilemmaPromptResponse } from "@/app/api/prompts/prisoners-dilemma+api";
import type { StPetersburgPromptResponse } from "@/app/api/prompts/st-petersburg+api";
import type { TrolleyPromptResponse } from "@/app/api/prompts/trolley+api";

import type { Character } from "../domain/character";
import type { DecisionStyle } from "../domain/enums";
import type { PrisonersDilemmaConfig, StPetersburgConfig, TrolleyVariant } from "../domain/run";
import { apiFetch } from "./api";

export type { FragmentSummary };

function post<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

/** The composed system prompt for a character, without saving it. `null` for raw. */
export async function previewSteering(character: Pick<Character, "steering">): Promise<string | null> {
  const { prompt } = await post<{ prompt: string | null }>("/api/prompts/steering", { character });
  return prompt;
}

export type TrolleyPromptRequest = {
  variant: TrolleyVariant;
  /** Object ids; the server resolves them through the objects collection. */
  track1: string[];
  track2: string[];
  decisionStyle?: DecisionStyle;
};

/** The composed trolley prompt for a track layout. */
export function previewTrolleyPrompt(config: TrolleyPromptRequest): Promise<TrolleyPromptResponse> {
  return post<TrolleyPromptResponse>("/api/prompts/trolley", { config });
}

/**
 * Round-one prompts for both sides of a prisoner's dilemma.
 *
 * Each side's closing instructions are derived on the server from the character
 * in that seat (`playerA` / `playerB`), and the styles it used come back in
 * `decisionStyles`. `decisionStyle` is only the fallback for a seat that is
 * still empty.
 */
export function previewPrisonersDilemmaPrompt(
  config: Partial<PrisonersDilemmaConfig> & { decisionStyle?: DecisionStyle },
): Promise<PrisonersDilemmaPromptResponse> {
  return post<PrisonersDilemmaPromptResponse>("/api/prompts/prisoners-dilemma", { config });
}

export type StPetersburgPromptRequest = {
  /** What the voice says each face is worth, and whether it ends the game. */
  faces: StPetersburgConfig["faces"];
  maxFlips: number;
  decisionStyle?: DecisionStyle;
};

/** The first turn's prompt for a coin, with nothing flipped yet. */
export function previewStPetersburgPrompt(
  config: StPetersburgPromptRequest,
): Promise<StPetersburgPromptResponse> {
  return post<StPetersburgPromptResponse>("/api/prompts/st-petersburg", { config });
}

/** The briefing plus the first node's prompt for an adventure. */
export function previewAdventurePrompt(
  adventureId: string,
  amnesia = false,
  decisionStyle?: DecisionStyle,
): Promise<AdventurePromptResponse> {
  return post<AdventurePromptResponse>("/api/prompts/adventure", { adventureId, amnesia, decisionStyle });
}

/** Every markdown fragment on disk, for a "view the prompts" screen. */
export async function fetchFragments(): Promise<FragmentSummary[]> {
  const { fragments } = await apiFetch<{ fragments: FragmentSummary[] }>("/api/prompts/fragments");
  return fragments;
}
