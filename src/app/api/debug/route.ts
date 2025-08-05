import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Проверяем переменные окружения
    const envCheck = {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
      NODE_ENV: process.env.NODE_ENV || 'undefined'
    }

    // Проверяем файловую систему
    const fs = require('fs')
    const path = require('path')
    
    const fileChecks = {
      '.env': fs.existsSync('.env'),
      'prisma/dev.db': fs.existsSync('prisma/dev.db'),
      'prisma/schema.prisma': fs.existsSync('prisma/schema.prisma')
    }

    // Пробуем подключиться к базе данных
    let dbStatus = 'UNKNOWN'
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.$connect()
      await prisma.user.count()
      dbStatus = 'CONNECTED'
      await prisma.$disconnect()
    } catch (error) {
      dbStatus = `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`
    }

    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      files: fileChecks,
      database: dbStatus,
      workingDirectory: process.cwd()
    })

  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}