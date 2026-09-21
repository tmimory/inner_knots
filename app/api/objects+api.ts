/** `/api/objects` — list every trolley object, or create one. */
import { trolleyObjectInputSchema } from "@/lib/domain/trolley-object";
import { collectionRoutes } from "@/lib/api/collection-routes";
import { trolleyObjects } from "@/lib/storage/collections";

export const { GET, POST } = collectionRoutes(trolleyObjects, trolleyObjectInputSchema);
