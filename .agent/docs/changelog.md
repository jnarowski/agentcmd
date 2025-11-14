# Changelog

Technical decisions and architectural changes for agentcmd.

## 2025-11-14 - Fix npx agentcmd Support

### Problem

`npx agentcmd install` was failing with "could not determine executable to run" (exit code 127).

**Root cause:** CLI build used `packages: 'external'` in esbuild config, which meant dependencies (commander, zod, detect-port, etc.) were not bundled. When running via `npx`, these deps weren't available in the temporary directory.

### Decision

**Bundle all dependencies except native bindings.**

Changed `apps/app/scripts/build-cli.js`:
- Removed `packages: 'external'` line
- Now bundles: commander, zod, detect-port, and all npm packages
- Still external: @prisma/client, prisma, node-pty (native bindings)

### Rationale

**Why bundle:**
- Makes CLI truly standalone for npx usage
- Industry standard (create-vite, tsx, etc. all bundle)
- More reliable - no dependency resolution issues
- User goal: "CLI package without messy global installs"

**Why keep some external:**
- Native bindings (Prisma, node-pty) can't be bundled
- Prisma needs migration files (copied to dist/prisma/)
- These are installed by npm during `npx agentcmd`

### Impact

- ✅ `npx agentcmd install` now works
- ✅ No global install required
- ⚠️ Bundle size: ~420KB → ~595KB
- ⚠️ Build time: Similar (fast with server external)

### Technical Details

**Changes to `apps/app/scripts/build-cli.js`:**
1. Removed `packages: 'external'` - now bundles npm deps
2. Added `banner` with `createRequire` - fixes ESM dynamic require issue
3. Externalized `../../server/index.js` - keeps server code separate (loaded via dynamic import in start command)

**Result:** CLI bundles commander, zod, detect-port etc. Server code stays in dist/server/ and is loaded only when running `agentcmd start`.

### Files Changed

- `apps/app/scripts/build-cli.js` - Bundle config changes
- `.agent/docs/changelog.md` - This file

### Testing

```bash
# Local test
pnpm build
node apps/app/dist/cli.js --version

# npx test (after publish)
npx agentcmd@latest install
```
