import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// API для сохранения логов Telegram WebApp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, data, url, userAgent, level = 'INFO' } = body
    
    // Сохраняем лог в БД
    await prisma.telegramLog.create({
      data: {
        level,
        message,
        data: data ? JSON.parse(JSON.stringify(data)) : null,
        url,
        userAgent,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving Telegram log:', error)
    return NextResponse.json({ error: 'Failed to save log' }, { status: 500 })
  }
}

// API для получения логов Telegram WebApp
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const level = searchParams.get('level')
    const teamId = searchParams.get('teamId')
    
    const where: any = {}
    if (level) where.level = level
    if (teamId) where.teamId = teamId
    
    const logs = await prisma.telegramLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })
    
    const total = await prisma.telegramLog.count({ where })
    
    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching Telegram logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}