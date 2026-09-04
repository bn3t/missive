#!/usr/bin/env bash
#
# One-shot script: applies the parts of this PR that the agent sandbox is not
# allowed to perform itself (it cannot write or delete under .github/workflows/).
#
# Run it from anywhere inside the repository, on the fix/gate-dokploy-deploy branch:
#
#     ./ops/ci/apply-public-cleanup.sh
#     git commit --amend --no-edit   # optional: fold it into the existing commit
#     git push --force-with-lease
#
# It does two things:
#   1. Replaces the "Build and Push" workflow with the corrected version.
#   2. Deletes the Claude Code workflow, which on a public repository lets any
#      GitHub user spend the CLAUDE_CODE_OAUTH_TOKEN by commenting "@claude".
#
# Then it removes itself, so nothing of this staging scaffolding is left behind.
# Every step is guarded, so re-running after a partial run is safe.
#
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if [ -f ops/ci/build.yml ]; then
  # -f because the destination exists: it is the workflow being replaced.
  git mv -f ops/ci/build.yml .github/workflows/build.yml
fi

# Sanity check before deleting anything: refuse to run on a branch that does not
# carry the corrected workflow (e.g. main, where ops/ci/build.yml does not exist).
if ! grep -q 'DOKPLOY_WEBHOOK_URL is not configured' .github/workflows/build.yml; then
  echo "The corrected build.yml is not in place — check out fix/gate-dokploy-deploy first." >&2
  exit 1
fi

if git ls-files --error-unmatch .github/workflows/claude.yml >/dev/null 2>&1; then
  git rm -q .github/workflows/claude.yml
fi

# Drop the staging banner from the workflow: everything before "name: Build and Push".
# Idempotent — a no-op once the banner is gone. awk, not `sed -i`: the BSD sed on
# macOS reads the next argument as a mandatory backup suffix and chokes.
awk 'f || /^name: Build and Push$/ { f = 1; print }' \
  .github/workflows/build.yml > .github/workflows/build.yml.tmp
mv .github/workflows/build.yml.tmp .github/workflows/build.yml
git add .github/workflows/build.yml

if git ls-files --error-unmatch ops/ci/apply-public-cleanup.sh >/dev/null 2>&1; then
  git rm -q ops/ci/apply-public-cleanup.sh
fi
rmdir ops/ci ops 2>/dev/null || true

echo "Done. Review with: git status && git diff --cached"
