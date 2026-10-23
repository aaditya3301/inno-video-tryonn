import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Secrets are supplied at runtime, never bundled into the deployable output.
  outputFileTracingExcludes: {
    "/*": ["./keys.csv", "./.env", "./.env.*"],
  },
  // Camera access needs a secure context; allow it for this origin only.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Permissions-Policy", value: "camera=(self)" }],
      },
    ];
  },
};

export default nextConfig;
