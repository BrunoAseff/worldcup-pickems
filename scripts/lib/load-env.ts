import { existsSync } from "node:fs";
import { config } from "dotenv";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
}

if (existsSync(".env")) {
  config({ path: ".env" });
}
