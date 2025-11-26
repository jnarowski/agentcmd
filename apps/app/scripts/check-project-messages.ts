import fs from 'fs/promises';
import path from 'path';
import os from 'os';

async function checkProjectMessages(projectName: string) {
  const projectDir = path.join(os.homedir(), '.claude', 'projects', projectName);

  try {
    await fs.access(projectDir);
    const files = await fs.readdir(projectDir);
    const jsonlFiles = files.filter((file) => file.endsWith('.jsonl'));

    console.log(`\nProject: ${projectName}`);
    console.log(`Session files: ${jsonlFiles.length}`);

    let sessionsWithMessages = 0;
    let sessionsWithMoreThan3 = 0;

    for (const file of jsonlFiles.slice(0, 5)) {
      // Check first 5 files
      const filePath = path.join(projectDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      let messageCount = 0;
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'user' || entry.type === 'assistant') {
            messageCount++;
          }
        } catch {
          // Skip malformed lines
        }
      }

      if (messageCount > 0) sessionsWithMessages++;
      if (messageCount > 3) sessionsWithMoreThan3++;

      console.log(`  ${file.substring(0, 8)}...: ${messageCount} messages`);
    }

    console.log(`\nSummary:`);
    console.log(`  Sessions with any messages: ${sessionsWithMessages}`);
    console.log(`  Sessions with >3 messages: ${sessionsWithMoreThan3}`);
    console.log(
      `  Should import: ${sessionsWithMoreThan3 > 0 ? 'YES' : 'NO'}`
    );
  } catch {
    console.log(`Project ${projectName} not found or inaccessible`);
  }
}

async function main() {
  // Check the projects mentioned by the user
  await checkProjectMessages(
    '-Users-jnarowski-Dev-sourceborn-src-agent-workflows-monorepo'
  );
  await checkProjectMessages(
    '-Users-jnarowski-Dev-spectora-src-agent-utils--agent-workflows'
  );
}

main();
