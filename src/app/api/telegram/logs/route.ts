import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, data, url, userAgent } = body
    
    const timestamp = new Date().toISOString()
    
    // Логируем в консоль сервера
    console.log('🤖 TELEGRAM WEBAPP LOG:', {
      timestamp,
      message,
      data,
      url,
      userAgent,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    })
    
    return NextResponse.json({ 
      success: true,
      logged_at: timestamp 
    })
    
  } catch (error) {
    console.error('❌ Error logging Telegram WebApp data:', error)
    return NextResponse.json(
      { error: 'Failed to log data' },
      { status: 500 }
    )
  }
}