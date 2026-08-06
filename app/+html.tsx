import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML layout for Expo Router static web export.
 * Injects PWA Add-To-Homescreen meta tags and iOS apple-touch-icon links.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>Spend Zen - Personal Finance & AI Expense Tracker</title>
        <meta name="description" content="Financial mindfulness at your fingertips. Track expenses, balance budgets, and evaluate purchase affordability with AI." />

        {/* Cool Neon Favicon & PWA Home Screen Icons */}
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png" />

        {/* iOS Web App Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Spend Zen" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#064e3b" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
