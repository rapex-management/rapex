import Link from 'next/link'

export default function Home() {
  return (
    <div className="login-container">
      <div className="login-form">
        <h1 className="login-title">RAPEX Authentication Portal</h1>
        <p className="text-center mb-4">Choose your login type:</p>
        
        <div className="form-group">
          <Link href="/admin/login" className="btn btn-primary block text-center mb-4">
            Admin Login
          </Link>
        </div>
        
        <div className="form-group">
          <Link href="/merchant/login" className="btn btn-secondary block text-center">
            Merchant Login
          </Link>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm" style={{color: '#666'}}>
            Test Credentials:<br/>
            Admin: admin / adminpass<br/>
            Merchant: merchant / merchantpass
          </p>
        </div>
      </div>
    </div>
  )
}
