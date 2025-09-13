import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000';
    
    // Forward the Google OAuth request to Django backend
    const response = await fetch(`${backendUrl}/api/auth/admin/google/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Forward the response
    res.status(response.status).json(data);

  } catch (error) {
    console.error('Admin Google OAuth proxy error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      detail: 'Failed to process Google OAuth request'
    });
  }
}
