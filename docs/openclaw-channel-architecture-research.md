# OpenClaw Channel Architecture: Research Report

**Date**: 2026-03-17
**Branch**: clawft-production
**Source**: /opt/openclaw on moltworker VM
**Purpose**: Reverse-engineer the built-in channel system to add a new "asg" (Augmented Smart Glasses) channel

---

## 1. High-Level Architecture

OpenClaw channels are implemented as **extension plugins**. Each channel lives in `extensions/<channel-name>/` and is compiled by `tsdown` into `dist-runtime/extensions/<channel-name>/`. The plugin system discovers extensions, loads them, and calls their `register()` function, which in turn calls `api.registerChannel()` to dock the channel into the runtime.

### Two-Tier Structure

| Layer | Location | Purpose |
|-------|----------|---------|
| **Channel infrastructure** | `src/channels/` | Shared channel plumbing: registry, config, status, typing, sessions, allowlists, routing |
| **Extension plugins** | `extensions/<id>/` | Per-channel implementation: bot clients, message parsing, delivery, setup wizard |

### Registration Flow

```
Plugin Discovery (src/plugins/discovery.ts)
  -> Plugin Loader (src/plugins/loader.ts)
    -> jiti() loads extension module
    -> module.register(api) called
      -> api.registerChannel({ plugin: channelPlugin })
        -> Plugin Registry (src/plugins/registry.ts)
          -> Stored in registry.channels[] and registry.channelSetups[]
```

---

## 2. Extension Directory Structure

Every built-in channel extension follows this pattern:

```
extensions/<channel-name>/
  index.ts              # Main entry: exports default plugin with register()
  setup-entry.ts        # Lightweight setup-only entry (for CLI/wizard, no bot client)
  openclaw.plugin.json  # Plugin manifest: { id, channels, configSchema }
  package.json          # Package metadata with openclaw.extensions and openclaw.setupEntry
  src/
    channel.ts          # Full ChannelPlugin object (runtime mode)
    channel.setup.ts    # Lightweight ChannelPlugin (setup-only mode)
    runtime.ts          # Plugin runtime store (get/set runtime reference)
    accounts.ts         # Account resolution from config
    bot.ts / monitor.ts # Bot client creation and lifecycle
    bot-message*.ts     # Inbound message context building
    bot-message-dispatch.ts  # Dispatches to agent via dispatchReplyWithBufferedBlockDispatcher
    send.ts             # Outbound message delivery
    format.ts           # Message formatting
    ...
```

### Key Files (Telegram Example)

| File | Purpose |
|------|---------|
| `extensions/telegram/index.ts` | Entry point; calls `api.registerChannel({ plugin: telegramPlugin })` |
| `extensions/telegram/setup-entry.ts` | Exports `{ plugin: telegramSetupPlugin }` for setup-only mode |
| `extensions/telegram/openclaw.plugin.json` | `{ "id": "telegram", "channels": ["telegram"], "configSchema": {...} }` |
| `extensions/telegram/package.json` | `{ "openclaw": { "extensions": ["./index.ts"], "setupEntry": "./setup-entry.ts" } }` |
| `extensions/telegram/src/channel.ts` | Full `ChannelPlugin<ResolvedTelegramAccount, TelegramProbe, TelegramAudit>` with all adapters |
| `extensions/telegram/src/channel.setup.ts` | Minimal `ChannelPlugin` for setup/wizard (no gateway/outbound) |
| `extensions/telegram/src/monitor.ts` | `monitorTelegramProvider()` -- creates Grammy bot, starts polling/webhook |
| `extensions/telegram/src/bot-message-context.session.ts` | Builds `MsgContext` (the payload for the AI agent) |
| `extensions/telegram/src/bot-message-dispatch.ts` | Calls `dispatchReplyWithBufferedBlockDispatcher()` to invoke the agent |
| `extensions/telegram/src/send.ts` | `sendMessageTelegram()`, `editMessageTelegram()` |

---

## 3. The ChannelPlugin Interface

Defined in `src/channels/plugins/types.plugin.ts`. This is the core contract:

