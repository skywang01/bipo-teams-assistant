/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGENT_MODE?: string;
  readonly VITE_BIPO_AGENT_ID?: string;
  readonly VITE_TEAMS_CLIENT_ID?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
