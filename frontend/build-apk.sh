#!/bin/bash
# RestaurantApp APK Build Script
# Run this on a machine with Android SDK installed (x86_64 or ARM with compatible SDK)

set -e

echo "=== RestaurantApp APK Builder ==="
echo ""

# Check prerequisites
if [ -z "$JAVA_HOME" ]; then
    echo "ERROR: JAVA_HOME not set. Install JDK 17+ and set JAVA_HOME."
    exit 1
fi

if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    echo "ERROR: ANDROID_HOME or ANDROID_SDK_ROOT not set. Install Android SDK."
    exit 1
fi

echo "Java: $(java -version 2>&1 | head -1)"
echo "ANDROID_HOME: ${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
echo ""

# Step 1: Build web assets
echo "[1/4] Building web assets..."
cd "$(dirname "$0")"
npx expo export --platform web
echo "Web assets built to dist/"

# Step 2: Sync Capacitor
echo "[2/4] Syncing Capacitor..."
npx cap sync android
echo "Capacitor synced!"

# Step 3: Build debug APK
echo "[3/4] Building debug APK..."
cd android
./gradlew assembleDebug

# Step 4: Copy APK
echo "[4/4] Copying APK..."
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    cp "$APK_PATH" "../RestaurantApp-debug.apk"
    echo ""
    echo "=== SUCCESS ==="
    echo "APK built: RestaurantApp-debug.apk"
    echo "Size: $(du -h ../RestaurantApp-debug.apk | cut -f1)"
    echo ""
    echo "To install on device: adb install RestaurantApp-debug.apk"
else
    echo "ERROR: APK not found at $APK_PATH"
    exit 1
fi

# Optional: Build release APK
echo ""
echo "For a release APK, run:"
echo "  cd android && ./gradlew assembleRelease"
echo ""
echo "For a signed release APK, configure signing in android/app/build.gradle"
