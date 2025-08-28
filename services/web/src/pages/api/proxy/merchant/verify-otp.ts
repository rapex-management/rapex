import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    // Forward the request to Django backend
    const response = await fetch(`${backendUrl}/api/auth/merchant/verify-otp/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.text();

    // Forward the response
    res.status(response.status);
    
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch {
      res.send(data);
    }

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
