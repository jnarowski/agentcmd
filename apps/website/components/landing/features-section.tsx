/* eslint-disable @next/next/no-img-element */
"use client";

import { Iphone } from "@/components/ui/iphone";

export default function FeaturesSection() {
  return (
    <>
      {/* Feature 1: Visual Workflow Builder */}
      <section className="mx-auto max-w-[80rem] px-6 md:px-8">
        <div className="py-20">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold lg:text-4xl bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
                Your Workflows, Your Way
              </h2>
              <p className="mt-4 text-lg text-gray-400">
                Every team has different processes. Define custom slash
                commands, build spec-driven workflows, and choose your git
                strategy—all in a visual builder. No rigid frameworks forcing
                you to adapt.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className="h-5 w-5 text-emerald-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-300">
                    Custom slash commands for YOUR team's processes
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className="h-5 w-5 text-emerald-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-300">
                    Spec-driven development (generate → implement → review)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className="h-5 w-5 text-emerald-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-300">
                    Git workspace options (branches, worktrees, or current
                    branch)
                  </span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="relative rounded-2xl border border-white/10 overflow-hidden">
                <img
                  src="/screenshots/workflow-form.png"
                  alt="Workflow Builder Interface"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Multi-Agent Orchestration */}
      <section className="mx-auto max-w-[80rem] px-6 md:px-8">
        <div className="py-20">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="relative rounded-2xl border border-white/10 overflow-hidden">
                <img
                  src="/screenshots/claude-session-chat.png"
                  alt="AI Chat Session with Real-time Updates"
                  className="w-full"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold lg:text-4xl bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
                Combine Claude, Codex, and Gemini
              </h2>
              <p className="mt-4 text-lg text-gray-400">
                Not locked to one AI provider. Chain multiple agents in a single
                workflow. Get Claude's architecture insights, Codex's bug
                detection, and GPT-4's readability review—all in parallel. Watch
                execution in real-time via streaming WebSocket updates.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className="h-5 w-5 text-emerald-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-300">
                    Multi-agent workflows (Claude + Codex + Gemini)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className="h-5 w-5 text-emerald-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-300">
                    Real-time streaming output
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className="h-5 w-5 text-emerald-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-300">
                    Resumable sessions (never lose context)
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Git Integration */}
      <section className="mx-auto max-w-[80rem] px-6 md:px-8">
        <div className="py-20">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold lg:text-4xl bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
                Git Operations, Zero Context Switching
              </h2>
              <p className="mt-4 text-lg text-gray-400">
                Quick access to branch management, commits, and remote
                operations—right in the UI. Create feature branches, commit
                changes, push to remote. All the git operations you need without
                leaving agentcmd.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className="h-5 w-5 text-emerald-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-300">
                    Branch creation and switching
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className="h-5 w-5 text-emerald-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-300">
                    Commit changes with visual diff
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className="h-5 w-5 text-emerald-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-300">
                    Integrated with workflows (auto-commit, auto-PR)
                  </span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="relative rounded-2xl border border-white/10 overflow-hidden bg-black/60">
                <img
                  src="/screenshots/git-operations.png"
                  alt="Git Operations Interface"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4: Mobile-Friendly */}
      <section className="mx-auto max-w-[80rem] px-6 md:px-8">
        <div className="py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold lg:text-4xl bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
              Code From Anywhere
            </h2>
            <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
              Access via phone or tablet through Tailscale. Check workflow
              status remotely, trigger workflows on the go, monitor long-running
              tasks. Responsive UI works beautifully on any screen size.
            </p>
          </div>
          <div className="flex justify-center">
            <div className="relative max-w-sm">
              <Iphone
                src="/screenshots/mobile-sessions.png"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
