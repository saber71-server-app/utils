import ip from "ip";
import { connectWebsocket, wsClient } from "./ws.ts";

export interface GatewayConfig {
  ip: string;
  port: number;
  serviceName: string;
  clientPort: number;
  clientName: string;
}

const socketClientName = "$Gateway$";
const clientIp = ip.address("public");

export async function connectGateway(cfg: GatewayConfig) {
  const socketClient = await connectWebsocket({
    ip: cfg.ip,
    port: cfg.port,
    name: socketClientName,
  });
  return new Promise<void>((resolve, reject) => {
    socketClient.emit(
      "online",
      {
        id: clientIp + ":" + cfg.clientPort,
        ip: clientIp,
        port: cfg.clientPort,
        serverName: cfg.clientName,
      },
      (ack: string) => {
        if (ack === "ok") resolve();
        else reject(ack);
      },
    );
  });
}

export function gatewayGetConfig(key: string) {
  return wsClient(socketClientName).dispatch("getConfig", { key });
}

export async function gatewaySetConfig(key: string, value: any) {
  const ack = await wsClient(socketClientName).dispatch("setConfig", {
    key,
    value,
  });
  return ack === "ok";
}

export function gatewaySubscribeConfig(
  key: string,
  callback: (data: { newValue: any; oldValue: any }) => {},
) {
  wsClient(socketClientName).on("updateConfig:" + key, callback);
  return () => {
    wsClient(socketClientName).off("updateConfig:" + key, callback);
  };
}