```typescript
type ChannelPlugin<ResolvedAccount = any, Probe = unknown, Audit = unknown> = {
  // REQUIRED
  id: ChannelId;                    // e.g. "asg"
  meta: ChannelMeta;                // UI metadata (label, blurb, systemImage, etc.)
  capabilities: ChannelCapabilities; // chatTypes, reactions, threads, media, etc.
  config: ChannelConfigAdapter<ResolvedAccount>; // Account management

  // OPTIONAL (but needed for a working channel)
  gateway?: ChannelGatewayAdapter<ResolvedAccount>;  // startAccount, stopAccount, logout
  outbound?: ChannelOutboundAdapter;                  // send messages out
  setup?: ChannelSetupAdapter;                         // config apply/validate
  status?: ChannelStatusAdapter<...>;                  // probe, audit, dashboard summary
  security?: ChannelSecurityAdapter<...>;              // DM policy
  pairing?: ChannelPairingAdapter;                     // Pairing/approval flow

  // OTHER OPTIONAL ADAPTERS
  setupWizard?: ChannelSetupWizard;
  configSchema?: ChannelConfigSchema;
  reload?: { configPrefixes: string[] };
  groups?: ChannelGroupAdapter;
  mentions?: ChannelMentionAdapter;
  auth?: ChannelAuthAdapter;
  elevated?: ChannelElevatedAdapter;
  commands?: ChannelCommandAdapter;
  lifecycle?: ChannelLifecycleAdapter;
  execApprovals?: ChannelExecApprovalAdapter;
  allowlist?: ChannelAllowlistAdapter;
  acpBindings?: ChannelAcpBindingAdapter;
  streaming?: ChannelStreamingAdapter;
  threading?: ChannelThreadingAdapter;
  messaging?: ChannelMessagingAdapter;
  agentPrompt?: ChannelAgentPromptAdapter;
  directory?: ChannelDirectoryAdapter;
  resolver?: ChannelResolverAdapter;
  actions?: ChannelMessageActionAdapter;
  heartbeat?: ChannelHeartbeatAdapter;
  agentTools?: ChannelAgentToolFactory | ChannelAgentTool[];
};
```

### Minimum Viable ChannelPlugin

Based on analysis of all channels, the absolute minimum is:

```typescript
{
  id: "asg",
  meta: { id: "asg", label: "ASG", selectionLabel: "ASG (Smart Glasses)", docsPath: "/channels/asg", blurb: "..." },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => [...],      // Return account IDs from config
    resolveAccount: (cfg, id) => {...},   // Resolve account config object
  },
}
```

To actually send/receive messages, you also need:
- `gateway.startAccount` -- to start the listener/poller
- `outbound.sendText` or `outbound.sendPayload` -- to deliver agent replies

---

## 4. The Plugin Entry Point Pattern

### index.ts

```typescript
import type { ChannelPlugin, OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk/core";
import { asgPlugin } from "./src/channel.js";
import { setAsgRuntime } from "./src/runtime.js";

const plugin = {
  id: "asg",
  name: "ASG",
  description: "Augmented Smart Glasses channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setAsgRuntime(api.runtime);
    api.registerChannel({ plugin: asgPlugin as ChannelPlugin });
  },
};

export default plugin;
```

### openclaw.plugin.json

```json
{
  "id": "asg",
  "channels": ["asg"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

### package.json

```json
{
  "name": "@openclaw/asg",
  "version": "2026.3.17",
  "private": true,
  "description": "OpenClaw ASG channel plugin",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts"
  }
}
```

### setup-entry.ts

```typescript
import { asgSetupPlugin } from "./src/channel.setup.js";
export default { plugin: asgSetupPlugin };
```

---

## 5. Message Flow: Inbound (User -> Agent)

### Telegram Example (generalizes to any channel):

```
1. Bot receives platform event (Grammy update / webhook)
2. registerTelegramHandlers() routes to createTelegramMessageProcessor()
3. buildTelegramMessageContext() constructs the MsgContext:
   - Body, RawBody, CommandBody
   - From: "telegram:<chatId>"  /  To: "telegram:<chatId>"
   - SessionKey: computed via buildAgentSessionKey()
   - AccountId
   - Provider: "telegram", Surface: "telegram"
   - OriginatingChannel: "telegram"
   - OriginatingTo: "telegram:<chatId>"
   - ChatType: "direct" | "group"
   - SenderName, SenderId, SenderUsername
   - MediaPath, MediaUrl, MediaType (if media)
   - MessageSid, ReplyToId, Timestamp
