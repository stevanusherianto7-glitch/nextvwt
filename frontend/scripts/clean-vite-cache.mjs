import { rmSync, existsSync } from "fs";
import { join } from "path";

const dirs = [
  "node_modules/.vite",
  "node_modules/.cache",
  ".vite",
  "dist",
];

for (const dir of dirs) {
  const fullPath = join(process.cwd(), dir);
  if (existsSync(fullPath)) {
    rmSync(fullPath, { recursive: true, force: true });
    console.log(`[clean] removed ${dir}`);
  }
}
