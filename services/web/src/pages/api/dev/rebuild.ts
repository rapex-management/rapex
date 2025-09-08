import fs from 'fs'
import path from 'path'
import type { NextApiRequest, NextApiResponse } from 'next'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { file, timestamp } = req.body || {}
    
    // Update nonce to trigger rebuild
    const noncePath = path.join(process.cwd(), 'src', 'dev', 'nonce.ts')
    const newNonce = timestamp || Date.now().toString()
    const content = `export const nonce = '${newNonce}'\n`
    fs.writeFileSync(noncePath, content, 'utf8')
    
    // Attempt to clear Next.js cache (Windows & Linux compatible)
    if (file) {
      try {
        const isWindows = process.platform === 'win32'
        const clearCmd = isWindows 
          ? 'if exist .next\\cache rmdir /s /q .next\\cache'
          : 'rm -rf .next/cache'
        
        await execAsync(clearCmd, { 
          cwd: process.cwd(),
          timeout: 3000 
        })
        console.log('Cache cleared for:', file)
      } catch (error) {
        console.log('Cache clear attempt (non-critical):', error)
      }
    }
    
    res.json({ 
      ok: true, 
      nonce: newNonce,
      timestamp: new Date().toISOString(),
      message: 'Rebuild triggered with cache clear',
      file: file || 'unknown'
    })
  } catch (e) {
    const err = e as Error
    console.error('Rebuild error:', err)
    res.status(500).json({ 
      ok: false, 
      error: String((err && err.message) || e)
    })
  }
}
