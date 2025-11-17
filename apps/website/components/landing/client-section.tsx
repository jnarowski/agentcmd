export default function ClientSection() {
  return (
    <section
      id="clients"
      className="text-center mx-auto max-w-[80rem] px-6 md:px-8"
    >
      <div className="py-14">
        <div className="mx-auto max-w-screen-xl px-4 md:px-8">
          <h2 className="text-center text-sm font-semibold text-gray-600">
            POWERED BY LEADING AI PLATFORMS
          </h2>
          <div className="mt-6">
            <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-16 [&_path]:fill-white">
              <li>
                <img
                  src={`https://cdn.magicui.design/companies/GitHub.svg`}
                  className="h-8 w-28 px-2 dark:brightness-0 dark:invert"
                  alt="GitHub"
                />
              </li>
              <li>
                <img
                  src={`https://cdn.magicui.design/companies/Google.svg`}
                  className="h-8 w-28 px-2 dark:brightness-0 dark:invert"
                  alt="Google"
                />
              </li>
              <li>
                <img
                  src={`https://cdn.magicui.design/companies/Microsoft.svg`}
                  className="h-8 w-28 px-2 dark:brightness-0 dark:invert"
                  alt="Microsoft"
                />
              </li>
              <li>
                <img
                  src={`https://cdn.magicui.design/companies/Notion.svg`}
                  className="h-8 w-28 px-2 dark:brightness-0 dark:invert"
                  alt="Notion"
                />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
