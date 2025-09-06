import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// Функция для проверки данных Telegram WebApp
async function validateTelegramWebAppData(initData: string, teamSlug: string): Promise<boolean> {
  try {
    // Получаем токен бота из настроек команды
    const team = await prisma.team.findFirst({
      where: { 
        OR: [
          { slug: teamSlug },
          { bookingSlug: teamSlug }
        ]
      },
      select: { telegramBotToken: true }
    })

    if (!team?.telegramBotToken) {
      console.log('❌ Telegram bot token not configured for team:', teamSlug)
      return false
    }

    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    urlParams.delete('hash')
    
    // Сортируем параметры
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    
    // Создаем секретный ключ
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(team.telegramBotToken).digest()
    
    // Вычисляем хеш
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
    
    return calculatedHash === hash
  } catch (error) {
    console.error('Error validating Telegram data:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user, startParam, platform, version, initData, url, timestamp } = body
    
    const logData = {
      timestamp,
      user: user ? {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code,
        is_premium: user.is_premium
      } : null,
      startParam,
      platform,
      version,
      url,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }
    
    console.log('🚀 TELEGRAM WEBAPP START:', logData)
    
    // Сохраняем лог в БД
    try {
      await prisma.telegramLog.create({
        data: {
          level: 'INFO',
          message: 'Telegram WebApp started',
          data: logData,
          url,
          userAgent: request.headers.get('user-agent') || 'unknown',
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        }
      })
    } catch (logError) {
      console.error('Failed to save Telegram log:', logError)
    }
    
    // Извлекаем salon ID из URL или startParam
    let salonId = null
    if (url) {
      const urlMatch = url.match(/\/book\/([^\/\?]+)/)
      if (urlMatch) {
        salonId = urlMatch[1]
        console.log('🏪 Salon ID extracted from URL:', salonId)
      }
    }
    
    // Проверяем валидность данных (если initData передан)
    let isValid = false
    if (initData && salonId) {
      isValid = await validateTelegramWebAppData(initData, salonId)
      console.log('🔐 Data validation result:', isValid)
    }
    
    if (startParam) {
      console.log('🔗 Start param analysis:', startParam)
      // Можно парсить параметры запуска, например: salon_first, master_123, etc.
    }
    
    // Автоматическое создание/обновление клиента
    let client = null
    if (user && salonId) {
      try {
        // Получаем информацию о салоне
        const team = await prisma.team.findFirst({
          where: { 
            OR: [
              { slug: salonId },
              { bookingSlug: salonId }
            ]
          },
          select: { id: true, name: true }
        })

        if (!team) {
          console.log('❌ Team not found for salon:', salonId)
          return NextResponse.json({ 
            success: false,
            error: 'Salon not found' 
          }, { status: 404 })
        }

        // Ищем существующего клиента по Telegram ID
        client = await prisma.client.findFirst({
          where: {
            telegramId: BigInt(user.id),
            teamId: team.id
          }
        })

        if (client) {
          // Обновляем существующего клиента
          client = await prisma.client.update({
            where: { id: client.id },
            data: {
              telegramUsername: user.username || null,
              telegramFirstName: user.first_name || null,
              telegramLastName: user.last_name || null,
              lastActivity: new Date(),
              source: 'TELEGRAM_WEBAPP'
            }
          })
          console.log('✅ Client updated:', client.id)
        } else {
          // Создаем нового клиента
          client = await prisma.client.create({
            data: {
              telegramId: BigInt(user.id),
              telegramUsername: user.username || null,
              telegramFirstName: user.first_name || null,
              telegramLastName: user.last_name || null,
              firstName: user.first_name || 'Telegram User',
              lastName: user.last_name || '',
              email: user.username ? `${user.username}@telegram.local` : `tg_${user.id}@telegram.local`,
              phone: null,
              teamId: team.id,
              source: 'TELEGRAM_WEBAPP',
              lastActivity: new Date()
            }
          })
          console.log('✅ New client created:', client.id)
        }

        // Создаем запись о действии клиента
        await prisma.clientAction.create({
          data: {
            teamId: team.id,
            clientId: client.id,
            actionType: 'PAGE_VIEW',
            pageUrl: url,
            telegramData: {
              platform,
              version,
              startParam
            },
            userAgent: request.headers.get('user-agent') || 'unknown',
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
          }
        })

      } catch (error) {
        console.error('❌ Error creating/updating client:', error)
        
        // Логируем ошибку в БД
        try {
          await prisma.telegramLog.create({
            data: {
              level: 'ERROR',
              message: 'Failed to create/update client',
              data: { error: error.message, user, salonId },
              url,
              userAgent: request.headers.get('user-agent') || 'unknown',
              ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
              teamId: salonId
            }
          })
        } catch (logError) {
          console.error('Failed to save error log:', logError)
        }
      }
    }
    
    return NextResponse.json({ 
      success: true,
      received_at: new Date().toISOString(),
      data_valid: isValid,
      salon_id: salonId,
      user_detected: !!user,
      client: client ? {
        id: client.id,
        telegramId: client.telegramId?.toString(),
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        source: client.source
      } : null
    })
    
  } catch (error) {
    console.error('❌ Error processing Telegram WebApp start:', error)
    return NextResponse.json(
      { error: 'Failed to process start data' },
      { status: 500 }
    )
  }
}