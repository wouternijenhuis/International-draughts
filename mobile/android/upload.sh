#!/usr/bin/env bash
# Upload the release AAB to Play Store Internal Testing track (live, not draft).
# Run this AFTER placing your Google Play service account key at:
# android/fastlane/play-store-key.json

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_PATH="$SCRIPT_DIR/fastlane/play-store-key.json"

if [[ ! -f "$KEY_PATH" ]]; then
  echo ""
  echo "❌  play-store-key.json not found at:"
  echo "    $KEY_PATH"
  echo ""
  echo "Please follow these steps first:"
  echo ""
  echo "1. Go to https://play.google.com/console"
  echo "2. Create the app:"
  echo "   - App name: International Draughts"
  echo "   - Package: com.internationaldrauts.international_draughts"
  echo "   - Type: Game  |  Free"
  echo ""
  echo "3. Create a service account:"
  echo "   - In Play Console: Setup → API access → Create new service account"
  echo "   - Follow the Google Cloud Console link"
  echo "   - Create a service account with name: fastlane-upload"
  echo "   - Role: Service Account User"
  echo "   - Create a JSON key → download it"
  echo "   - Save as: android/fastlane/play-store-key.json"
  echo ""
  echo "4. Back in Play Console: Refresh service accounts"
  echo "   - Grant the service account: Release manager"
  echo ""
  echo "5. Re-run this script: ./upload.sh"
  exit 1
fi

echo "✅  Service account key found."
echo "🚀  Uploading to Play Store Internal Testing track..."
echo ""

export PATH="/opt/homebrew/opt/fastlane/bin:$HOME/.local/share/fastlane/4.0.0/bin:$PATH"

cd "$SCRIPT_DIR"
fastlane internal

echo ""
echo "🎉  Done! Check your Internal Testing track at:"
echo "    https://play.google.com/console"
