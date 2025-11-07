#!/usr/bin/env node

/**
 * Wrapper file for workflow-sdk CLI
 *
 * This file exists to ensure the bin symlink can be created during pnpm install,
 * even when dist/cli.js hasn't been built yet.
 *
 * See: https://webpro.nl/scraps/compiled-bin-in-typescript-monorepo
 */

import '../dist/cli.js';
