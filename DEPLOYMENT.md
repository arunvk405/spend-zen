# Deployment Guide: App Store & Play Store

This guide walks you through deploying your **FinTrack** app using **EAS (Expo Application Services)**. This is the standard and easiest way to build and submit Expo apps.

## 📋 Prerequisites

1.  **Expo Account**: Sign up at [expo.dev](https://expo.dev).
2.  **Google Play Console Account**: ($25 one-time fee) for Android deployment.
3.  **Apple Developer Account**: ($99/year) for iOS deployment.
4.  **EAS CLI**: Install globally on your machine:
    ```bash
    npm install -g eas-cli
    ```

---

## 🛠️ Step 1: Login & Configure

1.  **Login to EAS**:
    ```bash
    eas login
    ```

2.  **Configure the Project**:
    Run this command in your project root to create an `eas.json` file:
    ```bash
    eas build:configure
    ```
    *   Select `All` when asked which platforms to configure.

3.  **Check `app.json`**:
    Ensure your `ios.bundleIdentifier` and `android.package` are unique (e.g., `com.yourname.fintrack`).

---

## 🤖 Step 2: Build for Android (Play Store)

1.  **Run the Build Command**:
    ```bash
    eas build --platform android --profile production
    ```
    *   This will generate an **AAB (Android App Bundle)** file.
    *   EAS handles the signing credentials (keystore) for you automatically.

2.  **Submit to Play Store**:
    *   Once the build finishes, you can download the `.aab` file.
    *   Upload this file to the **Production** or **Internal Testing** track in your Google Play Console.
    *   *Alternatively, use `eas submit --platform android` to upload automatically.*

---

## 🍎 Step 3: Build for iOS (App Store)

*Note: You can build for iOS even on Windows using EAS Cloud Builds.*

1.  **Run the Build Command**:
    ```bash
    eas build --platform ios --profile production
    ```
    *   You will need to sign in with your Apple ID when prompted.
    *   EAS will generate all necessary certificates and provisioning profiles.

2.  **Submit to App Store Connect**:
    *   Once the build is complete, use the submit command:
        ```bash
        eas submit --platform ios
        ```
    *   This sends your binary directly to **TestFlight** / **App Store Connect**.

---

## 🔄 Updating Your App (OTA Updates)

For small changes (JavaScript/CSS/Image changes), you don't need to rebuild the native app! You can push an "Over The Air" update instantly.

1.  **Install `expo-updates`** (if not already installed):
    ```bash
    npx expo install expo-updates
    eas update:configure
    ```

2.  **Publish an Update**:
    ```bash
    eas update --branch production --message "Fixed delete bug"
    ```
    *   Users will receive this update the next time they open the app.

---

## ⚠️ Important Notes

*   **Icons & Splash Screens**: Ensure your `assets/icon.png` and `assets/splash.png` are high quality before building.
*   **Permissions**: Since we aren't using many native permissions (like Camera/Location), your app review process should be straightforward.
*   **Testing**: Always test on a physical device using `eas build --profile development --platform android/ios` first!
