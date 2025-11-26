# AgentCmd Marketing Copy - Homepage

**Last Updated:** 2025-11-17
**Purpose:** Marketing-focused homepage copy emphasizing core selling points

---

## Design References

**Screenshots Available:**
- `workflow-form.png` - Workflow builder with spec selection, git workspace options
- `git-operations.png` - Git operations modal (branch, commit, push/pull)
- `mobile-friendly.png` - Mobile view of Claude session
- `shell-integration.png` - Full desktop UI showing sessions, code editing, todos
- `claude-session-chat.png` - AI agent conversation with verification results
- `project-home.png` - Projects dashboard with CLI setup checklist

**Design System:**
- Primary color: Emerald green (#10B981)
- Gradient: Orange → Pink → Purple
- Typography: Geist Sans, large bold headings (text-5xl to text-8xl)
- Effects: BorderBeam, TextShimmer, Marquee, Particles
- Container: max-w-[80rem], px-6 md:px-8, py-14

---

## Hero Section

### Headline
```
Stop Babysitting Your AI Coding Agents
```

### Subheadline
```
Build workflows that match YOUR SDLC. Your slash commands. Your processes.
Walk away while workflows run end-to-end.
```

### CTA
```tsx
<Button size="lg" asChild>
  <a href="#get-started">
    Get Started
  </a>
</Button>

<Button size="lg" variant="outline" asChild>
  <a href="/docs">
    View Docs
  </a>
</Button>
```

### Installation Command (Below CTAs)
```bash
npx agentcmd start
```

### Hero Visual
**Reference:** `shell-integration.png`
- Shows full UI with sidebar, sessions, code editor, todos
- Apply BorderBeam animation (existing component)
- Add subtle glow effect on image
- Staggered fade-in animation

**Design Pattern:**
```tsx
<div className="relative mx-auto max-w-5xl">
  <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur">
    <BorderBeam size={250} duration={12} delay={9} />
    <img
      src="/screenshots/shell-integration.png"
      alt="AgentCmd Interface"
      className="w-full rounded-2xl"
    />
  </div>
</div>
```

---

## Feature Block 1: Visual Workflow Builder

### Headline
```
Your Workflows, Your Way
```

### Body Copy
```
Every team has different processes. Define custom slash commands, build spec-driven workflows, and choose your git strategy—all in a visual builder. No rigid frameworks forcing you to adapt.
```

### Key Points (Bullet Format)
- Custom slash commands for YOUR team's processes
- Spec-driven development (generate → implement → review)
- Git workspace options (branches, worktrees, or current branch)
- Type-safe workflow definitions

### Visual
**Reference:** `workflow-form.png`
- Shows workflow configuration form
- Spec selection tabs
- Git workspace radio options
- Clean, professional dark UI

### Design Pattern
```tsx
<section className="mx-auto max-w-[80rem] px-6 md:px-8">
  <div className="py-14">
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
      <div>
        <h2 className="text-3xl font-bold lg:text-4xl bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
          Your Workflows, Your Way
        </h2>
        <p className="mt-4 text-lg text-gray-400">
          Every team has different processes...
        </p>
        {/* Bullet points or feature list */}
      </div>
      <div className="relative">
        <div className="relative rounded-2xl border border-white/10 overflow-hidden">
          <img src="/screenshots/workflow-form.png" alt="Workflow Builder" />
        </div>
      </div>
    </div>
  </div>
</section>
```

---

## Feature Block 2: Multi-Agent Orchestration

### Headline
```
Combine Claude, Codex, and Gemini
```

### Body Copy
```
Not locked to one AI provider. Chain multiple agents in a single workflow. Get Claude's architecture insights, Codex's bug detection, and GPT-4's readability review—all in parallel. Watch execution in real-time via streaming WebSocket updates.
```

### Key Points
- Multi-agent workflows (Claude + Codex + Gemini)
- Real-time streaming output
- Resumable sessions (never lose context)
- Full conversation history

### Visual
**Reference:** `claude-session-chat.png`
- Shows AI agent conversation
- Verification results with checkmarks
- Todo list integration (3/4 completed)
- Clean chat interface

### Design Pattern (Reversed/Alternating)
```tsx
<section className="mx-auto max-w-[80rem] px-6 md:px-8">
  <div className="py-14">
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
      <div className="order-2 lg:order-1 relative">
        <div className="relative rounded-2xl border border-white/10 overflow-hidden">
          <img src="/screenshots/claude-session-chat.png" alt="AI Chat Session" />
        </div>
      </div>
      <div className="order-1 lg:order-2">
        <h2 className="text-3xl font-bold lg:text-4xl bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
          Combine Claude, Codex, and Gemini
        </h2>
        <p className="mt-4 text-lg text-gray-400">
          Not locked to one AI provider...
        </p>
      </div>
    </div>
  </div>
</section>
```

---

## Feature Block 3: Built-In Git Integration

### Headline
```
Git Operations, Zero Context Switching
```

### Body Copy
```
Quick access to branch management, commits, and remote operations—right in the UI. Create feature branches, commit changes, push to remote. All the git operations you need without leaving agentcmd.
```

### Key Points
- Branch creation and switching
- Commit changes with visual diff
- Push/pull to remote
- Integrated with workflows (auto-commit, auto-PR)

### Visual
**Reference:** `git-operations.png`
- Git operations modal
- Branch selector showing "feat/homepage-content"
- Commit section
- Push/Pull buttons

### Design Pattern
```tsx
<section className="mx-auto max-w-[80rem] px-6 md:px-8">
  <div className="py-14">
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
      <div>
        <h2 className="text-3xl font-bold lg:text-4xl bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
          Git Operations, Zero Context Switching
        </h2>
        <p className="mt-4 text-lg text-gray-400">
          Quick access to branch management...
        </p>
      </div>
      <div className="relative">
        <div className="relative rounded-2xl border border-white/10 overflow-hidden bg-black/60">
          <img src="/screenshots/git-operations.png" alt="Git Operations" />
        </div>
      </div>
    </div>
  </div>
</section>
```

---

## Feature Block 4: Mobile-Friendly

### Headline
```
Code From Anywhere
```

### Body Copy
```
Access via phone or tablet through Tailscale. Check workflow status remotely, trigger workflows on the go, monitor long-running tasks. Responsive UI works beautifully on any screen size.
```

### Key Points
- Responsive web interface
- Access via Tailscale from anywhere
- Check status, trigger workflows remotely
- Full chat interface on mobile

### Visual
**Reference:** `mobile-friendly.png`
- Mobile view of Claude session
- Shows workflow verification
- Full accessibility on narrow screen
- Professional mobile UI

### Design Pattern (Centered with Mobile Mockup)
```tsx
<section className="mx-auto max-w-[80rem] px-6 md:px-8">
  <div className="py-14">
    <div className="text-center mb-12">
      <h2 className="text-3xl font-bold lg:text-4xl bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
        Code From Anywhere
      </h2>
      <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
        Access via phone or tablet...
      </p>
    </div>
    <div className="flex justify-center">
      <div className="relative max-w-sm">
        <div className="relative rounded-3xl border-4 border-white/20 overflow-hidden shadow-2xl">
          <img src="/screenshots/mobile-friendly.png" alt="Mobile Interface" className="w-full" />
        </div>
      </div>
    </div>
  </div>
</section>
```

---

## Bonus Feature: Guided Setup

### Headline
```
Get Started in Minutes
```

### Body Copy
```
Guided setup checks your environment and helps install required CLIs. Visual checklist shows what's configured and what needs attention. From zero to running workflows in under 5 minutes.
```

### Visual
**Reference:** `project-home.png`
- Recommended Setup section (3/4 complete)
- GitHub CLI ✓, Claude CLI ✓, Codex CLI ✓, Anthropic API Key ⚠
- Clean, professional dashboard

### Design Pattern (Optional - Can be a callout/card)
```tsx
<div className="mx-auto max-w-3xl rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8">
  <h3 className="text-xl font-semibold text-emerald-400">Guided Setup</h3>
  <p className="mt-2 text-gray-300">
    Visual checklist shows what's configured and what needs attention...
  </p>
  <img src="/screenshots/project-home.png" alt="Setup Checklist" className="mt-6 rounded-lg border border-white/10" />
</div>
```

---

## Use Case Example Section

### Headline
```
Automate Your Entire SDLC
```

### Body Copy
```
Chain workflows together. Generate specs, implement features with AI, create PRs, run reviews—all unattended.
```

### Code Example
```typescript
// Example workflow: Feature → PR → Review
const workflow = defineWorkflow({
  name: "Full Feature Development",
  steps: [
    // Generate spec from planning session
    step.slash("/cmd:generate-feature-spec", {
      args: { feature: "user authentication" }
    }),

    // Implement with Claude
    step.agent("claude", {
      prompt: "Implement the spec",
      permissionMode: "acceptEdits"
    }),

    // Create PR with git integration
    step.git("create-pr", {
      title: "feat: Add user authentication",
      branch: "auto-generated"
    }),

    // Review with Codex
    step.agent("codex", {
      prompt: "Review PR for bugs and edge cases"
    })
  ]
});
```

### Visual Treatment
- Syntax highlighted code block
- Emerald accent for step names
- Comments explaining each step
- Clean, readable formatting

---

## Why AgentCmd Section (From Docs)

### Headline
```
Built for Your Workflow
```

### Grid of Benefits (2 columns on desktop)

**Custom Slash Commands**
- Icon: Terminal or Code
- Define YOUR team's commands in `.claude/commands/`

**Spec-Driven Development**
- Icon: FileText or Document
- Generate specs, implement with AI

**Type-Safe Workflows**
- Icon: Check or Shield
- Full TypeScript support with inference

**Multi-Agent**
- Icon: Users or Zap
- Combine Claude + Codex + Gemini

**Real-Time Monitoring**
- Icon: Activity or Eye
- WebSocket streaming updates

**Resumable Sessions**
- Icon: Play or RotateCcw
- Continue conversations, never lose context

**Artifact Management**
- Icon: Upload or Paperclip
- Upload files and screenshots for review

**Mobile Friendly**
- Icon: Smartphone or Tablet
- Responsive UI, access anywhere

### Design Pattern
```tsx
<section className="mx-auto max-w-[80rem] px-6 md:px-8">
  <div className="py-14">
    <h2 className="text-center text-3xl font-bold lg:text-4xl">
      Built for Your Workflow
    </h2>
    <div className="mt-12 grid gap-8 md:grid-cols-2 lg:gap-12">
      {benefits.map((benefit) => (
        <div key={benefit.title} className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <benefit.icon className="h-6 w-6 text-emerald-500" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">{benefit.title}</h3>
            <p className="mt-1 text-sm text-gray-400">{benefit.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

---

## CTA Section (Final)

### Headline
```
Ready to Stop Babysitting?
```

### Body Copy
```
Start building workflows in under 5 minutes. No installation required.
```

### CTA Buttons
```tsx
<div className="flex flex-col sm:flex-row gap-4 justify-center">
  <Button size="lg" asChild>
    <a href="#get-started">Get Started</a>
  </Button>
  <Button size="lg" variant="outline" asChild>
    <a href="/docs">Read Documentation</a>
  </Button>
</div>
```

### Installation Command (Prominent)
```bash
npx agentcmd start
```

### Design Pattern
```tsx
<section className="mx-auto max-w-[80rem] px-6 md:px-8">
  <div className="py-20">
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/20 via-purple-500/10 to-pink-500/10 p-12 text-center">
      <div className="relative z-10">
        <h2 className="text-4xl font-bold lg:text-5xl">
          Ready to Stop Babysitting?
        </h2>
        <p className="mt-4 text-xl text-gray-300">
          Start building workflows in under 5 minutes. No installation required.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          {/* Buttons */}
        </div>

        <div className="mt-8">
          <code className="inline-block rounded-lg bg-black/60 px-6 py-3 text-lg font-mono text-emerald-400 border border-emerald-500/20">
            npx agentcmd start
          </code>
        </div>
      </div>

      {/* Background effects */}
      <Particles className="absolute inset-0" quantity={100} />
    </div>
  </div>
</section>
```

---

## Layout Variations

### Layout A: Traditional Grid
**Order:**
1. Hero Section (full width)
2. Feature Block 1 (grid 2-col: text left, image right)
3. Feature Block 2 (grid 2-col: image left, text right)
4. Feature Block 3 (grid 2-col: text left, image right)
5. Feature Block 4 (centered mobile mockup)
6. Use Case Example (full width code block)
7. Why AgentCmd (grid benefits)
8. CTA Section (full width)

**Best for:** Traditional SaaS landing page feel

---

### Layout B: Alternating Focus
**Order:**
1. Hero Section (full width)
2. Feature Block 1 (grid: text left, image right)
3. Use Case Example (inline, narrow width)
4. Feature Block 2 (grid: image left, text right)
5. Feature Block 3 (grid: text left, image right)
6. Feature Block 4 (centered mobile)
7. Why AgentCmd (compact, 3-col grid)
8. CTA Section (full width)

**Best for:** Breaking up visual rhythm, keeping attention

---

### Layout C: Story-Driven
**Order:**
1. Hero Section (full width)
2. Pain Point Callout (centered, narrow)
   - "Tired of running slash commands one by one?"
   - "Can't walk away during multi-step workflows?"
3. Feature Block 1 + 2 (stacked, quick read)
4. Use Case Example (shows the power)
5. Feature Block 3 + 4 (stacked, secondary benefits)
6. Why AgentCmd (benefits grid)
7. Guided Setup (trust builder)
8. CTA Section (full width)

**Best for:** Narrative flow, emotional connection

---

## Animation Suggestions

### Hero Section
- Headline: TextShimmer effect (from MagicUI)
- Subheadline: Fade in with 400ms delay
- Buttons: Fade in with 600ms delay
- Screenshot: Fade up with 800ms delay + BorderBeam animation

### Feature Blocks
- Text content: Fade in on scroll (intersection observer)
- Images: Fade up on scroll with slight transform
- Stagger animations within each block (200ms between elements)

### Use Case Code Block
- Line-by-line reveal animation (optional, might be too much)
- Simple fade-in on scroll is cleaner

### CTA Section
- Background gradient animation (subtle pulse)
- Particles effect (existing component)
- Buttons: Scale on hover

---

## Component Checklist

**Existing Components to Reuse:**
- `components/ui/button.tsx` - CTA buttons
- `components/magicui/border-beam.tsx` - Screenshot borders
- `components/magicui/text-shimmer.tsx` - Headline effect
- `components/magicui/particles.tsx` - Background effects
- `components/magicui/marquee.tsx` - Optional for logos/testimonials
- `components/site-header.tsx` - Keep existing header
- `components/site-footer.tsx` - Keep existing footer

**New Components to Create:**
- `components/landing/features-section.tsx` - Feature block grid component
- `components/landing/use-case-section.tsx` - Code example section
- `components/landing/benefits-grid.tsx` - Why AgentCmd grid
- `components/landing/setup-section.tsx` - Optional guided setup showcase

---

## Copy Principles Applied

✅ **Lead with frustration:** "Stop Babysitting" immediately resonates
✅ **Emphasize customization:** "Your Workflows, Your Way" throughout
✅ **Show don't tell:** Screenshots demonstrate features
✅ **Less is more:** 4 core features, not overwhelming
✅ **Developer tone:** No corporate buzzwords, honest and direct
✅ **Clear CTAs:** Single action (npx agentcmd start)
✅ **Mobile-first benefit:** Unique selling point highlighted

---

## Next Steps

1. **Choose Layout:** Pick Layout A, B, or C (or hybrid)
2. **Build Components:** Create new landing section components
3. **Add Screenshots:** Copy images to `public/screenshots/`
4. **Test Animations:** Ensure smooth performance
5. **Mobile Testing:** Verify responsive behavior
6. **A/B Testing:** Compare with original homepage

---

## Notes

- Keep technical details in docs, not homepage
- Focus on benefits over features
- Use real screenshots (builds trust)
- Single clear CTA (reduce decision fatigue)
- Emphasize "your way" messaging (differentiation)
