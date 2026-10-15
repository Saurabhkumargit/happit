import app from "./app.js";
import { env } from "./config/env.js";

const port = env.PORT ?? env.API_PORT;

app.listen(port, "0.0.0.0", () => {
  console.log(`Happit API running on port ${port}`);
});