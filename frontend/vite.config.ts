import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// ⚠️  NO proxy needed here.
// In local dev  → .env.development sets VITE_API_BASE_URL=http://localhost:8000
//                 so all fetch() calls go directly to Django (no proxy conflict).
// In production → .env.production sets VITE_API_BASE_URL="" (empty / relative)
//                 so Nginx on the AWS server proxies /api/*, /social_media/, etc.
//                 to Django.  Vite is not involved at all in production.
//
// WARNING: Do NOT add proxy entries for paths like /social_media or
// /competitors-plan — those are also React Router page routes, and a proxy
// entry would intercept the browser page load and return the Django DRF UI
// instead of the React app.
export default defineConfig({
  plugins: [react()],
})