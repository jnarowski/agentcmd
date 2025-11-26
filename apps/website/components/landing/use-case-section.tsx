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
                <span className="text-gray-500">// Example: Implement & Review Workflow</span>
                {'\n'}
                <span className="text-purple-400">export default</span> <span className="text-yellow-300">defineWorkflow</span>
                <span className="text-white">(</span>
                {'\n  '}
                <span className="text-white">{'{'}</span>
                {'\n    '}
                <span className="text-blue-300">id</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;implement-review-workflow&quot;</span>
                <span className="text-white">,</span>
                {'\n    '}
                <span className="text-blue-300">name</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;Implement Review Workflow&quot;</span>
                <span className="text-white">,</span>
                {'\n    '}
                <span className="text-blue-300">phases</span>
                <span className="text-white">: [</span>
                {'\n      '}
                <span className="text-white">{'{ '}</span>
                <span className="text-blue-300">id</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;implement&quot;</span>
                <span className="text-white">,</span> <span className="text-blue-300">label</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;Implement&quot;</span>
                <span className="text-white">{' },'}</span>
                {'\n      '}
                <span className="text-white">{'{ '}</span>
                <span className="text-blue-300">id</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;review&quot;</span>
                <span className="text-white">,</span> <span className="text-blue-300">label</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;Review&quot;</span>
                <span className="text-white">{' }'}</span>
                {'\n    '}
                <span className="text-white">],</span>
                {'\n  '}
                <span className="text-white">{'}'}</span>
                <span className="text-white">,</span>
                {'\n  '}
                <span className="text-purple-400">async</span> <span className="text-white">({'({ '}</span>
                <span className="text-blue-300">event</span>
                <span className="text-white">,</span> <span className="text-blue-300">step</span>
                <span className="text-white">{' }) => {'}</span>
                {'\n    '}
                <span className="text-purple-400">const</span> <span className="text-white">{'{ '}</span>
                <span className="text-blue-300">workingDir</span>
                <span className="text-white">,</span> <span className="text-blue-300">specFile</span>
                <span className="text-white">{' } ='}</span> <span className="text-blue-300">event</span>
                <span className="text-white">.</span>
                <span className="text-blue-300">data</span>
                <span className="text-white">;</span>
                {'\n\n    '}
                <span className="text-purple-400">await</span> <span className="text-blue-300">step</span>
                <span className="text-white">.</span>
                <span className="text-yellow-300">phase</span>
                <span className="text-white">(</span>
                <span className="text-green-300">&quot;implement&quot;</span>
                <span className="text-white">,</span> <span className="text-purple-400">async</span> <span className="text-white">() {'=> {'}</span>
                {'\n      '}
                <span className="text-purple-400">const</span> <span className="text-blue-300">response</span> <span className="text-white">=</span> <span className="text-purple-400">await</span> <span className="text-blue-300">step</span>
                <span className="text-white">.</span>
                <span className="text-emerald-400">agent</span>
                <span className="text-white">(</span>
                {'\n        '}
                <span className="text-green-300">&quot;implement-spec&quot;</span>
                <span className="text-white">,</span>
                {'\n        '}
                <span className="text-white">{'{'}</span>
                {'\n          '}
                <span className="text-blue-300">agent</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;claude&quot;</span>
                <span className="text-white">,</span>
                {'\n          '}
                <span className="text-blue-300">json</span>
                <span className="text-white">:</span> <span className="text-purple-400">true</span>
                <span className="text-white">,</span>
                {'\n          '}
                <span className="text-blue-300">prompt</span>
                <span className="text-white">:</span> <span className="text-yellow-300">buildSlashCommand</span>
                <span className="text-white">(</span>
                {'\n            '}
                <span className="text-green-300">&quot;/cmd:implement-spec&quot;</span>
                <span className="text-white">,</span>
                {'\n            '}
                <span className="text-white">{'{ '}</span>
                <span className="text-blue-300">specIdOrNameOrPath</span>
                <span className="text-white">:</span> <span className="text-blue-300">specFile</span>
                <span className="text-white">,</span> <span className="text-blue-300">format</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;json&quot;</span>
                <span className="text-white">{' }'}</span>
                {'\n          '}
                <span className="text-white">),</span>
                {'\n          '}
                <span className="text-blue-300">workingDir</span>
                {'\n        '}
                <span className="text-white">{'}'}</span>
                {'\n      '}
                <span className="text-white">);</span>
                {'\n      '}
                <span className="text-purple-400">return</span> <span className="text-blue-300">response</span>
                <span className="text-white">;</span>
                {'\n    '}
                <span className="text-white">{'});'}</span>
                {'\n\n    '}
                <span className="text-purple-400">await</span> <span className="text-blue-300">step</span>
                <span className="text-white">.</span>
                <span className="text-yellow-300">phase</span>
                <span className="text-white">(</span>
                <span className="text-green-300">&quot;review&quot;</span>
                <span className="text-white">,</span> <span className="text-purple-400">async</span> <span className="text-white">() {'=> {'}</span>
                {'\n      '}
                <span className="text-purple-400">await</span> <span className="text-blue-300">step</span>
                <span className="text-white">.</span>
                <span className="text-emerald-400">agent</span>
                <span className="text-white">(</span>
                {'\n        '}
                <span className="text-green-300">&quot;review-spec-implementation&quot;</span>
                <span className="text-white">,</span>
                {'\n        '}
                <span className="text-white">{'{'}</span>
                {'\n          '}
                <span className="text-blue-300">agent</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;claude&quot;</span>
                <span className="text-white">,</span>
                {'\n          '}
                <span className="text-blue-300">json</span>
                <span className="text-white">:</span> <span className="text-purple-400">true</span>
                <span className="text-white">,</span>
                {'\n          '}
                <span className="text-blue-300">prompt</span>
                <span className="text-white">:</span> <span className="text-yellow-300">buildSlashCommand</span>
                <span className="text-white">(</span>
                {'\n            '}
                <span className="text-green-300">&quot;/cmd:review-spec-implementation&quot;</span>
                <span className="text-white">,</span>
                {'\n            '}
                <span className="text-white">{'{ '}</span>
                <span className="text-blue-300">specIdOrNameOrPath</span>
                <span className="text-white">:</span> <span className="text-blue-300">specFile</span>
                <span className="text-white">,</span> <span className="text-blue-300">format</span>
                <span className="text-white">:</span> <span className="text-green-300">&quot;json&quot;</span>
                <span className="text-white">{' }'}</span>
                {'\n          '}
                <span className="text-white">)</span>
                {'\n        '}
                <span className="text-white">{'}'}</span>
                {'\n      '}
                <span className="text-white">);</span>
                {'\n    '}
                <span className="text-white">{'});'}</span>
                {'\n  '}
                <span className="text-white">{'}'}</span>
                {'\n'}
                <span className="text-white">);</span>
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
