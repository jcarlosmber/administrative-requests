declare namespace Deno {
  export function serve(handler: (request: Request) => Response | Promise<Response>): void;
  export function serve(options: any, handler: (request: Request) => Response | Promise<Response>): void;
  export const env: {
    get(key: string): string | undefined;
  };
}
