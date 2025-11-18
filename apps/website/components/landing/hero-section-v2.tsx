/* eslint-disable @next/next/no-img-element */
"use client";

import { BorderBeam } from "@/components/magicui/border-beam";
import TextShimmer from "@/components/magicui/text-shimmer";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";

export default function HeroSectionV2() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="hero"
      className="relative mx-auto mt-32 max-w-[80rem] px-6 text-center md:px-8"
    >
      <Link
        href="/docs"
        className="backdrop-filter-[12px] inline-flex h-7 items-center justify-between rounded-full border border-border bg-white/10 px-3 text-xs text-white dark:text-black transition-all ease-in hover:cursor-pointer hover:bg-white/20 group gap-1 translate-y-[-1rem] animate-fade-in opacity-0"
      >
        <TextShimmer className="inline-flex items-center justify-center">
          <span>✨ AI Code Workflow Orchestration Platform</span>{" "}
          <ArrowRightIcon className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
        </TextShimmer>
      </Link>

      <h1 className="bg-gradient-to-br dark:from-white from-black from-30% dark:to-white/40 to-black/40 bg-clip-text py-6 text-5xl font-medium leading-none tracking-tighter text-transparent text-balance sm:text-6xl md:text-7xl lg:text-8xl translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
        Stop Babysitting Your
        <br className="hidden md:block" /> AI Coding Agents
      </h1>

      <p className="mb-12 text-lg tracking-tight text-gray-400 md:text-xl text-balance translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms] max-w-3xl mx-auto">
        Build workflows that match YOUR SDLC. Your slash commands. Your
        processes.
        <br className="hidden md:block" /> Walk away while workflows run
        end-to-end.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms]">
        <Button
          size="lg"
          className="gap-1 rounded-lg text-white dark:text-black group"
          asChild
        >
          <Link href="/docs/getting-started/installation">
            <span>Get Started</span>
            <ArrowRightIcon className="ml-1 size-4 transition-transform duration-300 ease-in-out group-hover:translate-x-1" />
          </Link>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="gap-1 rounded-lg"
          asChild
        >
          <Link href="/docs">
            <span>View Documentation</span>
          </Link>
        </Button>
      </div>

      <div className="mb-12 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:800ms]">
        <code className="inline-block rounded-lg bg-black/60 dark:bg-white/5 px-6 py-3 text-sm md:text-base font-mono text-emerald-400 border border-emerald-500/20">
          npx agentcmd install
        </code>
      </div>

      <div
        ref={ref}
        className="relative mt-[8rem] animate-fade-up opacity-0 [--animation-delay:400ms] [perspective:2000px] after:absolute after:inset-0 after:z-50 after:[background:linear-gradient(to_top,var(--background)_30%,transparent)]"
      >
        <div
          className={`rounded-xl border border-border bg-white bg-opacity-[0.01] before:absolute before:bottom-1/2 before:left-0 before:top-0 before:h-full before:w-full before:opacity-0 before:[filter:blur(180px)] before:[background-image:linear-gradient(to_bottom,var(--color-one),var(--color-one),transparent_40%)] ${
            inView ? "before:animate-image-glow" : ""
          }`}
        >
          <BorderBeam
            size={250}
            duration={12}
            delay={9}
            colorFrom="var(--color-one)"
            colorTo="var(--color-two)"
          />

          <img
            src="/screenshots/workflows-dashboard.png"
            alt="AgentCmd Workflows Dashboard - Manage workflow runs across different states"
            className="relative w-full h-full rounded-[inherit] border object-contain"
          />
        </div>
      </div>
    </section>
  );
}
