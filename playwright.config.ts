import { defineConfig, devices } from '@playwright/test'

export const BASE_URL = 'http://127.0.0.1:8097'
export const SU = { email: 'e2e@test.local', password: 'e2e-root-pass-123' }

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: BASE_URL, trace: 'retain-on-failure', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && sh e2e/server.sh',
    url: `${BASE_URL}/api/health`,
    env: { E2E_SU_EMAIL: SU.email, E2E_SU_PASSWORD: SU.password },
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
