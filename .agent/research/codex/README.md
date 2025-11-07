# Codex CLI Research

This directory contains comprehensive research on OpenAI's Codex CLI tool.

## Files

- **codex-cli-research-2025-10-28.md**: Full research report with detailed analysis
- **codex-samples/**: Real output samples from Codex testing
  - `stream-output-1.jsonl`: Simple math question
  - `stream-output-2.jsonl`: File listing with command execution
  - `stream-output-3.jsonl`: File creation
  - `stream-output-4.jsonl`: File reading
  - `stream-output-5.jsonl`: Directory listing

## Quick Summary

### Key Findings

1. **Two Formats**:
   - Streaming format (--json flag): Simplified, real-time events
   - Stored sessions (~/.codex/sessions/): Comprehensive, with timestamps and encryption

2. **Unification**: Formats CAN be unified with proper mapping

3. **Event Types**:
   - Streaming: `thread.started`, `turn.started`, `item.started`, `item.completed`, `turn.completed`
   - Stored: `session_meta`, `response_item`, `event_msg`, `turn_context`

4. **Item Types**: `reasoning`, `agent_message`, `command_execution`, `file_change`

### Implementation Path

1. Create unified TypeScript types
2. Build parsers for both formats
3. Support session loading from ~/.codex/sessions/
4. Enable real-time streaming with --json
5. Add to agent-cli-sdk alongside Claude integration

### Comparison to Claude Code

| Feature | Claude Code | Codex CLI |
|---------|-------------|-----------|
| Streaming Format | JSONL events | JSONL events (similar) |
| Session Storage | ~/.claude/sessions/ | ~/.codex/sessions/ |
| Encryption | No | Yes (reasoning only) |
| Timestamps | In storage | In storage only |
| Resume Session | Yes | Yes |
| Output Formats | Multiple | JSON, text, pretty |

Both tools are structurally similar and can share the same unified format!

---

See full report for detailed analysis, code samples, and integration recommendations.
