import { serve, type ServerType } from "@hono/node-server";
import { type Context, Hono } from "hono";
import { proxy } from "hono/proxy";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import ip from "ip";
import { config } from "./config.ts";
import { Logger } from "./logger.ts";

export interface HonoExt extends Hono {
  start(): ServerType;
  proxy(prefix: string, dst: string | ((c: Context) => string)): void;
}

let app: HonoExt | null = null;

export function hono() {
  if (!app) {
    app = new Hono() as HonoExt;
    app.use(prettyJSON(), logger());
    app.start = function () {
      return serve(
        {
          fetch: this.fetch,
          port: config().getValue("appPort"),
        },
        (info) => {
          Logger.info(`Listening on http://localhost:${info.port}`);
        },
      );
    };

    const address = ip.address("public");
    app.proxy = function (prefix, dst) {
      this.all(prefix, (c) => {
        let dstTo = dst as string;
        if (typeof dst !== "string") dstTo = dst(c);
        return proxy(dstTo, {
          ...c.req,
          headers: {
            ...c.req.header(),
            "X-Forwarded-For": address,
            "X-Forwarded-Host": c.req.header("host"),
          },
        });
      });
    };
  }
  return app;
}
