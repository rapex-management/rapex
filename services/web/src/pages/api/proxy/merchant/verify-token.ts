import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    // Forward the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ detail: 'No authorization token provided' });
      return;
    }

    const response = await fetch(`${backendUrl}/api/auth/merchant/verify-token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    const data = await response.json();

    // Forward the response
  res.status(response.status).json(data); return;

  } catch (error) {
    console.error('Token verification proxy error:', error);
  res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
  });
  return;
  }
}