4. dispatchTelegramMessage() calls:
   dispatchReplyWithBufferedBlockDispatcher({
     ctx: ctxPayload,    // The MsgContext
     cfg: openclawConfig,
     dispatcherOptions: {
       deliver: async (payload, info) => { /* send reply back */ },
       typingCallbacks: { start, onStartError },
     }
   })
5. This resolves to dispatchInboundMessageWithBufferedDispatcher()
   -> dispatchInboundMessage()
   -> dispatchReplyFromConfig()  (src/auto-reply/reply/dispatch-from-config.ts)
   -> This routes to the configured AI provider, gets response
   -> Calls dispatcher.deliver(payload) with the agent's reply
6. The deliver callback sends the reply back through the channel's send API
```

### Key: MsgContext Fields a Channel MUST Set

| Field | Required | Example |
|-------|----------|---------|
| `Body` | YES | User's message text |
| `From` | YES | `"asg:<deviceId>"` |
| `To` | YES | `"asg:<deviceId>"` |
| `SessionKey` | YES | Computed via `buildAgentSessionKey()` |
| `Provider` | YES | `"asg"` |
| `Surface` | YES | `"asg"` |
| `OriginatingChannel` | YES | `"asg"` |
| `OriginatingTo` | YES | `"asg:<deviceId>"` |
| `ChatType` | YES | `"direct"` |
| `SenderId` | recommended | Device/user ID |
| `SenderName` | recommended | Display name |
| `Timestamp` | recommended | Unix ms |
| `MessageSid` | recommended | Unique message ID |
| `AccountId` | for multi-account | Account identifier |
| `MediaPath` / `MediaUrl` | if media | File path or URL |

---

## 6. Message Flow: Outbound (Agent -> User)

The agent response flows back through the `deliver` callback provided in `dispatcherOptions`:

```typescript
dispatcherOptions: {
  deliver: async (payload: ReplyPayload, info: { kind: "block" | "final" }) => {
    // payload.text = the agent's response text
    // payload.mediaUrl = optional media
    // payload.isError = true if error response
    // Send it through your channel's API
    await sendToDevice(payload.text, { mediaUrl: payload.mediaUrl });
  },
}
```

Alternatively, channels can implement `outbound.sendText` / `outbound.sendPayload` on the `ChannelPlugin` for structured outbound delivery (used by `send --to` commands, heartbeat, etc.).

The `ChannelOutboundAdapter` interface:

```typescript
outbound: {
  deliveryMode: "direct" | "gateway" | "hybrid",
  sendText?: (ctx: ChannelOutboundContext) => Promise<OutboundDeliveryResult>,
  sendMedia?: (ctx: ChannelOutboundContext) => Promise<OutboundDeliveryResult>,
  sendPayload?: (ctx: ChannelOutboundPayloadContext) => Promise<OutboundDeliveryResult>,
  resolveTarget?: (params) => { ok: true, to } | { ok: false, error },
  chunker?: (text, limit) => string[],
  textChunkLimit?: number,
}
```

---

## 7. Channel Configuration Schema

### In openclaw.json

```json
{
  "channels": {
    "asg": {
      "enabled": true,
      "allowFrom": ["device-001", "device-002"],
      "defaultTo": "device-001",
      "dmPolicy": "allowlist",
      "accounts": {
        "default": {
          "enabled": true,
          "label": "ASG Glasses",
          "apiKey": "...",
          "port": 7010
        }
      }
    }
  }
}
```

The `ChannelsConfig` type in `src/config/types.channels.ts` has a dynamic `[key: string]: any` catch-all, so extension channels do not need to be added to the type. They just use the `ExtensionChannelConfig` base type:

```typescript
type ExtensionChannelConfig = {
  enabled?: boolean;
  allowFrom?: string | string[];
  defaultTo?: string;
  defaultAccount?: string;
  dmPolicy?: string;
  groupPolicy?: GroupPolicy;
  healthMonitor?: ChannelHealthMonitorConfig;
  accounts?: Record<string, unknown>;
  [key: string]: unknown;
};
```

---

## 8. Dashboard Integration

The dashboard queries the gateway method `"channels.status"` (implemented in `src/gateway/server-methods/channels.ts`). This method:

1. Calls `listChannelPlugins()` -- returns all registered channel plugins, sorted by `CHAT_CHANNEL_ORDER` then by `meta.order`
2. For each plugin, builds account snapshots via `buildChannelAccountSnapshot()`
3. Calls `plugin.status?.buildChannelSummary()` for summary data
4. Builds UI catalog via `buildChannelUiCatalog()` which extracts:
   - `channelOrder`: ordered list of channel IDs
   - `channelLabels`: `{ "asg": "ASG" }`
   - `channelDetailLabels`: `{ "asg": "ASG Smart Glasses" }`
   - `channelSystemImages`: `{ "asg": "eyeglasses" }`
   - `channelMeta`: array of `{ id, label, detailLabel, systemImage }`

### What Makes a Channel Appear in the Dashboard

Simply being registered via `api.registerChannel()` is sufficient. The `channels.status` handler iterates `listChannelPlugins()`, which returns all plugins from `registry.channels[]`. No hardcoded list check is needed for extension channels.

However, the `CHAT_CHANNEL_ORDER` array in `src/channels/registry.ts` controls sort order for the core channels. Extension channels that are NOT in this array get sorted after core channels, ordered by `meta.order` then alphabetically.

To make the channel appear with a name/icon: set `meta.label`, `meta.detailLabel`, and `meta.systemImage`.

---

## 9. Gateway Account Lifecycle

The `server-channels.ts` module manages channel account lifecycles:

```
Gateway Start
  -> createChannelManager()
    -> For each registered channel plugin:
      -> plugin.config.listAccountIds(cfg) -- get configured accounts
      -> For each account:
        -> plugin.config.isEnabled(account, cfg)
        -> plugin.config.isConfigured(account, cfg)
        -> If enabled + configured:
          -> plugin.gateway.startAccount(ctx) -- start the listener/poller
            -> ctx includes: { cfg, accountId, account, runtime, abortSignal, log, getStatus, setStatus, channelRuntime }
            -> Returns a Promise that resolves when the channel stops
