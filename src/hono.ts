import { serve, type ServerType } from "@hono/node-server";
import { type Context, Hono } from "hono";
//@ts-ignore
import type { JSONRespondReturn } from "hono/dist/types/context";
import { proxy } from "hono/proxy";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import ip from "ip";
import { config } from "./config.ts";
import { Logger } from "./logger.ts";

export interface HonoExt extends Hono {
  start(): ServerType;
  proxy(prefix: string, dst: string | ((c: Context) => string | Error)): void;
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
        let dstTo = dst as string | Error;
        if (typeof dst !== "string") dstTo = dst(c);
        if (typeof dstTo !== "string") return resultDTO(c).error(dstTo);
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

export function resultDTO(ctx: Context): {
  success(data?: any): JSONRespondReturn<any, any>;
  error(msg: any): JSONRespondReturn<any, any>;
} {
  const dto: Record<string, any> = {
    success: true,
  };
  return {
    success(data: any = "ok") {
      dto.success = true;
      dto.data = data;
      return ctx.json(dto);
    },
    error(msg: any) {
      dto.success = false;
      dto.error = msg;
      if (msg instanceof Error) dto.error = msg.stack;
      return ctx.json(dto);
    },
  };
}
