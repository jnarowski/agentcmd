#!/bin/bash

# Clean remote branches except protected ones
# Usage: ./scripts/clean-remote-branches.sh [--dry-run]

set -e

PROTECTED_BRANCHES="main|staging|dev"
DRY_RUN=false

if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "DRY RUN - No branches will be deleted"
  echo ""
fi

# Fetch latest remote info
git fetch --prune origin

# Get all remote branches except protected ones
BRANCHES=$(git branch -r | grep 'origin/' | grep -vE "origin/(${PROTECTED_BRANCHES})$" | grep -v 'HEAD' | sed 's|origin/||')

if [[ -z "$BRANCHES" ]]; then
  echo "No branches to delete"
  exit 0
fi

echo "Branches to delete:"
echo "$BRANCHES" | while read branch; do
  echo "  - $branch"
done
echo ""

if [[ "$DRY_RUN" == true ]]; then
  echo "Run without --dry-run to delete these branches"
  exit 0
fi

read -p "Delete these branches? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted"
  exit 0
fi

echo "$BRANCHES" | while read branch; do
  echo "Deleting origin/$branch..."
  git push origin --delete "$branch"
done

echo "Done"
