#!/usr/bin/env bash
PW=$(npx playwright --version | awk '{print $2}')
docker run --rm --init --ipc=host --network host \
  -v "$PWD":/work:z -w /work \
  mcr.microsoft.com/playwright:v${PW}-noble \
  npx playwright test --project=e2e "$@"