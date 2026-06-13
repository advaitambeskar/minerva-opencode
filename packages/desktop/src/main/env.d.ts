interface ImportMetaEnv {
  readonly MINERVA_CHANNEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "virtual:opencode-server" {
  export namespace Server {
    export const listen: typeof import("../../../minerva/dist/types/src/node").Server.listen
    export type Listener = import("../../../minerva/dist/types/src/node").Server.Listener
  }
  export namespace Config {
    export const get: typeof import("../../../minerva/dist/types/src/node").Config.get
    export type Info = import("../../../minerva/dist/types/src/node").Config.Info
  }
  export const bootstrap: typeof import("../../../minerva/dist/types/src/node").bootstrap
}