```

The `startAccount` function receives a `ChannelGatewayContext` with:
- `cfg` -- full OpenClaw config
- `accountId` -- the account being started
- `account` -- resolved account object
- `runtime` -- RuntimeEnv for logging etc.
- `abortSignal` -- signal to abort on shutdown
- `log` -- subsystem logger
- `getStatus()` / `setStatus()` -- read/write runtime snapshot
- `channelRuntime?` -- optional Plugin SDK runtime helpers (for external plugins)

If `startAccount`'s promise rejects/resolves, the channel manager restarts it with exponential backoff (up to 10 attempts).

---

## 10. Build System

### tsdown.config.ts

The build system automatically discovers extension directories:

```typescript
function listBundledPluginBuildEntries(): Record<string, string> {
  const extensionsRoot = path.join(process.cwd(), "extensions");
  // Scans each subdirectory for openclaw.plugin.json
  // Reads package.json openclaw.extensions[] entries
  // Builds entry map: "extensions/<name>/index" -> "extensions/<name>/index.ts"
}
```

Output goes to `dist-runtime/extensions/<name>/`.

### Import Resolution

Extensions import from `openclaw/plugin-sdk/core`, `openclaw/plugin-sdk/compat`, etc. These resolve via package.json `exports` mapping:

```json
"./plugin-sdk/core": {
  "types": "./dist/plugin-sdk/core.d.ts",
  "default": "./dist/plugin-sdk/core.js"
}
```

Extensions can also import directly from `../../../src/...` for internal modules (relative paths), but this couples them to the monorepo structure.

---

## 11. Two-Phase Registration

Channels support two registration modes:

1. **setup-only**: Only the `setup-entry.ts` is loaded. Used for CLI setup/wizard when the full bot client is not needed. Exports a minimal `ChannelPlugin` with just `id`, `meta`, `capabilities`, `config`, and `setup`.

2. **full**: The main `index.ts` is loaded. Includes everything: gateway, outbound, status, etc.

The loader determines mode based on whether the channel is enabled in config:
- Enabled channel -> `registrationMode = "full"`
- Disabled channel with setupEntry -> `registrationMode = "setup-only"`

---

## 12. Existing "mentra" Channel (Precedent)

A `mentra` channel already exists in `dist-runtime/extensions/mentra/` as a hand-placed compiled JavaScript file. It uses a simplified interface that does NOT fully conform to `ChannelPlugin`:

```javascript
const mentraChannelPlugin = {
  id: 'mentra',
  name: 'Mentra Live',
  capabilities: { text: true, media: true, voice: true, ... },
  start(config) { ... },
  stop() { ... },
  status() { return { connected: true, label: 'Bridge running on :7010' }; },
  listAccountIds() { return ['default']; },
  getAccount(id) { return { accountId: id || 'default', ... }; },
  send(to, text, opts) { ... },
};
```

This works at a basic level (appears in discovery) but does NOT properly conform to the `ChannelPlugin` contract. Specifically it's missing:
- `meta` (ChannelMeta)
- `config` adapter (ChannelConfigAdapter)
- `gateway` adapter (ChannelGatewayAdapter)
- Proper `capabilities` shape (should use `chatTypes: [...]`)

The mentra channel config in `openclaw.json`:
```json
"channels": {
  "mentra": {
    "enabled": true,
    "packageName": "mentra-claw",
    "port": 7010,
    "accounts": {
      "default": { "enabled": true, "label": "Mentra Glasses" }
    }
  }
}
```

---

## 13. Steps to Add a New Built-In "asg" Channel

### Option A: Proper Built-In Extension (Recommended)

1. **Create extension directory**: `extensions/asg/`

2. **Create required files**:
   - `extensions/asg/package.json`
   - `extensions/asg/openclaw.plugin.json`
   - `extensions/asg/index.ts`
   - `extensions/asg/setup-entry.ts`
   - `extensions/asg/src/channel.ts` (full plugin)
   - `extensions/asg/src/channel.setup.ts` (setup-only plugin)
   - `extensions/asg/src/runtime.ts` (runtime store)
   - `extensions/asg/src/accounts.ts` (account resolution)
   - `extensions/asg/src/monitor.ts` (connection lifecycle -- HTTP server, WebSocket, or polling)
   - `extensions/asg/src/send.ts` (outbound delivery)

3. **Implement the ChannelPlugin** with at minimum:
   - `id: "asg"`
   - `meta: { id: "asg", label: "ASG", selectionLabel: "ASG (Smart Glasses)", detailLabel: "Smart Glasses", docsPath: "/channels/asg", blurb: "...", systemImage: "eyeglasses" }`
   - `capabilities: { chatTypes: ["direct"], media: true }`
   - `config: { listAccountIds, resolveAccount, defaultAccountId, isEnabled, isConfigured }`
   - `gateway: { startAccount, stopAccount }`
   - `outbound: { deliveryMode: "direct", sendText }`
   - `status: { buildAccountSnapshot }`

4. **Implement `gateway.startAccount`**: This is where the channel's listener lives. For ASG, this would:
   - Start an HTTP/WebSocket server on a configured port
   - Accept incoming messages from the glasses bridge
   - Build a `MsgContext` with required fields (Body, From, To, SessionKey, Provider, etc.)
   - Call `dispatchReplyWithBufferedBlockDispatcher()` to route to the agent
   - In the `deliver` callback, send the agent's reply back to the glasses

5. **Add channel config** to `openclaw.json`:
   ```json
   "channels": {
     "asg": {
       "enabled": true,
       "accounts": {
         "default": {
           "enabled": true,
           "port": 7020,
           "apiKey": "..."
         }
       }
     }
   }
   ```

6. **Build**: Run `npm run build` -- tsdown automatically picks up the new extension directory via `listBundledPluginBuildEntries()` which scans `extensions/` for `openclaw.plugin.json`.

7. **Optional: Add to CHAT_CHANNEL_ORDER** in `src/channels/registry.ts` to control sort position. Also add meta to `CHAT_CHANNEL_META` if desired. This is NOT required -- extension channels work without it.

### Option B: Quick dist-runtime Placement (Like mentra)

1. Create `dist-runtime/extensions/asg/` with:
   - `index.js` -- compiled plugin module
   - `openclaw.plugin.json` -- manifest
   - `package.json` -- basic metadata

2. This avoids the build step but means no TypeScript, no type safety, and the plugin must conform to the runtime contract directly.

---

## 14. Key Import Paths for Extensions

| Import | Source |
|--------|--------|
| `openclaw/plugin-sdk/core` | `src/plugin-sdk/core.ts` -- ChannelPlugin, OpenClawPluginApi, emptyPluginConfigSchema, buildAgentSessionKey, resolveThreadSessionKeys |
| `openclaw/plugin-sdk/compat` | `src/plugin-sdk/compat.ts` -> `src/plugin-sdk/index.ts` -- createPluginRuntimeStore, createScopedChannelConfigBase, createScopedAccountConfigAccessors, buildAccountScopedAllowlistConfigEditor |
| `../../../src/auto-reply/reply/provider-dispatcher.js` | dispatchReplyWithBufferedBlockDispatcher (the core agent dispatch) |
| `../../../src/auto-reply/templating.js` | MsgContext, FinalizedMsgContext, finalizeInboundContext |
| `../../../src/routing/resolve-route.js` | buildAgentSessionKey, resolveInboundLastRouteSessionKey |
| `../../../src/routing/session-key.js` | DEFAULT_ACCOUNT_ID, normalizeAccountId, resolveThreadSessionKeys |
| `../../../src/config/config.js` | loadConfig, OpenClawConfig |
| `../../../src/runtime.js` | RuntimeEnv, createNonExitingRuntime |
| `../../../src/channels/typing.js` | createTypingCallbacks |

---

## 15. Session Key Construction

The session key is critical for conversation routing. It's built via:

```typescript
import { buildAgentSessionKey, type RoutePeer } from "openclaw/plugin-sdk/core";

