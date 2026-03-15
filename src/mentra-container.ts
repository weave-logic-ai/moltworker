import { Container } from '@cloudflare/containers';
import type { MoltbotEnv } from './types';

/**
 * MentraBridge container — runs @mentra/sdk AppServer
 * independently from the OpenClaw Sandbox container.
 *
 * Env vars are injected via onStart lifecycle hook.
 */
export class MentraBridge extends Container<MoltbotEnv> {
  defaultPort = 7010;
  sleepAfter = 'never';
  enableInternet = true;

  override onStart(): void {
    // Set env vars from Worker secrets
    const vars: Record<string, string> = {};
    if (this.env.MENTRA_API_KEY) {
      vars.MENTRAOS_API_KEY = this.env.MENTRA_API_KEY;
      vars.MENTRA_API_KEY = this.env.MENTRA_API_KEY;
    }
    if (this.env.MOLTBOT_GATEWAY_TOKEN) {
      vars.OPENCLAW_GATEWAY_TOKEN = this.env.MOLTBOT_GATEWAY_TOKEN;
    }
    if (this.env.WORKER_URL) {
      vars.OPENCLAW_URL = this.env.WORKER_URL;
    }
    vars.MENTRA_PACKAGE_NAME = 'mentra-claw';
    this.envVars = vars;
  }
}
