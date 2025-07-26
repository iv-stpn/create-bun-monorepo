import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Get the directory of the current file (works in both bundled and unbundled code)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const rootPath = join(__dirname, "..");
