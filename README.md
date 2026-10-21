# PR 6181 native extension evidence — 2026-10-22

Head 0ad4acebe4c9376e929e6b2c1f515be6b79afe0f; base b0f3db1d6. Isolated iPhone 17 / iOS 27.0 system simulator.

The generated controller is unmodified production code. Expo payload types are copied verbatim. Fixture bundle identity, App Group and URL scheme are test configuration, not production signing evidence.

- success.png: real system share sheet -> embedded extension -> public.data saved as wechat-file.zip (2048 B, application/zip); the test URL scheme is deliberately unhandled, showing the existing manual-open feedback. This path is unchanged by the final failure-copy edit.
- read-failure.png: the same controller running on iOS with a controlled NSExtensionContext supplying a missing file URL; receive-failure alert, read-source / NSCocoaErrorDomain:260 / public.file-url. This failure injection bypasses system share-sheet provider preflight.
- save-failure-dark.png: the same controlled native entry, valid data and a temporarily non-writable test destination; save-failure alert in Dark, write-data / NSCocoaErrorDomain:513 / public.data. Permissions restored afterwards.

Full Cindy App build failed in ExpoModulesJSI.swiftinterface: cannot find type __ObjC::expo. Full-app pickup/upload, actual third-party apps and signed-device acceptance remain outstanding. No claim that the App Store incident is resolved.
