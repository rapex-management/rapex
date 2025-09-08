import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const { business_category_id } = req.query;
    
    // Build query string if business_category_id is provided  
    const queryString = business_category_id ? `?business_category_id=${business_category_id}` : '';
    
    const response = await fetch(`${backendUrl}/api/data/business-types/${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // Forward the response
  res.status(response.status).json(data);
  return;

  } catch (error) {
    console.error('Business types proxy error:', error);
  res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
  });
  return;
  }
}
