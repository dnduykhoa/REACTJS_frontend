import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

if (typeof window !== 'undefined') {
  console.info('[AuthDebug] window.location.origin =', window.location.origin)
  console.info('[AuthDebug] VITE_GOOGLE_CLIENT_ID (masked) =', GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.slice(0, 12)}...` : 'missing')
}

if (!GOOGLE_CLIENT_ID) {
  throw new Error('Thiếu VITE_GOOGLE_CLIENT_ID. Vui lòng cấu hình đúng client id cho môi trường hiện tại.')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
