import ip from 'ip';
import { connectWebsocket } from './ws.ts';
import { config } from './config.ts';

export interface GatewayConfig {
  ip: string;
  port: number;
  serviceName: string;
}

const socketClientName = '$Gateway$';

export async function connectGateway(cfg: GatewayConfig) {
  const socketClient = await connectWebsocket({
    ip: cfg.ip,
    port: cfg.port,
    name: socketClientName,
  });
  return new Promise<void>((resolve, reject) => {
    socketClient.emit(
      'online',
      {
        ip: ip.address('public'),
        port: config().getValue('appPort'),
        serverName: config().getValue('serverName'),
      },
      (ack: string) => {
        if (ack === 'ok') resolve();
        else reject(ack);
      },
    );
  });
}
