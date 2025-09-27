import { Logger } from '@nestjs/common';
import axios from 'axios';
import ip from 'ip';
import { type Host, NacosConfigClient, NacosNamingClient } from 'nacos';

export interface RegisterConfig {
  nacosServerAddress?: string;
  username?: string;
  password?: string;
  serviceName: string;
  namespace?: string;
  port: number;
}

interface HostWithHref extends Host {
  href: string;
}

let nameClient: NacosNamingClient | null = null;
let configClient: NacosConfigClient | null = null;

export async function nacosRegisterService(config: RegisterConfig) {
  nameClient = new NacosNamingClient({
    logger: console,
    serverList: config.nacosServerAddress || 'localhost:8848',
    namespace: config.namespace,
    username: config.username || 'nacos',
    password: config.password || '123456',
  });
  configClient = new NacosConfigClient({
    serverAddr: config.nacosServerAddress || 'localhost:8848',
    namespace: config.namespace,
    username: config.username || 'nacos',
    password: config.password || '123456',
  });
  await nameClient.ready();
  const address = ip.address('public');
  await nameClient.registerInstance(config.serviceName, {
    ip: address,
    port: config.port,
    instanceId: `${address}:${config.port}`,
    healthy: true,
    enabled: true,
  });
  Logger.log('Service registered successful');
}

export function nacosNamingClient() {
  if (!nameClient) throw new Error('尚未初始化NacosNamingClient');
  return nameClient;
}

export function nacosConfigClient() {
  if (!configClient) throw new Error('尚未初始化NacosConfigClient');
  return configClient;
}

const configCache: Record<string, string> = {};

export async function getNacosConfig(
  key: string,
  group: string = 'DEFAULT_GROUP',
  subscribe?: boolean,
) {
  const cacheKey = `${group}:${key}`;
  if (!(cacheKey in configCache)) {
    configCache[cacheKey] = await nacosConfigClient().getConfig(key, group);
    if (subscribe)
      nacosConfigClient().subscribe(
        { dataId: key, group },
        (content: string) => {
          configCache[cacheKey] = content;
        },
      );
  }
  return configCache[cacheKey];
}

export async function nacosHost(serviceName: string): Promise<HostWithHref> {
  const hosts = await nacosNamingClient().getAllInstances(serviceName);
  if (!hosts.length) throw new Error(`找不到${serviceName}服务`);
  const host = hosts[0];
  return {
    ...host,
    href: `http://${host.ip}:${host.port}`,
  };
}

interface Request {
  get: typeof axios.get;
  post: typeof axios.post;
  postForm: typeof axios.postForm;
  delete: typeof axios.delete;
  put: typeof axios.put;
  putForm: typeof axios.putForm;
  patch: typeof axios.patch;
  patchForm: typeof axios.patchForm;
  request: typeof axios.request;
}

export function nacosService(serviceName: string): Request {
  const hostPromise = nacosHost(serviceName);

  async function request(methodName: string, ...args: any) {
    const host = await hostPromise;
    return (axios.create({ baseURL: host.href }) as any)[methodName](...args);
  }

  return {
    get(...args) {
      return request('get', ...args);
    },
    post(...args) {
      return request('post', ...args);
    },
    postForm(...args) {
      return request('postForm', ...args);
    },
    delete(...args) {
      return request('delete', ...args);
    },
    put(...args) {
      return request('put', ...args);
    },
    putForm(...args) {
      return request('putForm', ...args);
    },
    patch(...args) {
      return request('patch', ...args);
    },
    patchForm(...args) {
      return request('patchForm', ...args);
    },
    request(...args) {
      return request('request', ...args);
    },
  };
}
