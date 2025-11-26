import pc from "picocolors";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Display welcome banner with ASCII art
 */
export function showWelcomeBanner(): void {
  const width = 59; // Total content width
  const emerald = "\x1b[38;2;5;150;105m"; // #059669
  const reset = "\x1b[0m";

  const center = (text: string) => {
    // eslint-disable-next-line no-control-regex
    const visible = text.replace(/\u001b\[[0-9;]*m/g, '');
    const spaces = width - visible.length;
    const leftPad = Math.floor(spaces / 2);
    const rightPad = spaces - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  };

  console.log("");
  console.log(pc.cyan("   ╔═══════════════════════════════════════════════════════════╗"));
  console.log(pc.cyan("   ║") + center("") + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(pc.blue("█████╗  ██████╗ ███████╗███╗   ██╗████████╗"))) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(pc.blue("██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝"))) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(pc.blue("███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   "))) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(pc.blue("██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   "))) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(pc.blue("██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   "))) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(pc.blue("╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   "))) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center("") + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(`${emerald}██████╗███╗   ███╗██████╗ ${reset}`)) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(`${emerald}██╔════╝████╗ ████║██╔══██╗${reset}`)) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(`${emerald}██║     ██╔████╔██║██║  ██║${reset}`)) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(`${emerald}██║     ██║╚██╔╝██║██║  ██║${reset}`)) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(`${emerald}╚██████╗██║ ╚═╝ ██║██████╔╝${reset}`)) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(`${emerald} ╚═════╝╚═╝     ╚═╝╚═════╝ ${reset}`)) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center("") + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(`${emerald}[>]${reset} ` + pc.dim("AI Coding Agent Orchestration")) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center("") + pc.cyan("║"));
  console.log(pc.cyan("   ╚═══════════════════════════════════════════════════════════╝"));
  console.log("");
}

/**
 * Display output in a styled box with title
 */
export function showBoxedOutput(title: string, content: string): void {
  const emerald = "\x1b[38;2;5;150;105m"; // #059669
  const reset = "\x1b[0m";
  const dim = "\x1b[2m";

  const lines = content.trim().split('\n');
  const maxWidth = Math.max(
    title.length + 4,
    // eslint-disable-next-line no-control-regex
    ...lines.map(line => line.replace(/\u001b\[[0-9;]*m/g, '').length)
  );
  const boxWidth = Math.min(maxWidth + 4, 75);

  console.log("");
  console.log(`   ${emerald}┌─ ${pc.bold(title)} ${"─".repeat(Math.max(0, boxWidth - title.length - 4))}┐${reset}`);

  for (const line of lines) {
    // Indent each line slightly
    console.log(`   ${emerald}│${reset} ${dim}${line}${reset}`);
  }

  console.log(`   ${emerald}└${"─".repeat(boxWidth)}┘${reset}`);
  console.log("");
}

/**
 * Create a success box with checkmarks
 */
export function showSuccessBox(title: string, items: string[], nextSteps?: string[], metadata?: Record<string, string>): void {
  const boxWidth = 61;
  const pad = (text: string) => {
    // eslint-disable-next-line no-control-regex
    const visible = text.replace(/\u001b\[[0-9;]*m/g, '');
    const spaces = boxWidth - visible.length;
    return text + ' '.repeat(Math.max(0, spaces));
  };

  console.log("");
  console.log(pc.green("┌─────────────────────────────────────────────────────────────┐"));
  console.log(pc.green("│") + pad(" " + pc.bold(pc.green(title))) + pc.green("│"));
  console.log(pc.green("├─────────────────────────────────────────────────────────────┤"));
  console.log(pc.green("│") + pad("") + pc.green("│"));

  for (const item of items) {
    console.log(pc.green("│") + pad("  " + pc.green("✓") + " " + item) + pc.green("│"));
  }

  if (nextSteps && nextSteps.length > 0) {
    console.log(pc.green("│") + pad("") + pc.green("│"));
    console.log(pc.green("├─────────────────────────────────────────────────────────────┤"));
    console.log(pc.green("│") + pad(" " + pc.bold("Next Steps")) + pc.green("│"));
    console.log(pc.green("│") + pad("") + pc.green("│"));

    nextSteps.forEach((step, i) => {
      console.log(pc.green("│") + pad("  " + pc.dim(`${i + 1}.`) + " " + step) + pc.green("│"));
    });
  }

  if (metadata && Object.keys(metadata).length > 0) {
    console.log(pc.green("│") + pad("") + pc.green("│"));
    console.log(pc.green("├─────────────────────────────────────────────────────────────┤"));
    console.log(pc.green("│") + pad(" " + pc.bold("Configuration")) + pc.green("│"));
    console.log(pc.green("│") + pad("") + pc.green("│"));

    for (const [key, value] of Object.entries(metadata)) {
      console.log(pc.green("│") + pad("  " + pc.dim(key + ":") + " " + pc.cyan(value)) + pc.green("│"));
    }
  }

  console.log(pc.green("│") + pad("") + pc.green("│"));
  console.log(pc.green("└─────────────────────────────────────────────────────────────┘"));
  console.log("");
}

/**
 * Create an error box
 */
export function showErrorBox(title: string, message: string): void {
  const boxWidth = 61;
  const pad = (text: string) => {
    // eslint-disable-next-line no-control-regex
    const visible = text.replace(/\u001b\[[0-9;]*m/g, '');
    const spaces = boxWidth - visible.length;
    return text + ' '.repeat(Math.max(0, spaces));
  };

  console.log("");
  console.log(pc.red("┌─────────────────────────────────────────────────────────────┐"));
  console.log(pc.red("│") + pad(" " + pc.bold(pc.red(title))) + pc.red("│"));
  console.log(pc.red("├─────────────────────────────────────────────────────────────┤"));
  console.log(pc.red("│") + pad("") + pc.red("│"));
  console.log(pc.red("│") + pad("  " + message) + pc.red("│"));
  console.log(pc.red("│") + pad("") + pc.red("│"));
  console.log(pc.red("└─────────────────────────────────────────────────────────────┘"));
  console.log("");
}
