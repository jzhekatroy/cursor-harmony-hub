import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Error logs API - Headers:', Object.fromEntries(request.headers.entries()))
    
    // Проверяем авторизацию
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    console.log('🔍 Token extracted:', token ? 'present' : 'missing')
    
    if (!token) {
      console.log('❌ No token provided')
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    console.log('🔍 Token payload:', { role: payload.role, email: payload.email })
    
    if (payload.role !== 'SUPER_ADMIN') {
      console.log('❌ Insufficient permissions:', payload.role)
      return NextResponse.json({ error: 'Forbidden - SUPER_ADMIN role required' }, { status: 403 })
    }

    // Получаем логи ошибок за последние 24 часа
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const logs = await prisma.telegramLog.findMany({
      where: {
        level: 'ERROR',
        createdAt: {
          gte: yesterday
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Ограничиваем количество для производительности
    })

    return NextResponse.json({ logs })

  } catch (error) {
    console.error('Error fetching error logs:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
