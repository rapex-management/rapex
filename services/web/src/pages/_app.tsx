import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import AuthProvider from '../components/providers/AuthProvider'
import { PerformanceMonitor } from '../components/monitoring/PerformanceMonitor'
import { preloadCriticalResources } from '../utils/performanceOptimizations'
import '../styles/globals.css'
// Import dev nonce to ensure dev rebuild triggers affect the client bundle
import { nonce } from '../dev/nonce'

// Performance monitoring
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  // Add route change analytics if needed
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // You can add analytics tracking here
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
          page_path: url,
        })
      }
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  // Dev live-reload (full page reload) via Socket.IO; event-based, no polling
  useEffect(() => {
    // Reference nonce so dev rebuilds pick up changes
    if (process.env.NODE_ENV === 'development' && typeof nonce === 'string' && nonce.length === -1) {
      console.log(nonce)
    }
    const url = process.env.NEXT_PUBLIC_RELOAD_WS_URL
    // Only enable when URL is configured
    if (!url) return
  let mounted = true
    type ReloadSocket = {
      disconnect?: () => void
      on: (event: 'connect' | 'reload', cb: (...args: unknown[]) => void) => void
    }
    let socket: ReloadSocket | null = null
    ;(async () => {
      try {
        const { io } = await import('socket.io-client')
        // Force websocket transport; connect to reload namespace
        socket = io(url, { transports: ['websocket'], reconnection: true })
        const debouncedReload = (() => {
          let last = 0
          return (data?: { reason?: string }) => {
            const now = Date.now()
            if (now - last < 300) return
            last = now
            
            if (typeof window !== 'undefined') {
              // If it's a rebuild, add small delay to ensure compilation completes
              const delay = data?.reason === 'rebuild' ? 1500 : 500
              console.log(`🔄 Auto-reload triggered (${data?.reason || 'change'}) - reloading in ${delay}ms...`)
              
              setTimeout(() => {
                window.location.reload()
              }, delay)
            }
          }
        })()
        if (socket) {
          socket.on('connect', () => {
            // connected to reload stream
          })
          socket.on('reload', (data: unknown) => {
            if (!mounted) return
            debouncedReload(data as { reason?: string })
          })
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      mounted = false
      try {
        socket?.disconnect?.()
      } catch {}
    }
  }, [])

  // Preload critical resources on app start
  useEffect(() => {
    preloadCriticalResources();
  }, []);

  return (
    <AuthProvider session={pageProps.session}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f97316" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <meta name="description" content="RAPEX - Advanced e-commerce platform for merchants" />
      </Head>
      
      {/* Performance monitoring in development and production */}
      <PerformanceMonitor 
        enableTracking={true}
        enableLogging={process.env.NODE_ENV === 'development'}
        enableReporting={process.env.NODE_ENV === 'production'}
      />
      
      <Component {...pageProps} />
    </AuthProvider>
  )
}