/** `/api/adventures/:id` — read, replace or delete one adventure. */
import { adventureInputSchema } from "@/lib/domain/adventure";
import { entityRoutes } from "@/lib/api/collection-routes";
import { adventures } from "@/lib/storage/collections";

export const { GET, PUT, DELETE } = entityRoutes(adventures, adventureInputSchema);
