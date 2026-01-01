# NeuroChess Mobile

Expo React Native port of the NeuroChess puzzle trainer.

## Setup

```bash
cd mobile
npm install
npx expo start
```

## Build

```bash
# Preview APK
eas build --platform android --profile preview

# Production
eas build --platform all --profile production
```

## Structure

- `app/` - File-based routes (Expo Router)
- `src/components/` - UI components
- `src/hooks/` - Custom React hooks
- `src/constants/` - App constants
- `assets/` - Images and icons

## TODO

- [ ] Download piece images to `assets/pieces/`
- [ ] Implement SQLite database service
- [ ] Connect to puzzle database
- [ ] Add promotion modal
- [ ] Add sound effects