const sessionKey = buildAgentSessionKey({
  agentId: "default",  // or resolved agent ID
  peer: {
    kind: "direct",    // or "group"
    id: `asg:${deviceId}`,
  },
  accountId: "default",
});
```

This produces keys like `default/direct/asg:device-001/default` which the session store uses to maintain conversation history.

---

## 16. Summary of Key Types

| Type | Location | Purpose |
|------|----------|---------|
| `ChannelPlugin` | `src/channels/plugins/types.plugin.ts` | The main channel contract |
| `ChannelMeta` | `src/channels/plugins/types.core.ts` | UI metadata |
| `ChannelCapabilities` | `src/channels/plugins/types.core.ts` | Feature flags |
| `ChannelConfigAdapter` | `src/channels/plugins/types.adapters.ts` | Account management |
| `ChannelGatewayAdapter` | `src/channels/plugins/types.adapters.ts` | Lifecycle (start/stop) |
| `ChannelOutboundAdapter` | `src/channels/plugins/types.adapters.ts` | Sending messages |
| `ChannelStatusAdapter` | `src/channels/plugins/types.adapters.ts` | Dashboard status |
| `ChannelSetupAdapter` | `src/channels/plugins/types.adapters.ts` | Config setup |
| `ChannelSecurityAdapter` | `src/channels/plugins/types.adapters.ts` | DM policy |
| `MsgContext` | `src/auto-reply/templating.ts` | Inbound message payload |
| `ReplyPayload` | `src/auto-reply/types.ts` | Agent response payload |
| `OpenClawConfig` | `src/config/types.openclaw.ts` | Full config type |
| `ChannelsConfig` | `src/config/types.channels.ts` | Channels config section |
| `ExtensionChannelConfig` | `src/config/types.channels.ts` | Base type for extension channel config |
| `OpenClawPluginApi` | `src/plugins/types.ts` | Registration API |
| `ChannelGatewayContext` | `src/channels/plugins/types.adapters.ts` | Context passed to startAccount |

---

## 17. Critical File Paths (All Absolute on VM)

### Core Channel Infrastructure
- `/opt/openclaw/src/channels/registry.ts` -- CHAT_CHANNEL_ORDER, CHAT_CHANNEL_META, normalizeChannelId
- `/opt/openclaw/src/channels/plugins/types.plugin.ts` -- ChannelPlugin type
- `/opt/openclaw/src/channels/plugins/types.core.ts` -- ChannelMeta, ChannelCapabilities, MsgContext fields
- `/opt/openclaw/src/channels/plugins/types.adapters.ts` -- All adapter interfaces
- `/opt/openclaw/src/channels/plugins/registry.ts` -- listChannelPlugins(), getChannelPlugin()
- `/opt/openclaw/src/channels/plugins/catalog.ts` -- buildChannelUiCatalog()
- `/opt/openclaw/src/channels/plugins/status.ts` -- buildChannelAccountSnapshot()

### Plugin System
- `/opt/openclaw/src/plugins/types.ts` -- OpenClawPluginApi (line ~1187), registerChannel (line ~1209)
- `/opt/openclaw/src/plugins/registry.ts` -- registerChannel implementation (line ~461)
- `/opt/openclaw/src/plugins/loader.ts` -- Plugin loading and registration modes
- `/opt/openclaw/src/plugins/discovery.ts` -- Extension discovery
- `/opt/openclaw/src/plugins/bundled-dir.ts` -- Bundled plugins directory resolution
- `/opt/openclaw/src/plugin-sdk/core.ts` -- Plugin SDK core exports
- `/opt/openclaw/src/plugin-sdk/channel-plugin-common.ts` -- Shared channel SDK helpers

### Message Routing
- `/opt/openclaw/src/auto-reply/dispatch.ts` -- dispatchInboundMessage
- `/opt/openclaw/src/auto-reply/reply/provider-dispatcher.ts` -- dispatchReplyWithBufferedBlockDispatcher
- `/opt/openclaw/src/auto-reply/templating.ts` -- MsgContext type (line 14)
- `/opt/openclaw/src/routing/resolve-route.ts` -- buildAgentSessionKey
- `/opt/openclaw/src/routing/session-key.ts` -- DEFAULT_ACCOUNT_ID, normalizeAccountId

### Config
- `/opt/openclaw/src/config/types.openclaw.ts` -- OpenClawConfig (line 31)
- `/opt/openclaw/src/config/types.channels.ts` -- ChannelsConfig, ExtensionChannelConfig
- `/home/aepod/.openclaw/openclaw.json` -- Runtime config file

### Gateway / Dashboard
- `/opt/openclaw/src/gateway/server-channels.ts` -- Channel manager, startAccount orchestration
- `/opt/openclaw/src/gateway/server-methods/channels.ts` -- channels.status handler

### Build System
- `/opt/openclaw/tsdown.config.ts` -- Build config with listBundledPluginBuildEntries()
- `/opt/openclaw/dist-runtime/extensions/` -- Compiled extension output

### Reference Implementations
- `/opt/openclaw/extensions/telegram/` -- Most complete channel (130+ files)
- `/opt/openclaw/extensions/signal/` -- Simpler channel
- `/opt/openclaw/extensions/discord/` -- Second most complex
- `/opt/openclaw/dist-runtime/extensions/mentra/` -- Our existing simplified channel
