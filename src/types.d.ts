declare module "ws" {
  class WebSocket extends globalThis.WebSocket {
    constructor(url: string | URL, protocols?: string | string[]);
  }
  export { WebSocket };
}
