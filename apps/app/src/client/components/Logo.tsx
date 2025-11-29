interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className = "" }: LogoProps) {
  const sizes = {
    sm: { icon: 36, text: "text-2xl" },
    md: { icon: 48, text: "text-3xl" },
    lg: { icon: 64, text: "text-5xl" },
  };

  const { icon, text } = sizes[size];

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 24 24"
        className="text-emerald-500"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 4 6 L 4 18 M 4 6 L 8 6 M 4 18 L 8 18"
          stroke="currentColor"
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 10 8.5 L 15 12 L 10 15.5"
          stroke="currentColor"
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 20 6 L 20 18 M 16 6 L 20 6 M 16 18 L 20 18"
          stroke="currentColor"
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span className={`${text} tracking-tight leading-none`}>
        <span className="font-light">agent</span>
        <span className="font-extrabold">cmd</span>
      </span>
    </div>
  );

  const href = import.meta.env.DEV ? "http://localhost:3000" : "https://agentcmd.dev";

  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  );
}
