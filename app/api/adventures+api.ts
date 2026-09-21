/** `/api/adventures` — list every adventure, or create one. */
import { adventureInputSchema } from "@/lib/domain/adventure";
import { collectionRoutes } from "@/lib/api/collection-routes";
import { adventures } from "@/lib/storage/collections";

export const { GET, POST } = collectionRoutes(adventures, adventureInputSchema);
