import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Получить настройки команды
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params

    // Проверяем, что команда существует
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Получаем или создаем настройки для команды
    let settings = await prisma.notificationSettings.findUnique({
      where: { teamId }
    })

    // Если настроек нет, создаем с дефолтными значениями
    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          teamId,
          // Дефолтные значения уже установлены в схеме
        }
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching notification settings:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      teamId: await context.params.then(p => p.teamId).catch(() => 'unknown')
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

// Обновить настройки команды
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params
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
    const settings = await prisma.notificationSettings.upsert({
      where: { teamId },
      update: {
        maxRequestsPerMinute,
        requestDelayMs,
        maxRetryAttempts,
        retryDelayMs,
        exponentialBackoff,
        failureThreshold,
        recoveryTimeoutMs,
        enabled
      },
      create: {
        teamId,
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

    return NextResponse.json({ 
      success: true, 
      settings,
      message: 'Настройки обновлены успешно'
    })
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Сбросить настройки к дефолтным
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params

    const settings = await prisma.notificationSettings.upsert({
      where: { teamId },
      update: {
        maxRequestsPerMinute: 25,
        requestDelayMs: 2000,
        maxRetryAttempts: 3,
        retryDelayMs: 5000,
        exponentialBackoff: true,
        failureThreshold: 5,
        recoveryTimeoutMs: 60000,
        enabled: true
      },
      create: {
        teamId,
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

    return NextResponse.json({ 
      success: true, 
      settings,
      message: 'Настройки сброшены к дефолтным значениям'
    })
  } catch (error) {
    console.error('Error resetting notification settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
