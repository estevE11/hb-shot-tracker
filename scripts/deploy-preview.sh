#!/usr/bin/env bash
# Publish main at / and the committed dev app at /dev/ on GitHub Pages.
set -euo pipefail
repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"
if [[ -n $(git status --porcelain) ]]; then
  echo 'Commit changes before deploying the preview.' >&2
  exit 1
fi
git fetch origin
preview_ref=$(git rev-parse dev)
production_ref=$(git rev-parse origin/main)
if git show-ref --verify --quiet refs/remotes/origin/gh-pages; then
  publish_base=origin/gh-pages
else
  publish_base=origin/main
fi
publish_dir=$(mktemp -d)
rmdir "$publish_dir"
git worktree add --detach "$publish_dir" "$publish_base"
trap 'git worktree remove --force "$publish_dir"' EXIT
# This worktree is generated publication output; the working branches stay intact.
git -C "$publish_dir" rm -rf --ignore-unmatch . >/dev/null
git archive "$production_ref" | tar -x -C "$publish_dir"
mkdir -p "$publish_dir/dev"
git archive "$preview_ref" index.html styles.css database.js canvas.js menu.js shots.js export.js sw.js manifest.json hbpitch.png court.svg lib icons | tar -x -C "$publish_dir/dev"
touch "$publish_dir/.nojekyll"
git -C "$publish_dir" add .
if ! git -C "$publish_dir" diff --cached --quiet; then
  git -C "$publish_dir" commit -m "deploy: publish dev preview ${preview_ref:0:7}"
fi
git -C "$publish_dir" push origin HEAD:refs/heads/gh-pages
gh api --method PUT repos/estevE11/hb-shot-tracker/pages -f 'source[branch]=gh-pages' -f 'source[path]=/' >/dev/null
echo 'Preview: https://esteve11.github.io/hb-shot-tracker/dev/'
