import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : undefined,
    timeout: 30000,
    expect: { timeout: 8000 },
    outputDir: 'test-results',
    reporter: [
        ['dot'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }]
    ],
    use: {
        baseURL: 'http://127.0.0.1:4174',
        actionTimeout: 10000,
        navigationTimeout: 15000,
        reducedMotion: 'reduce',
        serviceWorkers: 'block',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        launchOptions: executablePath ? { executablePath } : {}
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
    ],
    webServer: [
        {
            command: 'node scripts/preview-pages.js --port 4174',
            url: 'http://127.0.0.1:4174',
            reuseExistingServer: !process.env.CI,
            timeout: 30000
        },
        {
            command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
            url: 'http://127.0.0.1:5174',
            reuseExistingServer: !process.env.CI,
            timeout: 30000
        }
    ]
});
