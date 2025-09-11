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

    const { enabled } = body

    // Обновляем настройки
    const settings = await prisma.notificationSettings.upsert({
      where: { teamId },
      update: {
        enabled
      },
      create: {
        teamId,
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
        enabled: true
      },
      create: {
        teamId,
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
