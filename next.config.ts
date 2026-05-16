import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude heavy native packages from client bundle — they're only needed
  // server-side or loaded dynamically at runtime via WASM
  serverExternalPackages: ["onnxruntime-node"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' blob: https://huggingface.co https://*.hf.co https://cdn-lfs.hf.co https://cdn-lfs-us-1.hf.co; worker-src 'self' blob:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
