import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://trophyxi.com";

  return [
    {
      url: baseUrl,
    },
    {
      url: `${baseUrl}/database`,
    },
    {
      url: `${baseUrl}/engineering`,
    },
    {
      url: `${baseUrl}/play`,
    },
  ];
}