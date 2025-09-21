import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000';
    const targetUrl = `${backendUrl}/api/shop-products/csv-template/`;
    
    // Forward the authorization header
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    console.log(`Proxying CSV template request to: ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });

    console.log(`Backend response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error: ${response.status} ${errorText}`);
      res.status(response.status).json({ 
        error: `Backend error: ${response.status}`,
        details: errorText 
      });
      return;
    }

    // Get the CSV content
    const csvContent = await response.text();
    console.log(`CSV content length: ${csvContent.length}`);
    
    // Set proper headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="shop_products_template.csv"');
    
    // Send the CSV content
    res.status(200).send(csvContent);
    return;
    
  } catch (error) {
    console.error('CSV template proxy error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
}