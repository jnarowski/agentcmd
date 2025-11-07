#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const envPath = join(rootDir, '.env');
const envExamplePath = join(rootDir, '.env.example');

/**
 * Generate a secure random secret for JWT signing
 * @returns {string} Base64-encoded random string (32 bytes)
 */
function generateSecret() {
  return randomBytes(32).toString('base64');
}

/**
 * Process environment template by replacing placeholders with secure values
 * @param {string} template - The .env.example content
 * @returns {string} Processed content with real values
 */
function processEnvTemplate(template) {
  let processed = template;

  // Replace JWT_SECRET placeholder with generated secure secret
  processed = processed.replace(
    /^JWT_SECRET=.*$/m,
    `JWT_SECRET=${generateSecret()}`
  );

  // Replace ANTHROPIC_API_KEY placeholder with a comment reminder
  processed = processed.replace(
    /^ANTHROPIC_API_KEY=.*$/m,
    'ANTHROPIC_API_KEY=  # Add your API key from https://console.anthropic.com/'
  );

  return processed;
}

// Check if .env.example exists first
if (!existsSync(envExamplePath)) {
  console.error('❌ Error: .env.example file not found');
  console.error('   Expected location:', envExamplePath);
  process.exit(1);
}

// Check if .env already exists
if (existsSync(envPath)) {
  console.log('✅ .env file already exists');
  process.exit(0);
}

// Create .env from template
console.log('📋 Creating .env from .env.example...');

try {
  const template = readFileSync(envExamplePath, 'utf-8');
  const envContent = processEnvTemplate(template);

  writeFileSync(envPath, envContent);

  console.log('✅ .env file created successfully!');
  console.log('   - JWT_SECRET: Generated securely');
  console.log('   - ANTHROPIC_API_KEY: Remember to add your API key');
  console.log('');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  process.exit(1);
}
