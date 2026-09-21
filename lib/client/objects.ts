/** Client-side access to `/api/objects` (the things that go on the tracks). */
import type { TrolleyObject, TrolleyObjectInput } from "../domain/trolley-object";

import { createCollectionClient } from "./collection";

export const objectsApi = createCollectionClient<TrolleyObject, TrolleyObjectInput>("objects");
