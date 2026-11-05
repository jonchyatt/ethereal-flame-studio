import { defineConfig } from 'playwright/test'

const port = process.env.G_PORT ?? '3108'
export default defineConfig({
  testDir: './e2e',
  testMatch: /glow-(vortex|layered)\.spec\.ts/,
  timeout: 120_000,
  workers: 1,
  outputDir: process.env.GLOW_ARTIFACT_DIR ?? './e2e-results/glow',
  metadata: { glowRoute: '/mist' },
  use: {
    baseURL: process.env.BASE_URL ?? `http://127.0.0.1:${port}`,
    headless: true,
    launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
  },
  webServer: process.env.BASE_URL ? undefined : {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
