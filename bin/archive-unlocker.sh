#!/bin/bash
currentPath="$(pwd)"
cd "$(dirname "$0")/.."
npm run start -- "$@"
cd "$currentPath" 