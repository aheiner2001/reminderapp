#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Building AWS Lambda deployment package..."
mkdir -p dist

# Install production dependencies inside lambda directory
if [ ! -d "node_modules" ]; then
  echo "Installing lambda dependencies..."
  npm install --omit=dev
fi

# Package zip
ZIP_PATH="$DIR/dist/reminder-worker.zip"
rm -f "$ZIP_PATH"

zip -q -r "$ZIP_PATH" index.mjs package.json node_modules

echo "Deployment package successfully created at:"
echo "  $ZIP_PATH"
echo "You can now upload this zip file directly to AWS Lambda via the AWS Console."
