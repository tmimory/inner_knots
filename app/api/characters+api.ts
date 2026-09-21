/**
 * `/api/characters` — list every character, or create one.
 *
 * `POST` creates and refuses an id that is already taken; use
 * `PUT /api/characters/:id` to change an existing character.
 */
import { characterInputSchema } from "@/lib/domain/character";
import { collectionRoutes } from "@/lib/api/collection-routes";
import { characters } from "@/lib/storage/collections";

export const { GET, POST } = collectionRoutes(characters, characterInputSchema);
