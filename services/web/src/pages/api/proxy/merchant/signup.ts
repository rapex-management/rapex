import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
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
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('Merchant signup proxy error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
