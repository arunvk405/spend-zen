import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML layout for Expo Router static web export.
 *
 * KEY: We use a JS-driven --app-height CSS variable to track the true
 * innerHeight of the window. When Safari's toolbar expands/collapses
 * the visible area changes, and window.innerHeight reflects it immediately.
 * 100dvh is a CSS fallback but doesn't always update fast enough on iOS Safari.
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
        <link rel="manifest" href="/manifest.json" />
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
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1e293b" media="(prefers-color-scheme: dark)" />

        <ScrollViewStyleReset />

        {/*
          --app-height is updated by the script below to always equal window.innerHeight.
          This is the gold-standard fix for iOS Safari's collapsible toolbar:
          window.innerHeight shrinks when the address bar expands and grows when it collapses,
          so our layout snaps to exactly the visible screen with no gaps.
        */}
        <style dangerouslySetInnerHTML={{ __html: `
          *, *::before, *::after { box-sizing: border-box; }

          :root {
            --app-height: 100dvh;
          }

          html {
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            height: 100%;
          }

          body {
            margin: 0;
            padding: 0;
            /* Use the JS-driven variable; fallback to 100dvh for SSR */
            height: var(--app-height, 100dvh);
            max-height: var(--app-height, 100dvh);
            overflow: hidden;
            background-color: #ffffff;
          }

          #root {
            height: var(--app-height, 100dvh);
            max-height: var(--app-height, 100dvh);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            background-color: #f8fafc;
          }

          @media (prefers-color-scheme: dark) {
            html, body { background-color: #1e293b; }
            #root { background-color: #0f172a; }
          }
        ` }} />

        {/* Inline script: sets --app-height on load and every resize / orientation change */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function () {
            function setAppHeight() {
              document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
            }
            setAppHeight();
            window.addEventListener('resize', setAppHeight);
            window.addEventListener('orientationchange', function () {
              // orientationchange fires before the new size is ready; wait a tick
              setTimeout(setAppHeight, 100);
            });
          })();
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
