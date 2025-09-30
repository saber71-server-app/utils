import { config as _config } from "./config.ts";
import { connectGateway, type GatewayConfig } from "./gateway.ts";
import { connectRedis, type RedisConfig } from "./redis.ts";
import { connectDatabase, type DatabaseConfig } from "./typeorm.ts";
import { connectWebsocket, type WebsocketConnectConfig } from "./ws.ts";

export * from "./config.ts";
export * from "./env.ts";
export * from "./gateway.ts";
export * from "./hono.ts";
export * from "./logger.ts";
export * from "./platform.ts";
export * from "./redis.ts";
export * from "./request.ts";
export * from "./typeorm.ts";
export * from "./ws.ts";

export async function connect(option?: {
  redis?: number | boolean | RedisConfig;
  database?: string | DatabaseConfig;
  databaseEntities?: any[];
  gateway?: boolean | GatewayConfig;
  ws?: WebsocketConnectConfig;
}) {
  const promises: Promise<any>[] = [];
  const cfg = _config();

  if (option?.gateway) {
    await connectGateway(
      typeof option.gateway === "object"
        ? option.gateway
        : cfg.getValue("gateway"),
    );
  }

  if (typeof option?.redis === "number" || option?.redis) {
    if (typeof option.redis === "number")
      promises.push(connectRedis(cfg.getRedisConfig(option.redis)));
    else
      promises.push(
        connectRedis(
          option.redis === true ? cfg.getRedisConfig() : option.redis,
        ),
      );
  }

  if (option?.database) {
    const entities = option.databaseEntities || [];
    if (typeof option.database === "string")
      promises.push(
        connectDatabase(cfg.getDatabaseConfig(option.database), entities),
      );
    else promises.push(connectDatabase(option.database, entities));
  }

  if (option?.ws) promises.push(connectWebsocket(option.ws));

  return Promise.all(promises);
}
