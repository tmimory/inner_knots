/** `/api/characters/:id` — read, replace or delete one character. */
import { characterInputSchema } from "@/lib/domain/character";
import { entityRoutes } from "@/lib/api/collection-routes";
import { characters } from "@/lib/storage/collections";

export const { GET, PUT, DELETE } = entityRoutes(characters, characterInputSchema);
