import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Reproduce the hasQualifyingSessions logic
async function hasQualifyingSessions(
  projectName: string,
  minMessages: number = 3
): Promise<boolean> {
  const projectDir = path.join(os.homedir(), '.claude', 'projects', projectName);

  try {
    await fs.access(projectDir);
    const files = await fs.readdir(projectDir);
    const jsonlFiles = files.filter((file) => file.endsWith('.jsonl'));

    console.log(`\nChecking project: ${projectName}`);
    console.log(`Found ${jsonlFiles.length} JSONL files`);

    // Check each session file for message count
    for (const file of jsonlFiles) {
      const filePath = path.join(projectDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);

        let messageCount = 0;
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            // Claude Code JSONL format has type field at top level
            if (entry.type === 'user' || entry.type === 'assistant') {
              messageCount++;
              // Early exit if we found enough messages
              if (messageCount > minMessages) {
                console.log(`  ✓ Session ${file.substring(0, 8)}... has ${messageCount}+ messages (qualifying!)`);
                return true;
              }
            }
          } catch {
            // Skip malformed lines
          }
        }
        console.log(`  ✗ Session ${file.substring(0, 8)}... has ${messageCount} messages (not qualifying)`);
      } catch {
        // Skip files we can't read
        console.log(`  ? Session ${file.substring(0, 8)}... could not be read`);
      }
    }

    console.log(`  Result: NO qualifying sessions found`);
    return false;
  } catch {
    console.log(`  Result: Project directory not accessible`);
    return false;
  }
}

async function main() {
  console.log('Testing message filtering logic...');
  console.log('Minimum messages required: >3 (i.e., 4 or more)\n');

  // Test the specific projects mentioned
  const workflows = await hasQualifyingSessions(
    '-Users-jnarowski-Dev-sourceborn-src-agent-workflows-monorepo'
  );
  console.log(`\nShould import "workflows": ${workflows ? 'YES' : 'NO'}\n`);

  const utils = await hasQualifyingSessions(
    '-Users-jnarowski-Dev-spectora-src-agent-utils--agent-workflows'
  );
  console.log(`\nShould import "utils": ${utils ? 'YES' : 'NO'}\n`);

  // Test a project that might have few messages
  const v2 = await hasQualifyingSessions(
    '-Users-jnarowski-Dev-sourceborn-src-agent-workflows-monorepo-v2'
  );
  console.log(`\nShould import "v2": ${v2 ? 'YES' : 'NO'}\n`);
}

main();
