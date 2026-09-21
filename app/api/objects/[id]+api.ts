/** `/api/objects/:id` — read, replace or delete one trolley object. */
import { trolleyObjectInputSchema } from "@/lib/domain/trolley-object";
import { entityRoutes } from "@/lib/api/collection-routes";
import { trolleyObjects } from "@/lib/storage/collections";

export const { GET, PUT, DELETE } = entityRoutes(trolleyObjects, trolleyObjectInputSchema);
