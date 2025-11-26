import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";

export default function CtaSectionV2() {
  return (
    <section className="mx-auto max-w-[80rem] px-6 md:px-8">
      <div className="py-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold lg:text-5xl bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
            Ready to Stop Babysitting?
          </h2>
          <p className="mt-4 text-xl text-gray-300 max-w-2xl mx-auto">
            Start building workflows in under 5 minutes. No installation
            required.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
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
                <span>Read Documentation</span>
              </Link>
            </Button>
          </div>

          <div className="mt-8">
            <code className="inline-block rounded-lg bg-black/60 dark:bg-black/80 px-6 py-3 text-lg font-mono text-emerald-400 border border-emerald-500/20 shadow-lg">
              npx agentcmd install
            </code>
          </div>
        </div>
      </div>
    </section>
  );
}
