import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      isProduction && obfuscatorPlugin({
        include: ['src/**/*.js', 'src/**/*.ts', 'src/**/*.jsx', 'src/**/*.tsx'],
        exclude: [/node_modules/],
        apply: 'build',
        options: {
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 1,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 1,
          debugProtection: true,
          debugProtectionInterval: 4000,
          disableConsoleOutput: true,
          identifierNamesGenerator: 'hexadecimal',
          log: false,
          numbersToExpressions: true,
          renameGlobals: false,
          selfDefending: true,
          simplify: true,
          splitStrings: true,
          splitStringsChunkLength: 5,
          stringArray: true,
          stringArrayCallsTransform: true,
          stringArrayEncoding: ['rc4'],
          stringArrayIndexShift: true,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          stringArrayWrappersCount: 5,
          stringArrayWrappersChainedCalls: true,
          stringArrayWrappersParametersMaxCount: 5,
          stringArrayWrappersType: 'function',
          stringArrayThreshold: 1,
          transformObjectKeys: true,
          unicodeEscapeSequence: false
        },
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom', 'zustand'],
    },
    optimizeDeps: {
      entries: ['index.html', 'src/**/*.{ts,tsx}'],
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'zustand',
        'zustand/react',
        'zustand/react/shallow',
        'framer-motion',
        '@supabase/supabase-js',
        'socket.io-client',
        'lucide-react',
      ],
    },
    // Override PostCSS config secara inline agar TIDAK membaca
    // file postcss.config.js dari parent directory (C:\Users\ASUS\)
    // yang berisi tailwindcss v3 dan menyebabkan konflik dengan v4.
    // Tailwind v4 dihandle via @tailwindcss/vite plugin di atas.
    css: {
      postcss: {
        plugins: [],
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'zustand'],
            motion: ['framer-motion'],
            realtime: ['socket.io-client'],
            icons: ['lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 650,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR === 'true' ? false : true,
      // Saat HMR dimatikan, watcher juga dimatikan supaya Chrome tidak reload terus-menerus.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
