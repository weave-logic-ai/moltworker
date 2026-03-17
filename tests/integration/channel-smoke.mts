#!/usr/bin/env node
/**
 * Smoke test: Mentra channel plugin against live OpenClaw.
 * Run: node --import tsx tests/integration/channel-smoke.mts
 */

import { createMentraChannel } from '../../src/channels/mentra/index.js';
import { configFromEnv, validateConfig } from '../../src/channels/mentra/config.js';

const env = process.env as Record<string, string>;

console.log('=== Mentra Channel Integration Test ===\n');

// Test 1: Config from env
const envConfig = configFromEnv(env);
console.log('1. Config from env:', JSON.stringify(envConfig, null, 2));

// Test 2: Validation
const validation = validateConfig(envConfig);
console.log('2. Validation:', validation.valid ? 'PASS' : `FAIL: ${validation.errors.join(', ')}`);

// Test 3: Create channel
const ch = createMentraChannel(env);
console.log('3. Channel created');
console.log('   Package:', ch.resolvedConfig.packageName);
console.log('   Port:', ch.resolvedConfig.port);
console.log('   Sessions:', ch.sessionCount);

// Test 4: Init
await ch.init();
console.log('4. Channel initialized');

// Test 5: Direct OpenClaw API call
const url = env.OPENCLAW_URL || 'http://localhost:18789';
const token = env.OPENCLAW_GATEWAY_TOKEN || '';
console.log(`5. Testing OpenClaw at ${url}/v1/chat/completions`);

try {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Say hello in one word' }], max_tokens: 10 }),
    signal: controller.signal,
  });
  clearTimeout(timer);
  const data = await res.json() as { choices?: Array<{ message: { content: string } }> };
  console.log('   HTTP:', res.status);
  console.log('   AI says:', data.choices?.[0]?.message?.content || '(empty)');
  console.log('   PASS');
} catch (err) {
  console.log('   FAIL:', (err as Error).message);
}

// Test 6: Stop
await ch.stop();
console.log('6. Channel stopped');

console.log('\n=== All tests complete ===');
