import { Container } from '@cloudflare/containers';

/**
 * MentraBridge container — runs @mentra/sdk AppServer
 * independently from the OpenClaw Sandbox container.
 */
export class MentraBridge extends Container {
  defaultPort = 7010;
  sleepAfter = 'never';
  enableInternet = true;
}
