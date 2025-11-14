# Website Development Guide

Marketing website for agentcmd - built with Next.js.

## Tech Stack

- **Next.js 16** - App Router
- **React 19** - UI library
- **Tailwind CSS v4** - Styling
- **TypeScript 5** - Type safety

## Purpose

Marketing and landing page for the AgentCmd project. Separate from main application.

## Structure

```
apps/website/
├── app/              # Next.js App Router pages
│   ├── page.tsx      # Homepage
│   ├── layout.tsx    # Root layout
│   └── globals.css   # Global styles
├── public/           # Static assets
├── next.config.ts    # Next.js configuration
├── tailwind.config.ts # Tailwind configuration
└── tsconfig.json     # TypeScript configuration
```

## Development

```bash
# From website directory
pnpm dev

# Or from root
pnpm --filter website dev
```

**Dev Server:** http://localhost:3000 (default Next.js port)

## Conventions

### Next.js App Router

Use App Router patterns:
- `app/` directory for pages
- `page.tsx` for route components
- `layout.tsx` for shared layouts
- Server Components by default
- Client Components when needed (`"use client"`)

### Styling

Shared Tailwind config with main app:
- Use Tailwind utility classes
- Follow main app design system
- Consistent with agentcmd UI

### Content Structure

- Landing page: `/app/page.tsx`
- Features: `/app/features/page.tsx`
- Pricing: `/app/pricing/page.tsx`
- Docs: Link to main app docs

## Integration with Main App

**Independent Deployment:**
- Separate from main app
- Can deploy to different domain
- Shared design system (Tailwind config)

**Links to Main App:**
- CTA buttons link to main app
- Download links for CLI
- Documentation links

## Deployment

```bash
# Build
pnpm build

# Output: .next/ directory

# Start production server
pnpm start
```

**Deployment Options:**
- Vercel (recommended for Next.js)
- Netlify
- Self-hosted with Node.js

## Environment Variables

```bash
# .env.local (if needed)
NEXT_PUBLIC_APP_URL=http://localhost:3456
NEXT_PUBLIC_DOWNLOAD_URL=https://...
```

**Note:** Prefix with `NEXT_PUBLIC_` for client-side access.

## Quick Commands

```bash
# Development
pnpm dev

# Build
pnpm build

# Start production
pnpm start

# Lint
pnpm lint
```

## Related Docs

- Root `CLAUDE.md` - Critical rules (imports, React patterns)
- `.agent/docs/frontend-patterns.md` - React patterns (if applicable)
- Next.js docs: https://nextjs.org/docs
