import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Desativa telemetria e verificações de rede externas
  experimental: {},
};

// Desativa telemetria do Next.js (evita timeouts offline)
process.env.NEXT_TELEMETRY_DISABLED = '1';

export default nextConfig;
