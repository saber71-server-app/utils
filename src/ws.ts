import { io, type Socket } from "socket.io-client";

export interface WebsocketConnectConfig {
  ip: string;
  port: number;
  name?: string;
}

export interface ISocket extends Socket {
  dispatch(event: string, data: any): Promise<string>;
}

const defaultWsName = "default-ws";

const socketClients: Record<string, ISocket> = {};

export function connectWebsocket(
  config: WebsocketConnectConfig,
): Promise<ISocket> {
  const socket = io(`ws://${config.ip}:${config.port}`, {
    transports: ["websocket"],
  });
  socket.connect();
  return new Promise<ISocket>((resolve, reject) => {
    socket.once("connect", () => {
      socket.off("connect_error", reject);
      (socket as any).dispatch = (event: string, data: any) => {
        return new Promise<string>((resolve1, reject1) => {
          socket.emit(event, data, (ack: any) => {
            socket.off("connect_error", reject1);
            resolve1(ack);
          });
          socket.once("connect_error", reject1);
        });
      };
      socketClients[config.name || defaultWsName] = socket as any;
      resolve(socket as any);
    });
    socket.once("connect_error", reject);
  });
}

export function wsClient(name: string = defaultWsName) {
  const client = socketClients[name];
  if (!client) throw new Error("websocket client not found");
  return client;
}
