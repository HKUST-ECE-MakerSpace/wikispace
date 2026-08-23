import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/**
 * @param {import('next').NextConfig} config
 */
const config = {
  reactStrictMode: true,
  // `output: standalone` produces the relocatable `.next/standalone`
  // server.js the Nix package runs. Kept off by default so plain
  // `next start` (bun run start) keeps working for local/PM2 deploys;
  // the Nix build sets NEXT_OUTPUT_STANDALONE=1.
  ...(process.env.NEXT_OUTPUT_STANDALONE === '1' ? { output: 'standalone' } : {}),
};

export default withMDX(config);
