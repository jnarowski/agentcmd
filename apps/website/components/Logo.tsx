export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg
        width={32}
        height={32}
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
      <span className="text-xl tracking-tight leading-none">
        <span className="font-light">agent</span>
        <span className="font-extrabold">cmd</span>
      </span>
    </div>
  );
}
