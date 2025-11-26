import {
  CodeIcon,
  FileTextIcon,
  CheckCircledIcon,
  MixIcon,
  ActivityLogIcon,
  ReloadIcon,
  UploadIcon,
  MobileIcon,
} from "@radix-ui/react-icons";

const benefits = [
  {
    title: "Custom Slash Commands",
    description: "Define YOUR team's commands in `.claude/commands/`",
    icon: CodeIcon,
  },
  {
    title: "Spec-Driven Development",
    description: "Generate specs, implement with AI",
    icon: FileTextIcon,
  },
  {
    title: "Type-Safe Workflows",
    description: "Full TypeScript support with inference",
    icon: CheckCircledIcon,
  },
  {
    title: "Multi-Agent",
    description: "Combine Claude + Codex + Gemini",
    icon: MixIcon,
  },
  {
    title: "Real-Time Monitoring",
    description: "WebSocket streaming updates",
    icon: ActivityLogIcon,
  },
  {
    title: "Resumable Sessions",
    description: "Continue conversations, never lose context",
    icon: ReloadIcon,
  },
  {
    title: "Artifact Management",
    description: "Upload files and screenshots for review",
    icon: UploadIcon,
  },
  {
    title: "Mobile Friendly",
    description: "Responsive UI, access anywhere",
    icon: MobileIcon,
  },
];

export default function BenefitsGrid() {
  return (
    <section className="mx-auto max-w-5xl px-6 md:px-8">
      <div className="py-14">
        <h2 className="text-center text-3xl font-bold lg:text-4xl bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
          Built for Your Workflow
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:gap-12">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <benefit.icon className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {benefit.title}
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
