# Build APK via PowerShell / Android Studio Terminal

Jika Android Studio sudah memasang Gradle wrapper setelah sync, jalankan:

```powershell
.\gradlew.bat assembleDebug
```

Output APK biasanya ada di:

```text
app\build\outputs\apk\debug\app-debug.apk
```

Jika `gradlew.bat` belum ada, buka project ini di Android Studio lalu tunggu Gradle Sync. Android Studio dapat menjalankan build langsung dari menu Build APK.
