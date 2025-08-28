import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).end()
  try{
    const backendRes = await fetch('http://backend:8000/api/auth/admin/login/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(req.body)
    })
    const data = await backendRes.json()
    res.status(backendRes.status).json(data)
  }catch(e:any){
    res.status(500).json({detail: 'proxy error'})
  }
}
