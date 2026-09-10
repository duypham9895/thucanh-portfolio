#!/bin/sh
# Regenerate the frozen design snapshot's hash manifest.
# Pins the snapshot only — this port's own PROVENANCE.md / DEVIATIONS.md are excluded so that
# editing them cannot fail the integrity gate.
set -e
cd "$(dirname "$0")/../../docs/design/v3-source"
find . -type f | grep -vE "^\./(BASELINE\.sha256|PROVENANCE\.md|DEVIATIONS\.md|\.baselineignore)$" | sort | xargs shasum -a 256 > /tmp/baseline.body
{ echo "# Baseline integrity manifest — Claude Design project b8e2e5a4-1ed4-444a-81a6-089830b12b02"
  echo "# The frozen design snapshot ONLY. PROVENANCE.md and DEVIATIONS.md are this port's own"
  echo "# documents about the snapshot, not part of it, so editing them does not break G1."
  echo "# Regenerate: see tools/build/gen-baseline.sh"
  cat /tmp/baseline.body; } > BASELINE.sha256
echo "pinned $(grep -c '^[0-9a-f]' BASELINE.sha256) files"
