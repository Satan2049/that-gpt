import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { registerChatRoutes } from "./modules/chat/chat.routes.js";
import { registerPromptRoutes } from "./modules/prompt/prompt.routes.js";

async function main() {
  const app = Fastify({
    logger: true,
    bodyLimit: 32 * 1024 * 1024
  });

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({
    status: "ok",
    service: "chatterbox-server"
  }));

  await registerPromptRoutes(app);
  await registerChatRoutes(app);

  try {
    await app.listen({ port: env.port, host: "0.0.0.0" });
    app.log.info(`Server is running on port ${env.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
