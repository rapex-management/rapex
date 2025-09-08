import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    // Forward the request body as JSON to the backend
    const response = await fetch(`${backendUrl}/api/auth/merchant/signup/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Forward the response with proper status
  res.status(response.status).json(data); return;

  } catch (error) {
    console.error('Merchant signup proxy error:', error);
  res.status(500).json({ 
      message: 'Internal server error',
      detail: error instanceof Error ? error.message : 'Unknown error'
  });
  return;
  }
}
