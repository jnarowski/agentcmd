#!/bin/bash

# Clean up git branches (local, remote, or both)
# Usage: ./scripts/cleanup-branches.sh [--local|--remote|--all] [--dry-run]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Defaults
CLEAN_LOCAL=false
CLEAN_REMOTE=false
DRY_RUN=false
PROTECTED_BRANCHES="main|staging|develop|dev"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --local)
      CLEAN_LOCAL=true
      shift
      ;;
    --remote)
      CLEAN_REMOTE=true
      shift
      ;;
    --all)
      CLEAN_LOCAL=true
      CLEAN_REMOTE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      echo "Usage: ./scripts/cleanup-branches.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --local     Clean local branches only"
      echo "  --remote    Clean remote branches only"
      echo "  --all       Clean both local and remote branches"
      echo "  --dry-run   Show what would be deleted without deleting"
      echo "  -h, --help  Show this help"
      echo ""
      echo "Protected branches: main, staging, develop, dev"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Default to local if nothing specified
if [[ "$CLEAN_LOCAL" == false && "$CLEAN_REMOTE" == false ]]; then
  CLEAN_LOCAL=true
fi

if [[ "$DRY_RUN" == true ]]; then
  echo -e "${YELLOW}DRY RUN - No branches will be deleted${NC}\n"
fi

echo -e "${YELLOW}Protected branches: main, staging, develop, dev${NC}\n"

# Clean local branches
clean_local() {
  echo -e "${YELLOW}=== Local Branches ===${NC}"

  CURRENT_BRANCH=$(git branch --show-current)
  LOCAL_BRANCHES=$(git branch | grep -vE "^\*|${PROTECTED_BRANCHES}" | sed 's/^[ \t]*//' || true)

  if [[ -z "$LOCAL_BRANCHES" ]]; then
    echo -e "${GREEN}No local branches to delete.${NC}\n"
    return
  fi

  echo "Branches to delete:"
  echo "$LOCAL_BRANCHES" | while read branch; do
    echo "  - $branch"
  done
  echo ""

  if [[ "$DRY_RUN" == true ]]; then
    return
  fi

  read -p "Delete these local branches? (y/N) " -n 1 -r
  echo ""

  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Skipped local branches.${NC}\n"
    return
  fi

  # Switch to main if on a branch being deleted
  if echo "$LOCAL_BRANCHES" | grep -q "^$CURRENT_BRANCH$"; then
    echo -e "${YELLOW}Switching to main branch...${NC}"
    git checkout main
  fi

  echo "$LOCAL_BRANCHES" | while read branch; do
    if [[ -n "$branch" ]]; then
      echo -e "${YELLOW}Deleting: $branch${NC}"
      git branch -D "$branch"
    fi
  done

  echo -e "${GREEN}Local cleanup complete!${NC}\n"
}

# Clean remote branches
clean_remote() {
  echo -e "${YELLOW}=== Remote Branches ===${NC}"

  git fetch --prune origin

  REMOTE_BRANCHES=$(git branch -r | grep 'origin/' | grep -vE "origin/(${PROTECTED_BRANCHES})$" | grep -v 'HEAD' | sed 's|origin/||' || true)

  if [[ -z "$REMOTE_BRANCHES" ]]; then
    echo -e "${GREEN}No remote branches to delete.${NC}\n"
    return
  fi

  echo "Branches to delete:"
  echo "$REMOTE_BRANCHES" | while read branch; do
    echo "  - origin/$branch"
  done
  echo ""

  if [[ "$DRY_RUN" == true ]]; then
    return
  fi

  read -p "Delete these remote branches? (y/N) " -n 1 -r
  echo ""

  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Skipped remote branches.${NC}\n"
    return
  fi

  echo "$REMOTE_BRANCHES" | while read branch; do
    if [[ -n "$branch" ]]; then
      echo -e "${YELLOW}Deleting: origin/$branch${NC}"
      git push origin --delete "$branch"
    fi
  done

  echo -e "${GREEN}Remote cleanup complete!${NC}\n"
}

# Run cleanup
[[ "$CLEAN_LOCAL" == true ]] && clean_local
[[ "$CLEAN_REMOTE" == true ]] && clean_remote

echo -e "${GREEN}Done!${NC}"
