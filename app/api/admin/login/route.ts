import { NextRequest, NextResponse } from 'next/server'
import { sign } from 'jsonwebtoken'

// Demo credentials - CHANGE THESE IN PRODUCTION!
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'kelly2025'
}

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'kelly-admin-secret-2025'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Validate input
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Username and password are required'
      }, { status: 400 })
    }

    // Check credentials
    if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
      return NextResponse.json({
        success: false,
        error: 'Invalid username or password'
      }, { status: 401 })
    }

    // Generate JWT token
    const token = sign(
      { 
        username: username,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      JWT_SECRET
    )

    return NextResponse.json({
      success: true,
      token: token,
      message: 'Login successful',
      user: {
        username: username,
        role: 'admin'
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}