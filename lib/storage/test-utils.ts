/**
 * Test helper: points `DATA_DIR` at a fresh temporary directory for the duration
 * of one test, so storage tests never see each other's files or the real store.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resetRunCache } from "./runs";

export type TempStore = { dir: string; cleanup: () => Promise<void> };

/** Creates a temp data directory, sets `DATA_DIR`, and returns how to undo it. */
export async function useTempDataDir(): Promise<TempStore> {
  const previous = process.env.DATA_DIR;
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "inner-knots-"));
  process.env.DATA_DIR = dir;
  resetRunCache();

  return {
    dir,
    cleanup: async () => {
      if (previous === undefined) delete process.env.DATA_DIR;
      else process.env.DATA_DIR = previous;
      resetRunCache();
      await fs.promises.rm(dir, { recursive: true, force: true });
    },
  };
}
