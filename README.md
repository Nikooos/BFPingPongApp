# BF Ping Pong App

A mobile application for managing ping pong games and tournaments, built with Expo and React Native.

## 🏓 Features

- Track ping pong matches
- Player statistics
- Tournament management
- Real-time scoring
- Match history

## 📱 Tech Stack

- **Framework**: Expo (Managed Workflow)
- **Language**: JavaScript/TypeScript
- **Platform**: iOS & Android
- **Linting**: ESLint with Expo config

## 🚀 Getting Started

### Prerequisites

- Node.js (16.x or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio/Android Emulator (for Android development)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/BFPingPongApp.git
   cd BFPingPongApp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Install Expo CLI globally (if not already installed):
   ```bash
   npm install -g @expo/cli
   ```

### Running the App

1. Start the development server:

   ```bash
   npx expo start
   ```

2. Open the app on your device:
   - **iOS**: Press `i` to open iOS Simulator
   - **Android**: Press `a` to open Android Emulator
   - **Physical Device**: Scan QR code with Expo Go app

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

## 📁 Project Structure

```
BFPingPongApp/
├── app/                    # App screens and navigation
├── components/             # Reusable components
├── assets/                 # Images, fonts, etc.
├── constants/              # App constants
├── hooks/                  # Custom React hooks
├── utils/                  # Utility functions
├── app.json               # Expo configuration
├── package.json           # Dependencies and scripts
└── eslint.config.js       # ESLint configuration
```

## 🛠 Development

### Code Style

This project uses ESLint with Expo's recommended configuration. Run linting with:

```bash
npm run lint
```

### Environment Variables

Create a `.env` file in the root directory for environment-specific variables:

```
EXPO_PUBLIC_API_URL=your_api_url_here
```

## 📦 Building for Production

### Development Build

```bash
npx expo build
```

### Production Build

```bash
# For iOS
npx expo build:ios

# For Android
npx expo build:android
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

**Project won't start:**

```bash
# Clear cache and restart
npx expo start --clear
```

**Dependency issues:**

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
npx expo install --fix
```

**iOS/Android build issues:**

- Ensure you have the latest Expo CLI
- Check that your development environment is properly set up
- Verify app.json configuration

## 📞 Support

If you encounter any issues, please:

1. Check the troubleshooting section above
2. Search existing issues on GitHub
3. Create a new issue with detailed information

---

Made with ❤️ for ping pong enthusiasts
