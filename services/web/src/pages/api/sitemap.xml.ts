import { NextApiRequest, NextApiResponse } from 'next';

export default async function sitemap(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://rapex.com';
  
  const staticPages = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date().toISOString(),
      changeFreq: 'daily',
      priority: 1.0
    },
    {
      url: `${baseUrl}/merchant/signup`,
      lastModified: new Date().toISOString(),
      changeFreq: 'monthly',
      priority: 0.8
    }
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map(page => {
      return `
    <url>
      <loc>${page.url}</loc>
      <lastmod>${page.lastModified}</lastmod>
      <changefreq>${page.changeFreq}</changefreq>
      <priority>${page.priority}</priority>
    </url>
  `;
    })
    .join('')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();
  return;
}

export { sitemap };
