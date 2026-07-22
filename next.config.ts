import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
  "/assets/players/[year]/[filename]": ["./assets/players/**/*"],
  "/assets/managers/[filename]": ["./assets/managers/*.png"],
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
      pathname: "/assets/managers/**",
    },
  ],

  remotePatterns: [
    {
      protocol: "https",
      hostname: "assets.trophyxi.com",
      pathname: "/assets/**",
    },
    {
      protocol: "https",
      hostname: "upload.wikimedia.org",
    },
  ],
},
};

export default nextConfig;
