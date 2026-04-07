import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,



  turbopack: {
    // Silence the workspace-root detection warning
    root: __dirname,
  },
};

export default nextConfig;
