import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as fsPromise from "node:fs/promises";
import { Client, type ConnectConfig, type SFTPWrapper } from "ssh2";
import { config } from "./config.ts";

export interface FileInfo {
  name(): string;
  path(): string;
  stat(): Promise<fs.Stats>;
}

export abstract class Platform {
  fileInfo(path: fs.PathLike): FileInfo {
    const p = path.toString();
    const name = p
      .split(/[/\\]/)
      .filter((i) => i)
      .pop()!;
    let stat: fs.Stats | undefined = undefined;
    return {
      name(): string {
        return name;
      },
      path(): string {
        return p;
      },
      stat: async () => {
        if (!stat) {
          stat = await this.stat(path);
        }
        return stat;
      },
    };
  }

  recursive(
    root: string,
    callback: (fileInfo: FileInfo) => boolean | undefined | void,
  ) {
    const platform = this;
    return recursive(this.fileInfo(root));

    async function recursive(fileInfo: FileInfo): Promise<boolean | undefined> {
      const stat = await fileInfo.stat();
      if (stat.isDirectory()) {
        const children = await platform.readdir(fileInfo.path());
        for (let child of children) {
          const result = await recursive(child);
          if (result === false) return result;
        }
      } else {
        if (callback(fileInfo) === false) return false;
      }
    }
  }

  abstract stat(path: fs.PathLike): Promise<fs.Stats>;

  abstract readdir(path: fs.PathLike): Promise<FileInfo[]>;

  abstract rm(path: fs.PathLike): Promise<void>;

  abstract readFile(path: fs.PathLike): Promise<string>;

  abstract readFileBuffer(path: fs.PathLike): Promise<Buffer>;

  abstract exec<T>(
    command: string,
    args?: readonly string[],
    callback?: (data: T) => void,
  ): Promise<number>;
}

class NativePlatform extends Platform {
  async readdir(path: fs.PathLike): Promise<FileInfo[]> {
    const names = await fsPromise.readdir(path);
    return names.map((name) => this.fileInfo(path.toString() + "/" + name));
  }

  readFile(path: fs.PathLike): Promise<string> {
    return fsPromise.readFile(path, "utf-8");
  }

  readFileBuffer(path: fs.PathLike): Promise<Buffer> {
    return fsPromise.readFile(path);
  }

  rm(path: fs.PathLike): Promise<void> {
    return fsPromise.rm(path, { recursive: true });
  }

  stat(path: fs.PathLike): Promise<fs.Stats> {
    return fsPromise.stat(path);
  }

  exec<T>(
    command: string,
    args?: readonly string[],
    callback?: (data: T) => void,
  ): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const stream = spawn(command, args);
      stream.on("error", reject);
      stream.on("close", resolve);
      if (callback) stream.on("data", callback);
    });
  }
}

class SshPlatform extends Platform {
  private readonly _client: Client;
  private readonly _config: ConnectConfig;
  private _inited: boolean = false;

  constructor(config: ConnectConfig) {
    super();
    this._config = config;
    this._client = new Client();
  }

  async exec<T>(
    command: string,
    args?: readonly string[],
    callback?: (data: T) => void,
  ): Promise<number> {
    await this._init();
    return new Promise<number>((resolve, reject) => {
      if (args) {
        args = args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg));
        command += " " + args.join(" ");
      }
      this._client.exec(command, (err, channel) => {
        if (err) reject(err);
        else {
          channel.on("close", (code: number) => resolve(code));
          if (callback) channel.on("data", callback);
        }
      });
    });
  }

  async readdir(path: fs.PathLike): Promise<FileInfo[]> {
    const sftp = await this._sftp();
    return new Promise<FileInfo[]>((resolve, reject) => {
      sftp.readdir(path.toString(), (err, list) => {
        if (err) reject(err);
        else
          resolve(
            list.map((i) => ({
              name() {
                return i.filename;
              },
              path() {
                return path.toString() + "/" + this.name();
              },
              stat() {
                return Promise.resolve(i.attrs as any);
              },
            })),
          );
      });
    });
  }

  async readFile(path: fs.PathLike): Promise<string> {
    const sftp = await this._sftp();
    return new Promise<string>((resolve, reject) => {
      sftp.readFile(path.toString(), (err, handle) => {
        if (err) reject(err);
        else resolve(handle.toString());
      });
    });
  }

  async readFileBuffer(path: fs.PathLike): Promise<Buffer> {
    const sftp = await this._sftp();
    return new Promise<Buffer>((resolve, reject) => {
      sftp.readFile(path.toString(), (err, handle) => {
        if (err) reject(err);
        else resolve(handle);
      });
    });
  }

  async rm(path: fs.PathLike): Promise<void> {
    const sftp = await this._sftp();
    return new Promise<void>((resolve, reject) => {
      sftp.unlink(path.toString(), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async stat(path: fs.PathLike): Promise<fs.Stats> {
    const sftp = await this._sftp();
    return new Promise<fs.Stats>((resolve, reject) => {
      sftp.stat(path.toString(), (err, stats) => {
        if (err) reject(err);
        else resolve(stats as any);
      });
    });
  }

  private async _sftp() {
    await this._init();
    return new Promise<SFTPWrapper>((resolve, reject) => {
      this._client.sftp((err, sftp) => {
        if (err) reject(err);
        else resolve(sftp);
      });
    });
  }

  private _init() {
    if (this._inited) return;
    return new Promise<void>((resolve, reject) => {
      this._client
        .connect(this._config)
        .on("ready", () => {
          this._inited = true;
          resolve();
        })
        .on("error", reject);
    });
  }
}

let _platform: Platform | null = null;

export function platform() {
  if (!_platform) {
    const cfg = config();
    if (cfg.ssh) _platform = new SshPlatform(cfg.ssh);
    else _platform = new NativePlatform();
  }
  return _platform;
}
