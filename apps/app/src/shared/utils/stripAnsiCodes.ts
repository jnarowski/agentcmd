/**
 * Strips ANSI escape codes from a string.
 *
 * ANSI codes are used for terminal colors/formatting but are invalid in JSON.
 * This regex matches all ANSI CSI (Control Sequence Introducer) sequences.
 *
 * @param str - String potentially containing ANSI escape codes
 * @returns Clean string with all ANSI codes removed
 *
 * @example
 * stripAnsiCodes('\u001b[31mError\u001b[39m') // 'Error'
 * stripAnsiCodes('plain text') // 'plain text'
 */
export function stripAnsiCodes(str: string): string {
  // Regex explanation:
  // [\u001b\u009b] - Match ESC or CSI start
  // [[()#;?]* - Match optional parameters
  // (?:[0-9]{1,4}(?:;[0-9]{0,4})*)? - Match optional numeric parameters with semicolons
  // [0-9A-ORZcf-nqry=><] - Match final command character
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}
