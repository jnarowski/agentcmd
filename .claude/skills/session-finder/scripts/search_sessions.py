#!/usr/bin/env python3
"""
Search Claude Code session files for specific content.

Usage:
    python3 search_sessions.py "search terms" [project_path]

Example:
    python3 search_sessions.py "pino log rotation"
    python3 search_sessions.py "authentication" /Users/jnarowski/Dev/myproject
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path


def convert_path_to_claude_format(project_path):
    """Convert a file system path to Claude's session directory format."""
    # Claude stores sessions with paths like: -Users-jnarowski-Dev-project-name
    return project_path.replace('/', '-')


def find_session_directory(project_path=None):
    """Find the appropriate Claude sessions directory."""
    base_dir = Path.home() / '.claude' / 'projects'

    if project_path:
        # Convert path to Claude format
        project_dir = convert_path_to_claude_format(project_path)
        session_dir = base_dir / project_dir

        if not session_dir.exists():
            print(f"Warning: Session directory not found: {session_dir}")
            print(f"Falling back to current working directory...")
            # Try to find based on cwd
            cwd = os.getcwd()
            project_dir = convert_path_to_claude_format(cwd)
            session_dir = base_dir / project_dir
    else:
        # Use current working directory
        cwd = os.getcwd()
        project_dir = convert_path_to_claude_format(cwd)
        session_dir = base_dir / project_dir

    return session_dir, project_path or os.getcwd()


def search_content_block(block, search_terms):
    """Search within a single content block and return matches."""
    matches = []
    score = 0

    if not isinstance(block, dict):
        return matches, score

    block_type = block.get('type')

    # Text blocks
    if block_type == 'text' and 'text' in block:
        text = block['text'].lower()
        for term in search_terms:
            if term in text:
                score += 1
                matches.append(block['text'][:200])
                break  # Only add once per block

    # Tool use blocks
    elif block_type == 'tool_use':
        tool_name = block.get('name', '')
        tool_input = json.dumps(block.get('input', {})).lower()

        # Check tool name
        for term in search_terms:
            if term in tool_name.lower():
                score += 2  # Tool uses are more relevant
                matches.append(f"Tool: {tool_name}")
                break

        # Check tool input
        for term in search_terms:
            if term in tool_input:
                score += 1
                if f"Tool: {tool_name}" not in matches:
                    matches.append(f"Tool: {tool_name}")
                break

    # Tool result blocks
    elif block_type == 'tool_result':
        result_content = str(block.get('content', '')).lower()
        for term in search_terms:
            if term in result_content:
                score += 0.5
                matches.append("Tool result matched")
                break

    return matches, score


def extract_file_paths(block):
    """Extract file paths from tool use blocks."""
    files = set()

    if isinstance(block, dict) and block.get('type') == 'tool_use':
        tool_input = block.get('input', {})
        if 'file_path' in tool_input:
            files.add(tool_input['file_path'])

    return files


def search_session_file(filepath, search_terms):
    """Search a single session file and return matches."""
    matches = []
    files_mentioned = set()
    tool_uses = set()
    score = 0

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue

                try:
                    msg = json.loads(line)

                    # ONLY search in message.content (not metadata)
                    # This avoids false positives from fields like sessionId, gitBranch, etc.
                    if 'message' not in msg or 'content' not in msg['message']:
                        continue

                    content = msg['message']['content']

                    # Handle string content
                    if isinstance(content, str):
                        content_lower = content.lower()
                        if any(term in content_lower for term in search_terms):
                            matches.append(content[:200])
                            score += sum(1 for term in search_terms if term in content_lower)

                    # Handle array content (proper format)
                    elif isinstance(content, list):
                        for block in content:
                            block_matches, block_score = search_content_block(block, search_terms)
                            matches.extend(block_matches)
                            score += block_score

                            # Extract file paths
                            files_mentioned.update(extract_file_paths(block))

                            # Track tool uses
                            if isinstance(block, dict) and block.get('type') == 'tool_use':
                                tool_uses.add(block.get('name', ''))

                except json.JSONDecodeError:
                    continue  # Skip malformed JSON lines

    except Exception as e:
        print(f"Error reading {filepath}: {e}", file=sys.stderr)
        return None

    if score > 0:
        mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
        return {
            'session_id': os.path.basename(filepath).replace('.jsonl', ''),
            'score': score,
            'matches': matches[:3],  # Top 3 matches
            'files': list(files_mentioned)[:5],  # Top 5 files
            'tools': list(tool_uses),
            'date': mtime
        }

    return None


def search_sessions(search_description, project_path=None):
    """Search all session files for the given terms."""
    search_terms = [term.lower() for term in search_description.split()]

    session_dir, resolved_project_path = find_session_directory(project_path)

    if not session_dir.exists():
        print(f"Error: Session directory not found: {session_dir}")
        return [], resolved_project_path

    # Find all JSONL files
    session_files = list(session_dir.glob('*.jsonl'))

    if not session_files:
        print(f"No session files found in: {session_dir}")
        return [], resolved_project_path

    print(f"\nSearching {len(session_files)} sessions for: \"{search_description}\"")
    print(f"Project: {resolved_project_path}\n")

    results = []
    for filepath in session_files:
        result = search_session_file(filepath, search_terms)
        if result:
            results.append(result)

    # Sort by score (descending) then date (descending)
    results.sort(key=lambda x: (x['score'], x['date']), reverse=True)

    return results, resolved_project_path


def display_results(results, project_path):
    """Display search results in a user-friendly format."""
    if not results:
        print("No sessions found matching your search.\n")
        print("Try:")
        print("- Using different keywords")
        print("- Broadening your search terms")
        print("- Checking if sessions exist for this project")
        return

    print(f"Found {len(results)} matching session(s):\n")

    for i, result in enumerate(results[:5], 1):  # Top 5 results
        relevance = "High" if result['score'] >= 3 else "Medium" if result['score'] >= 1 else "Low"

        print(f"{i}. Session: {result['session_id']}")
        print(f"   Date: {result['date'].strftime('%b %d, %Y at %I:%M %p')}")
        print(f"   Relevance: {relevance} (score: {result['score']})")

        if result['matches']:
            print(f"\n   Context:")
            for match in result['matches']:
                snippet = match.replace('\n', ' ')[:150]
                print(f"   - {snippet}...")

        if result['files']:
            print(f"\n   Files: {', '.join(result['files'])}")

        if result['tools']:
            print(f"   Tools: {', '.join(result['tools'])}")

        print(f"\n   Resume: claude --resume {result['session_id']} --project {project_path}")
        print()


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 search_sessions.py \"search terms\" [project_path]")
        print("\nExample:")
        print('  python3 search_sessions.py "pino log rotation"')
        print('  python3 search_sessions.py "authentication" /Users/jnarowski/Dev/myproject')
        sys.exit(1)

    search_description = sys.argv[1]
    project_path = sys.argv[2] if len(sys.argv) > 2 else None

    results, resolved_project_path = search_sessions(search_description, project_path)
    display_results(results, resolved_project_path)


if __name__ == '__main__':
    main()
