import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        // Cache the app shell and static assets
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Don't cache PDF worker (it's large and changes rarely)
        globIgnores: ["**/pdf.worker*"],
        // Network-first for HTML (always get fresh app shell)
        navigationPreload: false,
        runtimeCaching: [
          {
            // Event Safety Pages: Cache-first (works offline for attendees!)
            urlPattern: ({ url }) => {
              const pathname = url.pathname;
              // Match /:societySlug/:eventSlug pattern (two path segments)
              const segments = pathname.split("/").filter(Boolean);
              return (
                segments.length === 2 &&
                !pathname.startsWith("/auth") &&
                !pathname.startsWith("/society") &&
                !pathname.startsWith("/dashboard") &&
                !pathname.startsWith("/admin") &&
                !pathname.startsWith("/invite")
              );
            },
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "event-safety-pages",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
          {
            // Supabase API: Network-first, fallback to cache
            urlPattern: ({ url }) => url.hostname.includes("supabase.co"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
            },
          },
          {
            // Google Fonts
            urlPattern: ({ url }) => url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com"),
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
        // CRITICAL: Never cache OAuth/auth callback routes (prevents login loops)
        navigateFallbackDenylist: [
          /^\/auth/,
          /^\/invite/,
          /.*access_token.*/,
          /.*refresh_token.*/,
        ],
      },
      manifest: {
        name: "OurSafeBase",
        short_name: "OurSafeBase",
        description: "Making events safer for student societies",
        theme_color: "#2C5F6F",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        categories: ["utilities", "productivity"],
      },
      // Disable in development to avoid service worker conflicts
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-accordion',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          'pdf-vendor': ['react-pdf', 'pdfjs-dist'],
          'chart-vendor': ['recharts'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'date-fns',
    ],
    exclude: ['pdfjs-dist'],
  },
}));
