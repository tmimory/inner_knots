/** Client-side access to `/api/characters`. */
import type { Character, CharacterInput } from "../domain/character";

import { createCollectionClient } from "./collection";

export const charactersApi = createCollectionClient<Character, CharacterInput>("characters");
