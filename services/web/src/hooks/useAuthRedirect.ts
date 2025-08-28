import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function useAuthRedirect(roleKey: string, redirectTo:string){
  const router = useRouter()
  useEffect(()=>{
    const token = localStorage.getItem('token')
    const user = localStorage.getItem(roleKey)
    if(!token || !user){
      router.replace(redirectTo)
    }
  }, [router, roleKey, redirectTo])
}
