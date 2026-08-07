import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML layout for Expo Router static web export.
 * Injects PWA Add-To-Homescreen meta tags and iOS apple-touch-icon links.
 *
 * IMPORTANT: body background-color must match the tab bar surface color (#ffffff light / #1e293b dark)
 * so the iOS home indicator zone below the tab bar is invisible (same color), not a black bar.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover fills the full iPhone screen including notch & home indicator */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <title>Spend Zen - Personal Finance &amp; AI Expense Tracker</title>
        <meta name="description" content="Financial mindfulness at your fingertips. Track expenses, balance budgets, and evaluate purchase affordability with AI." />

        {/* Favicon & PWA Home Screen Icons */}
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png" />

        {/* iOS PWA — status bar overlays content so the whole screen is app */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Spend Zen" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* theme-color = the color shown in the chrome strip outside the viewport.
            Must match Colors.surface (#ffffff light / #1e293b dark) to hide the black gap. */}
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1e293b" media="(prefers-color-scheme: dark)" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          *, *::before, *::after { box-sizing: border-box; }

          /* html & body background must match the tab-bar surface color.
             This fills the home-indicator zone below the tab bar so it looks seamless. */
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            /* Light mode: match Colors.surface = #ffffff */
            background-color: #ffffff;
          }

          #root {
            height: 100%;
            background-color: #f8fafc;
          }

          @media (prefers-color-scheme: dark) {
            html, body {
              /* Dark mode: match Colors.surface = #1e293b */
              background-color: #1e293b;
            }
            #root {
              background-color: #0f172a;
            }
          }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
