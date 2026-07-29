import { spawn, ChildProcess } from 'child_process';

const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess: ChildProcess;

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // pas encore pret
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Le serveur Next.js ne demarre pas a temps');
}

describe('i18n locales (e2e)', () => {
  beforeAll(async () => {
    serverProcess = spawn(`pnpm exec next dev -p ${PORT}`, {
      cwd: __dirname + '/..',
      stdio: 'ignore',
      shell: true,
    });
    await waitForServer(`${BASE_URL}/fr`, 30000);
  }, 40000);

  afterAll(() => {
    serverProcess.kill();
  });

  it('affiche la page en francais avec dir="ltr"', async () => {
    const res = await fetch(`${BASE_URL}/fr`);
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('Bienvenue sur CabinetOS');
  });

  it('affiche la page en arabe avec dir="rtl"', async () => {
    const res = await fetch(`${BASE_URL}/ar`);
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('مرحبا بكم في CabinetOS');
  });
});
