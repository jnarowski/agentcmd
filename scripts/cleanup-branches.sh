#!/bin/bash

# Script to delete all git branches except main, staging, and develop
# Usage: ./cleanup-branches.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Cleaning up git branches...${NC}"
echo -e "${YELLOW}Branches to keep: main, staging, develop${NC}\n"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Get all local branches except main, staging, and develop
BRANCHES_TO_DELETE=$(git branch | grep -v "main" | grep -v "staging" | grep -v "develop" | grep -v "^\*" | sed 's/^[ \t]*//')

if [ -z "$BRANCHES_TO_DELETE" ]; then
    echo -e "${GREEN}No branches to delete.${NC}"
    exit 0
fi

echo -e "${YELLOW}The following branches will be deleted:${NC}"
echo "$BRANCHES_TO_DELETE"
echo ""

# Ask for confirmation
read -p "Are you sure you want to delete these branches? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
fi

# Switch to main if we're on a branch that will be deleted
if echo "$BRANCHES_TO_DELETE" | grep -q "^$CURRENT_BRANCH$"; then
    echo -e "${YELLOW}Switching to main branch...${NC}"
    git checkout main
fi

# Delete branches
echo ""
while IFS= read -r branch; do
    if [ ! -z "$branch" ]; then
        echo -e "${YELLOW}Deleting branch: $branch${NC}"
        git branch -D "$branch"
    fi
done <<< "$BRANCHES_TO_DELETE"

echo ""
echo -e "${GREEN}Branch cleanup complete!${NC}"
