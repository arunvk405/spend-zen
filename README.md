# 💚 Spend Zen — Personal Expense Tracker

> **Financial mindfulness at your fingertips.** Track spending across Cash, Bank, and Credit Card accounts. Plan next month's budget, visualize your spending, and keep your net worth accurate — all in one place.

---

## 📸 Features

- 🔐 **Google Sign-In** — Secure authentication via Firebase
- 💳 **Multi-Account Tracking** — Cash, Bank Account, and Credit Card
- 📊 **Reports & Charts** — Pie charts for expense categories and income sources
- 📅 **Next Month Planning** — Project upcoming expenses before the month starts
- 🔄 **Credit Card Cycle Reset** — Clear credit card dues at end of billing cycle without affecting net worth
- 🌙 **Dark / Light Mode** — Respects your system preference
- ☁️ **Cloud Sync** — All data stored in Firebase Firestore (real-time, cross-device)
- 📱 **Cross-Platform** — Runs on Web, Android, and iOS from a single codebase

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) (SDK 54) + [React Native](https://reactnative.dev) |
| Navigation | [Expo Router](https://expo.github.io/router) (file-based routing) |
| Database | [Firebase Firestore](https://firebase.google.com/docs/firestore) |
| Auth | [Firebase Auth](https://firebase.google.com/docs/auth) (Google Sign-In) |
| Charts | [react-native-chart-kit](https://github.com/indiespirit/react-native-chart-kit) |
| Icons | [lucide-react-native](https://lucide.dev) |
| Language | TypeScript |

---

## ⚙️ Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) — v18 or higher
- [npm](https://www.npmjs.com/) — comes with Node.js
- [Git](https://git-scm.com/)
- **Expo Go** app on your phone (for mobile testing):
  - [Android — Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [iOS — App Store](https://apps.apple.com/app/expo-go/id982107779)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/arunvk405/spend-zen.git
cd spend-zen
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

> This project uses Firebase as its backend. You need your own Firebase project.

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Firestore Database** (start in production mode).
3. Enable **Authentication** → Google Sign-In provider.
4. Register a **Web App** and copy the config.
5. Open `src/database/firebaseConfig.ts` and replace the config:

```ts
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

6. Set up **Firestore Security Rules** (copy from `firestore.rules`):

```bash
# Using Firebase CLI
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

---

## 🌐 Run on Web (Browser)

```bash
npm run web
```

- Opens at **http://localhost:8081** in your browser.
- Works as a full PWA (Progressive Web App) — can be installed from browser.
- Best for quick development and testing without a phone.

> ⚠️ Google Sign-In on web requires your Firebase project's **Authorized Domains** to include `localhost`. Check Firebase Console → Authentication → Settings → Authorized Domains.

---

## 📱 Run on Mobile (Expo Go — No Build Required)

### Start the Development Server

```bash
npm start
```

This launches **Metro Bundler** and shows a QR code in the terminal.

### Connect Your Phone

1. Open the **Expo Go** app on your phone.
2. Scan the QR code shown in the terminal.
3. The app will load instantly on your device.

> 💡 Your phone and PC must be on the **same Wi-Fi network** for this to work.

---

## 🤖 Run on Android Emulator

```bash
# Start an Android Virtual Device (AVD) first, then:
npm run android
```

Or press **`a`** in the terminal after running `npm start`.

> Requires [Android Studio](https://developer.android.com/studio) with an AVD configured.

---

## 🍎 Run on iOS Simulator (macOS only)

```bash
npm run ios
```

Or press **`i`** in the terminal after running `npm start`.

> Requires [Xcode](https://developer.apple.com/xcode/) (macOS only).

---

## 🖥️ Run on Web + Mobile Simultaneously

```bash
npm start
```

After Metro starts:

| Key | Action |
|---|---|
| `w` | Open in **Web browser** |
| `a` | Open in **Android** emulator |
| `i` | Open in **iOS** simulator |
| `r` | Reload the app |
| `m` | Toggle menu |
| `?` | Show all shortcuts |

Scan the QR code with Expo Go for physical device + browser at the same time.

---

## 📦 Build for Production

### Web (Static Export)

```bash
npm run build
```

Output is in the `dist/` folder — deploy anywhere (Netlify, Vercel, Firebase Hosting).

#### Deploy to Netlify

```bash
# Already configured via netlify.toml
# Just push to GitHub and connect repo to Netlify
```

#### Deploy to Vercel

```bash
# Already configured via vercel.json
vercel --prod
```

### Mobile (Native App)

Install EAS CLI:

```bash
npm install -g eas-cli
eas login
eas build:configure
```

**Android (APK/AAB):**
```bash
eas build --platform android --profile production
```

**iOS (IPA):**
```bash
eas build --platform ios --profile production
```

> See `DEPLOYMENT.md` for full App Store / Play Store submission guide.

---

## 📁 Project Structure

```
spend-zen/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Tab navigation screens
│   │   ├── index.tsx       # Home dashboard
│   │   ├── transactions.tsx# Transaction history
│   │   ├── reports.tsx     # Charts & analytics
│   │   └── settings.tsx    # Settings & categories
│   └── _layout.tsx         # Root layout
├── src/
│   ├── components/         # Reusable UI components
│   ├── context/
│   │   ├── AuthContext.tsx # Firebase auth state
│   │   └── FinanceContext.tsx # Transactions & balance logic
│   ├── database/
│   │   ├── db.ts           # Firestore CRUD operations
│   │   └── firebaseConfig.ts # Firebase initialization
│   ├── models/
│   │   └── index.ts        # TypeScript types & constants
│   └── theme/
│       └── colors.ts       # Color palette (light/dark)
├── assets/                 # Icons, splash, images
├── app.json                # Expo app config
├── firestore.rules         # Firestore security rules
├── netlify.toml            # Netlify deployment config
├── vercel.json             # Vercel deployment config
└── DEPLOYMENT.md           # App store deployment guide
```

---

## 💡 Key Concepts

### Credit Card Handling

Credit card expenses are tracked **separately** from your net worth:

- Adding an expense to **Credit Card** does **not** reduce your Net Balance.
- The Credit Card card shows your **expected due amount** for the billing cycle.
- Use the **Reset icon (↺)** on the Credit Card account card to clear all credit card transactions when starting a new billing cycle.

### Account Types

| Account | Description |
|---|---|
| 💵 Cash in Hand | Physical cash transactions |
| 🏦 Bank Account | Bank debits/credits |
| 💳 Credit Card | Purchases tracked separately as "next due" |

---

## 🐛 Troubleshooting

| Issue | Fix |
|---|---|
| `Metro Bundler failed to start` | Run `npm install` again, then retry |
| QR code not working | Ensure phone and PC are on same Wi-Fi |
| Google Sign-In fails on web | Add `localhost` to Firebase Authorized Domains |
| Firestore permission denied | Check `firestore.rules` and deploy them |
| `npm start` shows blank screen | Press `r` to reload or clear Expo Go cache |

---

## 📄 License

This project is private. All rights reserved © 2026 Arun V.K
