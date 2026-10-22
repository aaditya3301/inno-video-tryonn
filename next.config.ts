import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
