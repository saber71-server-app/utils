import { nacosRegisterService } from './nacos.ts';
import { config as _config } from './config.ts';
import { connectRedis } from './redis.ts';
import { connectDatabase } from './typeorm.ts';
import { connectWebsocket, type WebsocketConnectConfig } from './ws.ts';

export { default as config } from './config.ts';
export * from './config.ts';
export * from './env.ts';
export * from './gateway.ts';
export * from './nacos.ts';
export * from './platform.ts';
export * from './redis.ts';
export * from './typeorm.ts';
export * from './ws.ts';

export function connect(option?: {
  redis?: boolean;
  database?: string;
  databaseEntities?: any[];
  nacos?: boolean;
  ws?: WebsocketConnectConfig;
}) {
  const promises: Promise<any>[] = [];
  const cfg = _config();
  if (option?.nacos) promises.push(nacosRegisterService(cfg.getNacosConfig()));
  if (option?.redis ?? true)
    promises.push(cfg.getRedisConfig().then((cfg) => connectRedis(cfg)));
  if (option?.database)
    promises.push(
      cfg
        .getDatabaseConfig()
        .then((cfg) =>
          connectDatabase(
            { ...cfg, database: option.database! },
            ...(option.databaseEntities ?? []),
          ),
        ),
    );
  if (option?.ws) promises.push(connectWebsocket(option.ws));
  return Promise.all(promises);
}
