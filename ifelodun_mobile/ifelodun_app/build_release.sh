#!/bin/bash

# Build Release APK Script
# Usage: ./build_release.sh [version] [build_number]
# Example: ./build_release.sh 1.0.1 2

set -e

APP_NAME="ifelodun"

# Navigate to app directory and derive version defaults from pubspec.yaml
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PUBSPEC_FILE="pubspec.yaml"

if [ ! -f "$PUBSPEC_FILE" ]; then
  echo "❌ pubspec.yaml not found in $SCRIPT_DIR"
  exit 1
fi

read CURRENT_VERSION CURRENT_BUILD NEXT_VERSION NEXT_BUILD <<EOF
$(python3 <<'PY'
import pathlib
import re

path = pathlib.Path("pubspec.yaml")
text = path.read_text()
match = re.search(r"^version:\s*([0-9]+)\.([0-9]+)\.([0-9]+)\+([0-9]+)", text, re.MULTILINE)
if not match:
    raise SystemExit("Version format not found in pubspec.yaml")
major, minor, patch, build = map(int, match.groups())
current_version = f"{major}.{minor}.{patch}"
current_build = build
next_version = f"{major}.{minor}.{patch + 1}"
next_build = build + 1
print(current_version, current_build, next_version, next_build)
PY
)
EOF

VERSION=${1:-$NEXT_VERSION}
BUILD_NUMBER=${2:-$NEXT_BUILD}
MIN_VERSION=${3:-$CURRENT_VERSION}
NOTES=${4:-"Bug fixes and performance improvements."}

echo "Building $APP_NAME v$VERSION (build $BUILD_NUMBER)..."

# Update pubspec.yaml version automatically
if [ -f "$PUBSPEC_FILE" ]; then
  echo "Updating $PUBSPEC_FILE to version $VERSION+$BUILD_NUMBER..."
  python3 <<PY
import pathlib
import re
import sys

path = pathlib.Path("$PUBSPEC_FILE")
data = path.read_text()
pattern = re.compile(r"^version:\s*.*$", re.MULTILINE)
replacement = "version: ${VERSION}+${BUILD_NUMBER}"

if pattern.search(data):
    updated = pattern.sub(replacement, data, count=1)
    path.write_text(updated)
else:
    print("Warning: version line not found in $PUBSPEC_FILE", file=sys.stderr)
PY
else
  echo "Warning: $PUBSPEC_FILE not found, skipping version update."
fi

# Clean previous builds
echo "Cleaning..."
flutter clean

# Get dependencies
echo "Getting dependencies..."
flutter pub get

# Build release APK
echo "Building APK..."
flutter build apk --release

# Get the built APK path
APK_PATH="build/app/outputs/flutter-apk/app-release.apk"
APK_NAME="${APP_NAME}-${VERSION}.apk"

if [ -f "$APK_PATH" ]; then
    # Copy to a named file
    cp "$APK_PATH" "$APK_NAME"
    
    # Calculate SHA256 checksum (optional)
    if command -v shasum &> /dev/null; then
        CHECKSUM=$(shasum -a 256 "$APK_NAME" | awk '{print $1}')
        echo "SHA256: $CHECKSUM"
    fi
    
    # Generate app_version.json for backend (same directory as app_version.php)
    cat > ../ifelodun-mobile_backend/mobile-api/app_version.json <<EOF
{
    "version": "$VERSION",
    "min_version": "$MIN_VERSION",
    "url": "https://ifeloduncms.com.ng/downloads/$APK_NAME",
    "checksum": "${CHECKSUM:-null}",
    "notes": "$NOTES"
}
EOF
    
    echo ""
    echo "✅ Build complete!"
    echo "📦 APK: $APK_NAME"
    echo "📍 Location: $(pwd)/$APK_NAME"
    echo "📝 Version info: ../ifelodun-mobile_backend/mobile-api/app_version.json"
    echo ""
    echo "Next steps:"
    echo "1. Upload $APK_NAME to https://ifeloduncms.com.ng/downloads/"
    echo "2. Deploy app_version.json to the backend"
else
    echo "❌ Build failed - APK not found!"
    exit 1
fi

