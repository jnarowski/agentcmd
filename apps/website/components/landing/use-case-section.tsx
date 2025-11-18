export default function UseCaseSection() {
  return (
    <section className="mx-auto max-w-[80rem] px-6 md:px-8">
      <div className="py-14">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold lg:text-4xl bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
            Automate Your Entire SDLC
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Chain workflows together. Generate specs, implement features with AI, create PRs, run reviews—all unattended.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-emerald-500/20 bg-black/40 backdrop-blur overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-emerald-500/10 to-transparent" />

            <pre className="p-6 overflow-x-auto text-sm md:text-base">
              <code className="language-typescript">
                <span className="text-gray-500">// Example workflow: Feature → PR → Review</span>
                {'\n'}
                <span className="text-purple-400">const</span> <span className="text-blue-300">workflow</span> <span className="text-white">=</span> <span className="text-yellow-300">defineWorkflow</span>
                <span className="text-white">{'({'}</span>
                {'\n  '}
                <span className="text-blue-300">name</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;Full Feature Development&quot;</span>
                <span className="text-white">,</span>
                {'\n  '}
                <span className="text-blue-300">steps</span>
                <span className="text-white">: [</span>
                {'\n    '}
                <span className="text-gray-500">// Generate spec from planning session</span>
                {'\n    '}
                <span className="text-blue-300">step</span>
                <span className="text-white">.</span>
                <span className="text-emerald-400">slash</span>
                <span className="text-white">(</span>
                <span className="text-green-300">&quot;/cmd:generate-feature-spec&quot;</span>
                <span className="text-white">, {'{'}</span>
                {'\n      '}
                <span className="text-blue-300">args</span>
                <span className="text-white">: {'{ '}</span>
                <span className="text-blue-300">feature</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;user authentication&quot;</span>
                <span className="text-white">{' }'}</span>
                {'\n    '}
                <span className="text-white">{'}),'}</span>
                {'\n\n    '}
                <span className="text-gray-500">// Implement with Claude</span>
                {'\n    '}
                <span className="text-blue-300">step</span>
                <span className="text-white">.</span>
                <span className="text-emerald-400">agent</span>
                <span className="text-white">(</span>
                <span className="text-green-300">&quot;claude&quot;</span>
                <span className="text-white">, {'{'}</span>
                {'\n      '}
                <span className="text-blue-300">prompt</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;Implement the spec&quot;</span>
                <span className="text-white">,</span>
                {'\n      '}
                <span className="text-blue-300">permissionMode</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;acceptEdits&quot;</span>
                {'\n    '}
                <span className="text-white">{'}),'}</span>
                {'\n\n    '}
                <span className="text-gray-500">// Create PR with git integration</span>
                {'\n    '}
                <span className="text-blue-300">step</span>
                <span className="text-white">.</span>
                <span className="text-emerald-400">git</span>
                <span className="text-white">(</span>
                <span className="text-green-300">&quot;create-pr&quot;</span>
                <span className="text-white">, {'{'}</span>
                {'\n      '}
                <span className="text-blue-300">title</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;feat: Add user authentication&quot;</span>
                <span className="text-white">,</span>
                {'\n      '}
                <span className="text-blue-300">branch</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;auto-generated&quot;</span>
                {'\n    '}
                <span className="text-white">{'}),'}</span>
                {'\n\n    '}
                <span className="text-gray-500">// Review with Codex</span>
                {'\n    '}
                <span className="text-blue-300">step</span>
                <span className="text-white">.</span>
                <span className="text-emerald-400">agent</span>
                <span className="text-white">(</span>
                <span className="text-green-300">&quot;codex&quot;</span>
                <span className="text-white">, {'{'}</span>
                {'\n      '}
                <span className="text-blue-300">prompt</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;Review PR for bugs and edge cases&quot;</span>
                {'\n    '}
                <span className="text-white">{'}),'}</span>
                {'\n  '}
                <span className="text-white">]</span>
                {'\n'}
                <span className="text-white">{'});'}</span>
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
