#!/bin/bash
currentPath="$(pwd)"
cd "$(dirname "$0")/.."
npm run start -- --work-dir "$currentPath" "$@"
cd "$currentPath" 