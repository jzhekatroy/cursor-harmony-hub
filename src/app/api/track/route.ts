import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Универсальный лог событий клиента (Phase 1): публичная страница без WebApp
// Принимает: { teamSlug, clientId?, source, type, metadata }
// Если clientId неизвестен (гость), можно передать null — событие сохранится без связи с клиентом
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamSlug, clientId, source, type, metadata } = body || {}

    if (!teamSlug || !source || !type) {
      return NextResponse.json({ error: 'teamSlug, source и type обязательны' }, { status: 400 })
    }

    const team = await prisma.team.findUnique({ where: { slug: teamSlug } })
    if (!team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }

    // Проверяем клиента, если передан
    let validClientId: string | null = null
    if (clientId) {
      const client = await prisma.client.findFirst({ where: { id: clientId, teamId: team.id } })
      if (!client) {
        return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 })
      }
      validClientId = client.id
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
    const userAgent = request.headers.get('user-agent') || null

    await prisma.clientEvent.create({
      data: {
        teamId: team.id,
        clientId: validClientId,
        source,
        type,
        metadata: metadata || null,
        ip,
        userAgent
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Track event error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}


