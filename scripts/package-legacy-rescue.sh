#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repository_root="$(dirname -- "$script_dir")"
skill_parent="$repository_root/plugins/thread-fingerprint-legacy-rescue/skills"
skill_name="thread-fingerprint-legacy-rescue"
output_directory="$repository_root/dist"
output_file="$output_directory/thread-fingerprint-legacy-rescue-skill-0.1.0.zip"

if [[ ! -f "$skill_parent/$skill_name/SKILL.md" ]]; then
  echo "Legacy Rescue skill not found." >&2
  exit 1
fi

mkdir -p "$output_directory"
rm -f "$output_file"

(
  cd "$skill_parent"
  zip -q -r "$output_file" "$skill_name"
)

echo "$output_file"
