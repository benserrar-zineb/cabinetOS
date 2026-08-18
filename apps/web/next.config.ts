import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  watchOptions: {
    pollIntervalMs: 1000,
  },
  // Passerelle vers l'API NestJS : le navigateur appelle /api/... sur le meme
  // site que le frontend (port 3001), Next.js relaie vers le backend reel
  // (port 3000 par defaut). Evite toute configuration CORS cote backend --
  // les cookies de session circulent comme s'il n'y avait qu'un seul site.
  async rewrites() {
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default withNextIntl(nextConfig);
