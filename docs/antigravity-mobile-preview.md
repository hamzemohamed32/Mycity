# Antigravity Mobile Preview

Use Antigravity with these extensions installed:

- `Dart-Code.dart-code`
- `Dart-Code.flutter`
- `lirobi.phone-preview`

This repo includes `.vscode/extensions.json`, so Antigravity should recommend them automatically. Manual install commands:

```powershell
antigravity --install-extension Dart-Code.dart-code
antigravity --install-extension Dart-Code.flutter
antigravity --install-extension lirobi.phone-preview
```

Recommended local flow:

1. Run task `MyCity: backend stack up`.
2. Run task `MyCity: mobile web build`.
3. Run task `MyCity: mobile preview server`.
4. Run command `Mobile Preview: Show`.

The workspace setting `mobile-preview.url` points the extension directly to the real Flutter app at `http://127.0.0.1:8082/`.

Use `http://127.0.0.1:8082/mobile-preview.html` only in a normal browser when you want the custom MyCity preview wrapper. Do not use that wrapper inside the Phone Preview extension, because the extension already provides the phone frame.

For live Flutter debugging, use launch configuration `MyCity Mobile Preview (Chrome)`.

Demo accounts:
- `citizen@mycity.local` / `Password123!`
- `admin@mycity.local` / `Password123!`
- `mayor@mycity.local` / `Password123!`
