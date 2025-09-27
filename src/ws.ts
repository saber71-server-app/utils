import { io, Socket } from 'socket.io-client';

export interface WebsocketConnectConfig {
  ip: string;
  port: number;
  name?: string;
}

const defaultWsName = 'default-ws';

const socketClients: Record<string, Socket> = {};

export function connectWebsocket(config: WebsocketConnectConfig) {
  const socket = io(`ws://${config.ip}:${config.port}`, {
    transports: ['websocket'],
  });
  socket.connect();
  return new Promise<Socket>((resolve, reject) => {
    socket.once('connect', () => {
      socketClients[config.name || defaultWsName] = socket;
      resolve(socket);
    });
    socket.once('connect_error', reject);
  });
}

export function wsClient(name: string = defaultWsName) {
  const client = socketClients[name];
  if (!client) throw new Error('websocket client not found');
  return client;
}
