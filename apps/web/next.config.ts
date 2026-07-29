import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  watchOptions: {
    pollIntervalMs: 1000,
  },
};

export default withNextIntl(nextConfig);