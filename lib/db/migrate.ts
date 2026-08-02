// Standalone migration runner (npm run db:migrate). The app also applies
// migrations automatically on startup (see lib/db/index.ts); this script is
// useful for running migrations explicitly, e.g. in CI or before first boot.
import "./index";

console.log("Migrations applied.");
