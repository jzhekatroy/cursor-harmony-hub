import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Получить глобальные настройки уведомлений
export async function GET(request: NextRequest) {
  try {
    // Получаем или создаем глобальные настройки
    let settings = await prisma.globalNotificationSettings.findFirst()

    // Если настроек нет, создаем с дефолтными значениями
    if (!settings) {
      settings = await prisma.globalNotificationSettings.create({
        data: {
          // Дефолтные значения уже установлены в схеме
        }
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching global notification settings:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Обновить глобальные настройки уведомлений
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      maxRequestsPerMinute,
      requestDelayMs,
      maxRetryAttempts,
      retryDelayMs,
      exponentialBackoff,
      failureThreshold,
      recoveryTimeoutMs,
      enabled
    } = body

    // Валидация
    if (maxRequestsPerMinute && (maxRequestsPerMinute < 1 || maxRequestsPerMinute > 30)) {
      return NextResponse.json(
        { error: 'maxRequestsPerMinute must be between 1 and 30' },
        { status: 400 }
      )
    }

    if (requestDelayMs && (requestDelayMs < 100 || requestDelayMs > 10000)) {
      return NextResponse.json(
        { error: 'requestDelayMs must be between 100 and 10000' },
        { status: 400 }
      )
    }

    if (maxRetryAttempts && (maxRetryAttempts < 1 || maxRetryAttempts > 10)) {
      return NextResponse.json(
        { error: 'maxRetryAttempts must be between 1 and 10' },
        { status: 400 }
      )
    }

    if (retryDelayMs && (retryDelayMs < 1000 || retryDelayMs > 30000)) {
      return NextResponse.json(
        { error: 'retryDelayMs must be between 1000 and 30000' },
        { status: 400 }
      )
    }

    if (failureThreshold && (failureThreshold < 1 || failureThreshold > 20)) {
      return NextResponse.json(
        { error: 'failureThreshold must be between 1 and 20' },
        { status: 400 }
      )
    }

    if (recoveryTimeoutMs && (recoveryTimeoutMs < 10000 || recoveryTimeoutMs > 300000)) {
      return NextResponse.json(
        { error: 'recoveryTimeoutMs must be between 10000 and 300000' },
        { status: 400 }
      )
    }

    // Обновляем настройки
    let settings = await prisma.globalNotificationSettings.findFirst()
    
    if (settings) {
      settings = await prisma.globalNotificationSettings.update({
        where: { id: settings.id },
        data: {
          maxRequestsPerMinute: maxRequestsPerMinute !== undefined ? maxRequestsPerMinute : settings.maxRequestsPerMinute,
          requestDelayMs: requestDelayMs !== undefined ? requestDelayMs : settings.requestDelayMs,
          maxRetryAttempts: maxRetryAttempts !== undefined ? maxRetryAttempts : settings.maxRetryAttempts,
          retryDelayMs: retryDelayMs !== undefined ? retryDelayMs : settings.retryDelayMs,
          exponentialBackoff: exponentialBackoff !== undefined ? exponentialBackoff : settings.exponentialBackoff,
          failureThreshold: failureThreshold !== undefined ? failureThreshold : settings.failureThreshold,
          recoveryTimeoutMs: recoveryTimeoutMs !== undefined ? recoveryTimeoutMs : settings.recoveryTimeoutMs,
          enabled: enabled !== undefined ? enabled : settings.enabled
        }
      })
    } else {
      settings = await prisma.globalNotificationSettings.create({
        data: {
          maxRequestsPerMinute: maxRequestsPerMinute || 25,
          requestDelayMs: requestDelayMs || 2000,
          maxRetryAttempts: maxRetryAttempts || 3,
          retryDelayMs: retryDelayMs || 5000,
          exponentialBackoff: exponentialBackoff !== undefined ? exponentialBackoff : true,
          failureThreshold: failureThreshold || 5,
          recoveryTimeoutMs: recoveryTimeoutMs || 60000,
          enabled: enabled !== undefined ? enabled : true
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      settings,
      message: 'Глобальные настройки обновлены успешно'
    })
  } catch (error) {
    console.error('Error updating global notification settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Сбросить настройки к дефолтным
export async function POST(request: NextRequest) {
  try {
    let settings = await prisma.globalNotificationSettings.findFirst()
    
    if (settings) {
      settings = await prisma.globalNotificationSettings.update({
        where: { id: settings.id },
        data: {
          maxRequestsPerMinute: 25,
          requestDelayMs: 2000,
          maxRetryAttempts: 3,
          retryDelayMs: 5000,
          exponentialBackoff: true,
          failureThreshold: 5,
          recoveryTimeoutMs: 60000,
          enabled: true
        }
      })
    } else {
      settings = await prisma.globalNotificationSettings.create({
        data: {
          maxRequestsPerMinute: 25,
          requestDelayMs: 2000,
          maxRetryAttempts: 3,
          retryDelayMs: 5000,
          exponentialBackoff: true,
          failureThreshold: 5,
          recoveryTimeoutMs: 60000,
          enabled: true
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      settings,
      message: 'Глобальные настройки сброшены к дефолтным значениям'
    })
  } catch (error) {
    console.error('Error resetting global notification settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    console.log('🔍 DEBUG: Starting global notification settings GET request')
    
    // Проверим, что Prisma видит таблицу
    console.log(' DEBUG: Checking if table exists...')
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'global_notification_settings'
      );
    `
    console.log('🔍 DEBUG: Table exists:', tableExists)
    
    // Проверим структуру таблицы
    console.log('🔍 DEBUG: Checking table structure...')
    const tableStructure = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'global_notification_settings' 
      ORDER BY ordinal_position;
    `
    console.log(' DEBUG: Table structure:', tableStructure)
    
    // Попробуем получить данные
    console.log(' DEBUG: Trying to get data...')
    const settings = await prisma.globalNotificationSettings.findFirst()
    console.log('🔍 DEBUG: Settings:', settings)
    
    return NextResponse.json(settings || {
      id: 'global',
      maxRequestsPerMinute: 25,
      requestDelayMs: 2000,
      maxRetryAttempts: 3,
      retryDelayMs: 5000,
      exponentialBackoff: true,
      failureThreshold: 5,
      recoveryTimeoutMs: 60000,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('❌ DEBUG: Error in global notification settings:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
