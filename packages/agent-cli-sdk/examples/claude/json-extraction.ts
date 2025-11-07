#!/usr/bin/env tsx
/**
 * Example of using execute() with JSON extraction
 * Demonstrates how to get structured data from Claude's response
 */

import { execute } from '../../src/index';

interface FileInfo {
  name: string;
  type: 'file' | 'directory';
  extension?: string;
}

interface FileListResponse {
  files: FileInfo[];
}

async function main() {
  console.log('Requesting structured JSON output from Claude...\n');

  const result = await execute<FileListResponse>({
    tool: 'claude',
    prompt: `List all files in the current directory and return the result as a JSON object with this structure:
{
  "files": [
    { "name": "example.ts", "type": "file", "extension": "ts" },
    { "name": "folder", "type": "directory" }
  ]
}

Please return ONLY the JSON, no additional text.`,
    json: true, // Enable JSON extraction
    verbose: false,
  });

  console.log('=== Result ===');
  console.log('Success:', result.success);
  console.log('Exit code:', result.exitCode);
  console.log('Duration:', result.duration, 'ms');

  // Check if data is an object (parsed JSON) vs string (raw text)
  if (typeof result.data === 'object' && result.data !== null) {
    console.log('\nExtracted JSON data:');
    console.log(JSON.stringify(result.data, null, 2));

    console.log('\nFiles found:');
    result.data.files?.forEach((file) => {
      console.log(`  - ${file.name} (${file.type})`);
    });
  } else {
    console.log('\nNo JSON could be extracted from the response');
    console.log('Raw text response:', result.data);
  }
}

main().catch(console.error);
