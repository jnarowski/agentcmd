#!/usr/bin/env node
import { readFileSync } from 'fs';

const sessionPath = process.argv[2] || `${process.env.HOME}/.claude/projects/-Users-devbot-Dev-sourceborn-agentcmd/a8e9cb02-2131-4877-b394-108fd9676bfd.jsonl`;

const lines = readFileSync(sessionPath, 'utf-8').trim().split('\n');

let totalInput = 0;
let totalOutput = 0;
let totalCacheCreate = 0;
let totalCacheRead = 0;
let messageCount = 0;
let lastMessageUsage = null;

for (const line of lines) {
  try {
    const event = JSON.parse(line);
    if (event.type === 'assistant' && event.message?.usage) {
      const usage = event.message.usage;
      totalInput += usage.input_tokens || 0;
      totalOutput += usage.output_tokens || 0;
      totalCacheCreate += usage.cache_creation_input_tokens || 0;
      totalCacheRead += usage.cache_read_input_tokens || 0;
      messageCount++;
      lastMessageUsage = usage;
    }
  } catch (e) {
    // Skip invalid lines
  }
}

// Test different calculation methods
const method1_baseOnly = totalInput + totalOutput;
const method2_withCacheCreate = totalInput + totalOutput + totalCacheCreate;
const method3_allTokens = totalInput + totalOutput + totalCacheCreate + totalCacheRead;

// Last message only (what CLI might show for current context)
let method4_lastMessage = 0;
if (lastMessageUsage) {
  method4_lastMessage =
    (lastMessageUsage.input_tokens || 0) +
    (lastMessageUsage.output_tokens || 0) +
    (lastMessageUsage.cache_creation_input_tokens || 0) +
    (lastMessageUsage.cache_read_input_tokens || 0);
}

const target = 112000;
const tolerance = 10000;

console.log('\n=== Session Token Analysis ===');
console.log(`Assistant messages analyzed: ${messageCount}`);
console.log('\n--- Total Token Breakdown (All Messages) ---');
console.log(`Input tokens:      ${totalInput.toLocaleString()}`);
console.log(`Output tokens:     ${totalOutput.toLocaleString()}`);
console.log(`Cache creation:    ${totalCacheCreate.toLocaleString()}`);
console.log(`Cache read:        ${totalCacheRead.toLocaleString()}`);

if (lastMessageUsage) {
  console.log('\n--- Last Message Token Breakdown ---');
  console.log(`Input tokens:      ${(lastMessageUsage.input_tokens || 0).toLocaleString()}`);
  console.log(`Output tokens:     ${(lastMessageUsage.output_tokens || 0).toLocaleString()}`);
  console.log(`Cache creation:    ${(lastMessageUsage.cache_creation_input_tokens || 0).toLocaleString()}`);
  console.log(`Cache read:        ${(lastMessageUsage.cache_read_input_tokens || 0).toLocaleString()}`);
}

console.log('\n--- Calculation Methods ---');
console.log(`\n[1] Cumulative base (input + output):`);
console.log(`    ${method1_baseOnly.toLocaleString()} tokens`);
console.log(`    Diff from 112k: ${Math.abs(method1_baseOnly - target).toLocaleString()}`);
console.log(`\n[2] Cumulative with cache_create (input + output + cache_create):`);
console.log(`    ${method2_withCacheCreate.toLocaleString()} tokens`);
console.log(`    Diff from 112k: ${Math.abs(method2_withCacheCreate - target).toLocaleString()}`);
console.log(`\n[3] Cumulative all tokens (input + output + cache_create + cache_read):`);
console.log(`    ${method3_allTokens.toLocaleString()} tokens`);
console.log(`    Diff from 112k: ${Math.abs(method3_allTokens - target).toLocaleString()}`);
console.log(`\n[4] Last message only (all token types):`);
console.log(`    ${method4_lastMessage.toLocaleString()} tokens`);
console.log(`    Diff from 112k: ${Math.abs(method4_lastMessage - target).toLocaleString()}`);

// Determine which is closest
const diffs = [
  { method: 1, name: 'Cumulative base', value: method1_baseOnly, diff: Math.abs(method1_baseOnly - target) },
  { method: 2, name: 'Cumulative with cache_create', value: method2_withCacheCreate, diff: Math.abs(method2_withCacheCreate - target) },
  { method: 3, name: 'Cumulative all tokens', value: method3_allTokens, diff: Math.abs(method3_allTokens - target) },
  { method: 4, name: 'Last message only', value: method4_lastMessage, diff: Math.abs(method4_lastMessage - target) }
];
diffs.sort((a, b) => a.diff - b.diff);
const closest = diffs[0];

console.log(`\n--- Result ---`);
console.log(`Target: ${target.toLocaleString()} ± ${tolerance.toLocaleString()}`);
console.log(`Closest match: Method ${closest.method} - ${closest.name}`);
console.log(`Value: ${closest.value.toLocaleString()} tokens`);
console.log(`Difference: ${closest.diff.toLocaleString()} tokens`);
console.log(`Within tolerance: ${closest.diff <= tolerance ? '✓ YES' : '✗ NO'}`);

if (closest.diff <= tolerance) {
  console.log(`\n✓ SOLUTION FOUND!`);
  if (closest.method === 2) {
    console.log(`Fix: Add cacheCreationTokens to selector (but NOT cacheReadTokens)`);
  } else if (closest.method === 3) {
    console.log(`Fix: Add both cacheCreationTokens AND cacheReadTokens to selector`);
  } else if (closest.method === 4) {
    console.log(`CLI likely shows last message context only, not cumulative`);
    console.log(`App behavior might be intentionally different (cumulative vs current)`);
  }
} else {
  console.log(`\n⚠ No method within tolerance - need more investigation`);
}
console.log();
