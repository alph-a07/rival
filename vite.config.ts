import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // we supply our own manifest, see index.html
      includeAssets: [
        "brand/favicon.ico",
        "brand/dark/favicon.svg",
        "brand/light/favicon.svg",
        "brand/safari-pinned-tab.svg",
        "brand/dark/apple-touch-icon.png",
        "brand/light/apple-touch-icon.png",
        "brand/dark/manifest.webmanifest",
        "brand/light/manifest.webmanifest",
        "brand/dark/icons/icon-192.png",
        "brand/dark/icons/icon-512.png",
        "brand/light/icons/icon-192.png",
        "brand/light/icons/icon-512.png",
        "brand/dark/icons/icon-192-maskable.png",
        "brand/dark/icons/icon-512-maskable.png",
        "brand/light/icons/icon-192-maskable.png",
        "brand/light/icons/icon-512-maskable.png",
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webmanifest}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.fontshare\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "fontshare-css",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.fontshare\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "fontshare-files",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});
