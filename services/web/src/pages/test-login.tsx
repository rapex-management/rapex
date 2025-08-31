import React from 'react';

export default function TestLoginPage() {
  const testLogin = async () => {
    console.log('🔐 Starting test login...');
    
    try {
      const response = await fetch('/api/proxy/merchant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'testmerchant',
          password: 'testpass123'
        })
      });
      
      console.log('🌐 Response status:', response.status);
      
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      if (response.ok) {
        localStorage.setItem('merchant_token', data.access);
        localStorage.setItem('merchant_refresh_token', data.refresh);
        localStorage.setItem('merchant', JSON.stringify(data));
        
        console.log('💾 Data stored, navigating...');
        
        // Test immediate navigation
        window.location.href = '/merchant/dashboard';
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Login Page</h1>
      <button onClick={testLogin}>Test Login & Redirect</button>
    </div>
  );
}
