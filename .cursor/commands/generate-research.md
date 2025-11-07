---
description: Deploys parallel subagents to comprehensively research any topic
argument-hint: [featureName, researchTopic, format]
---

# Parallel Research

You are a research orchestrator that deploys multiple subagents to investigate topics from different angles simultaneously. Read the Instructions and follow the Workflow below

## Variables

- $featureName: $1 (optional)
- $researchTopic: $2
- $format: $3 (optional) - Output format: "text" or "json" (defaults to "text" if not provided)

## Instructions

- Normalize $featureName (lowercase, hyphenated) for the output path
- If $researchTopic is not provided, stop IMMEDIATELY and ask the user to specify the topic.
- If $format is not provided, default to "text"

## Workflow

When I give you a research question, you will:

1. Deploy 4-5 parallel subagents using Task tool, each with a different research strategy
2. Wait for all agents to complete
3. Synthesize findings into a unified research document using exact structure from Synthesis Template
4. Write this research doc to `.agent/specs/${featureName}-research.md`

## Subagent Templates

### Agent 1: Broad Context

Task: Research "[TOPIC]" - Broad Context

- Search for overview, landscape, and general information
- Find 5-7 diverse sources covering different aspects
- Identify key concepts and terminology
- Note main players, tools, or solutions in this space
- Summarize in 500 words with source links

### Agent 2: Deep Technical

Task: Research "[TOPIC]" - Technical Deep Dive

- Search for implementation details and technical specifications
- Find code examples, architecture patterns, and best practices
- Look for performance benchmarks and technical tradeoffs
- Identify common pitfalls and solutions
- Summarize in 500 words with source links

### Agent 3: Problems & Alternatives

Task: Research "[TOPIC]" - Critical Analysis

- Search for problems, issues, and criticisms
- Find alternative approaches and competing solutions
- Look for failure cases and lessons learned
- Identify when NOT to use this approach
- Summarize in 500 words with source links

### Agent 4: Real-World Usage

Task: Research "[TOPIC]" - Practical Applications

- Search for case studies and real implementations
- Find companies or projects using this
- Look for migration stories and adoption patterns
- Identify success metrics and outcomes
- Summarize in 500 words with source links

### Agent 5: Latest Developments

NOTE: Ignore this section for highly technical topics unless the user specifically asks for it.

Task: Research "[TOPIC]" - Current State

- Search for recent updates (last 6-12 months)
- Find latest versions, releases, or announcements
- Look for community discussions and trends
- Identify future roadmap or upcoming changes
- Summarize in 500 words with source links

## Synthesis Template

```md
# Research: [TOPIC]

Date: [Current Date]

## Question

$researchTopic

## Executive Summary

[2-3 paragraph summary of key findings]

## Consensus Findings

[What multiple agents agreed on]

- Finding 1 (Agents 1, 2, 4)
- Finding 2 (Agents 1, 3, 5)

## Unique Insights

### From Broad Context

[Key unique findings]

### From Technical Deep Dive

[Key unique findings]

### From Critical Analysis

[Key unique findings]

### From Practical Applications

[Key unique findings]

### From Latest Developments

[Key unique findings]

## Conflicts & Open Questions

- [Where agents found conflicting information]
- [Questions that remain unanswered]

## Recommendations

Based on the research:

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

## All Sources

[Comprehensive list organized by relevance]
```

## Example Usage

User: "Research approaches to building a TypeScript CLI tool that syncs with a package registry"

You:

1. Deploy 5 parallel tasks as specified above
2. Each agent researches independently
3. Synthesize into unified findings document

## Notes

- Each agent operates independently - no coordination during research
- Aim for 5-10 web searches per agent
- If an agent fails, note it in synthesis but continue
- Highlight confidence levels: High (3+ agents agree), Medium (2 agents), Low (single agent)

## Report

### JSON

**IMPORTANT**: If $format is "json", return raw JSON output (no ```json code fences, no markdown):

```json
{
  "success": true,
  "research_path": ".agent/specs/featureName-research.md",
  "feature_name": "featureName",
  "research_topic": "The research topic/question",
  "agents_deployed": 5,
  "agents_completed": 5,
  "consensus_findings_count": 4,
  "unique_insights_count": 8,
  "conflicts_count": 2,
  "recommendations_count": 3,
  "total_sources": 25,
  "confidence_breakdown": {
    "high": 4,
    "medium": 5,
    "low": 3
  }
}
```

**JSON Field Descriptions:**

- `success`: Always true if research generation completed
- `research_path`: Path to the generated research file
- `feature_name`: Normalized feature name (lowercase, hyphenated)
- `research_topic`: The research question or topic
- `agents_deployed`: Number of parallel agents deployed
- `agents_completed`: Number of agents that successfully completed
- `consensus_findings_count`: Number of findings where multiple agents agreed
- `unique_insights_count`: Total number of unique insights across all agents
- `conflicts_count`: Number of conflicting findings or open questions
- `recommendations_count`: Number of recommendations provided
- `total_sources`: Total number of sources cited across all agents
- `confidence_breakdown`: Counts by confidence level (high/medium/low)

### Text

Otherwise, provide this human-readable information to the user:

- IMPORTANT: Return exclusively the path to the research file created and nothing else.
