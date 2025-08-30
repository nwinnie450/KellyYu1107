import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'kelly-admin-secret-2025'

export interface AdminUser {
  username: string
  role: string
  iat: number
  exp: number
}

export function verifyAdminToken(token: string): AdminUser | null {
  try {
    const decoded = verify(token, JWT_SECRET) as AdminUser
    return decoded
  } catch (error) {
    return null
  }
}

export function isAuthenticated(authHeader: string | null): AdminUser | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  return verifyAdminToken(token)
}

// Client-side authentication check
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('kelly_admin_token')
}

export function isLoggedIn(): boolean {
  const token = getStoredToken()
  if (!token) return false
  
  try {
    // Client-side token validation - just check if token exists and isn't expired
    // We can't verify signature client-side, but we can check expiration
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('kelly_admin_token')
    window.location.href = '/admin/login'
  }
}