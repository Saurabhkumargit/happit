import app from "./app.js";

import { env } from "./config/env.js";

app.listen(env.API_PORT, () => {
  console.log(`Happit API running on port ${env.API_PORT}`);
});