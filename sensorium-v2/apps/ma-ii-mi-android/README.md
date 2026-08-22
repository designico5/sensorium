# MA-II-MI for Android

Native Jetpack Compose companion for the Sensorium MA-II-MI spatial performance workflow.

## Included demo flows

- **Room** — a high-contrast spatial rig overview designed for the S23 Ultra display.
- **Patch** — a deliberately gated preview → arm → commit → undo demonstration. This demo does not write to MIDI, network, or audio hardware.
- **Audition** — on-device cue-tone audition UX for trigger selection. Licensed source audio must be supplied and cleared separately.
- **Downloads** — transparent build/signing status. The Android debug APK is debug-signed for local installation; Windows, macOS, and iOS show only their actual pipeline prerequisites.

## Open and build

Requirements:

- JDK 17
- Android SDK platform 37 and Build Tools 36.0.0
- Gradle 9.5.0 through the checksum-pinned wrapper

1. Open this folder in Android Studio.
2. Select a physical Samsung S23 Ultra or an Android 26+ emulator.
3. Ensure `JAVA_HOME` points to JDK 17 and `local.properties` contains the local Android SDK path.
4. On a space-constrained system, optionally set `SENSORIUM_ANDROID_BUILD_ROOT` to a roomy build directory (for example `E:\SensoriumTooling\android-build`). The repository remains portable when this variable is absent.
5. Run the `app` configuration, or execute the full local quality gate:

   ```powershell
   .\gradlew.bat clean assembleDebug testDebugUnitTest lintDebug assembleDebugAndroidTest assembleRelease
   ```

## APK artifact

After a successful build, the debug-signed APK is created at:

```text
app\build\outputs\apk\debug\app-debug.apk
```

This is a development artifact signed with Android's local debug key, not a production-signed Play Store, Samsung Galaxy Store, notarized macOS, or Apple-signed distribution package. The debug build uses the separate package ID `com.sensorium.maiimi.debug` so it cannot overwrite a later production release.

Before distribution, verify the generated file with Android SDK `apksigner verify --verbose --print-certs`. Runtime installation and the API-26 smoke test still require an attached physical device or emulator; build-only checks cannot replace that device test.
