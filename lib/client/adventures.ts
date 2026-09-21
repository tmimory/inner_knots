/** Client-side access to `/api/adventures`. */
import type { Adventure, AdventureInput } from "../domain/adventure";

import { createCollectionClient } from "./collection";

export const adventuresApi = createCollectionClient<Adventure, AdventureInput>("adventures");
