import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingMessage } from 'http';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000';
    const targetUrl = `${backendUrl}/api/shop-products/bulk-upload/`;
    
    console.log(`Proxying bulk upload request to: ${targetUrl}`);
    
    // Create FormData and stream the request
    const formData = new FormData();
    
    // Read the incoming request body as chunks
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    await new Promise((resolve) => {
      req.on('end', resolve);
    });
    
    const buffer = Buffer.concat(chunks);
    
    // Forward headers
    const headers: Record<string, string> = {};
    
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    console.log(`Request headers:`, req.headers);
    
    // Forward the request as-is
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': req.headers['content-type'] || '',
        'Content-Length': buffer.length.toString(),
      },
      body: buffer,
    });

    console.log(`Backend response status: ${response.status}`);

    const responseData = await response.text();
    console.log(`Backend response:`, responseData);
    
    try {
      // Try to parse as JSON
      const jsonData = JSON.parse(responseData);
      res.status(response.status).json(jsonData);
    } catch {
      // If not JSON, return as text
      res.status(response.status).send(responseData);
    }
    
  } catch (error) {
    console.error('Bulk upload proxy error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};