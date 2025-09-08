import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking database state...')

    // Проверяем, какие колонки есть в таблице client_actions
    const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'client_actions'
      ORDER BY column_name
    `

    console.log('📊 client_actions columns:', columns)

    // Пробуем выполнить простой запрос к ClientAction
    try {
      const actions = await prisma.clientAction.findMany({
        take: 1
      })
      console.log('✅ ClientAction query successful:', actions.length, 'records')
    } catch (error) {
      console.error('❌ ClientAction query failed:', error)
      return NextResponse.json({ 
        error: 'ClientAction query failed',
        details: error instanceof Error ? error.message : String(error),
        columns
      }, { status: 500 })
    }

    // Пробуем выполнить запрос к Client
    try {
      const clients = await prisma.client.findMany({
        take: 1,
        include: {
          bookings: {
            take: 1
          }
        }
      })
      console.log('✅ Client query successful:', clients.length, 'records')
    } catch (error) {
      console.error('❌ Client query failed:', error)
      return NextResponse.json({ 
        error: 'Client query failed',
        details: error instanceof Error ? error.message : String(error),
        columns
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Database is working correctly',
      columns
    })

  } catch (error) {
    console.error('❌ Database check error:', error)
    return NextResponse.json({ 
      error: 'Database check failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
