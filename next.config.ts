import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/assets/players/[year]/[filename]": ["./assets/players/**/*"],
    "/assets/managers/[filename]": ["./assets/managers/*.png"],
    "/assets/opponent/[filename]": ["./assets/players/opponent/**/*"],
  },
  images: {
    localPatterns: [
      {
        pathname: "/assets/players/**",
      },
      {
        pathname: "/assets/winners/**",
      },
      {
        pathname: "/assets/opponent/**",
      },
      {
        pathname: "/assets/managers/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
};

export default nextConfig;
