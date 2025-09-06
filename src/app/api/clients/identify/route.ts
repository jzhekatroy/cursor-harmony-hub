import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

// POST /api/clients/identify - идентифицировать клиента
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      telegramId,
      telegramUsername,
      telegramFirstName,
      telegramLastName,
      telegramLanguageCode,
      phone,
      email,
      source = 'TELEGRAM_WEBAPP'
    } = body

    // Стратегия идентификации:
    // 1. По Telegram ID (приоритет)
    // 2. По телефону
    // 3. По email
    // 4. Создать нового

    let client = null
    let isNew = false

    // 1. Ищем по Telegram ID
    if (telegramId) {
      client = await prisma.client.findFirst({
        where: {
          teamId: payload.teamId,
          telegramId: BigInt(telegramId)
        }
      })

      if (client) {
        // Обновляем данные если изменились
        const updateData: any = {}
        
        if (telegramUsername && telegramUsername !== client.telegramUsername) {
          updateData.telegramUsername = telegramUsername
        }
        if (telegramFirstName && telegramFirstName !== client.telegramFirstName) {
          updateData.telegramFirstName = telegramFirstName
        }
        if (telegramLastName && telegramLastName !== client.telegramLastName) {
          updateData.telegramLastName = telegramLastName
        }
        if (telegramLanguageCode && telegramLanguageCode !== client.telegramLanguageCode) {
          updateData.telegramLanguageCode = telegramLanguageCode
        }

        if (Object.keys(updateData).length > 0) {
          updateData.lastActivity = new Date()
          
          client = await prisma.client.update({
            where: { id: client.id },
            data: updateData
          })
        }

        return NextResponse.json({ client, isNew: false })
      }
    }

    // 2. Ищем по телефону
    if (phone) {
      client = await prisma.client.findFirst({
        where: {
          teamId: payload.teamId,
          phone
        }
      })

      if (client) {
        // Обновляем Telegram данные если их не было
        const updateData: any = { lastActivity: new Date() }
        
        if (telegramId && !client.telegramId) {
          updateData.telegramId = BigInt(telegramId)
        }
        if (telegramUsername && !client.telegramUsername) {
          updateData.telegramUsername = telegramUsername
        }
        if (telegramFirstName && !client.telegramFirstName) {
          updateData.telegramFirstName = telegramFirstName
        }
        if (telegramLastName && !client.telegramLastName) {
          updateData.telegramLastName = telegramLastName
        }
        if (telegramLanguageCode && !client.telegramLanguageCode) {
          updateData.telegramLanguageCode = telegramLanguageCode
        }

        if (Object.keys(updateData).length > 1) { // больше 1, потому что lastActivity всегда добавляется
          client = await prisma.client.update({
            where: { id: client.id },
            data: updateData
          })
        }

        return NextResponse.json({ client, isNew: false })
      }
    }

    // 3. Ищем по email
    if (email) {
      client = await prisma.client.findFirst({
        where: {
          teamId: payload.teamId,
          email
        }
      })

      if (client) {
        // Обновляем Telegram данные если их не было
        const updateData: any = { lastActivity: new Date() }
        
        if (telegramId && !client.telegramId) {
          updateData.telegramId = BigInt(telegramId)
        }
        if (telegramUsername && !client.telegramUsername) {
          updateData.telegramUsername = telegramUsername
        }
        if (telegramFirstName && !client.telegramFirstName) {
          updateData.telegramFirstName = telegramFirstName
        }
        if (telegramLastName && !client.telegramLastName) {
          updateData.telegramLastName = telegramLastName
        }
        if (telegramLanguageCode && !client.telegramLanguageCode) {
          updateData.telegramLanguageCode = telegramLanguageCode
        }

        if (Object.keys(updateData).length > 1) {
          client = await prisma.client.update({
            where: { id: client.id },
            data: updateData
          })
        }

        return NextResponse.json({ client, isNew: false })
      }
    }

    // 4. Создаем нового клиента
    if (!telegramId && !phone && !email) {
      return NextResponse.json(
        { error: 'Недостаточно данных для идентификации клиента' },
        { status: 400 }
      )
    }

    client = await prisma.client.create({
      data: {
        teamId: payload.teamId,
        telegramId: telegramId ? BigInt(telegramId) : null,
        telegramUsername,
        telegramFirstName,
        telegramLastName,
        telegramLanguageCode,
        phone,
        email,
        firstName: telegramFirstName,
        lastName: telegramLastName,
        source: source as any,
        lastActivity: new Date()
      }
    })

    isNew = true

    return NextResponse.json({ client, isNew })

  } catch (error) {
    console.error('Error identifying client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
