"use client";

import { Section } from "@/components/section";

const platforms = [
  {
    name: "Claude Code",
    logo: "🤖", // Placeholder - replace with actual logo
  },
  {
    name: "OpenAI Codex",
    logo: "🔮", // Placeholder - replace with actual logo
  },
];

export function Logos() {
  return (
    <Section id="logos">
      <div className="border-x border-t py-12 px-6">
        <div className="text-center mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Works with leading AI coding assistants
          </h2>
        </div>
        <div className="flex items-center justify-center gap-12 sm:gap-16">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="text-5xl opacity-60 group-hover:opacity-100 transition-opacity">
                {platform.logo}
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {platform.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
