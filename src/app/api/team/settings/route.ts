import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

// GET - получить настройки команды
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { team: true }
    })

    if (!user || !user.team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const settings = {
      bookingStep: user.team.bookingStep,
      masterLimit: user.team.masterLimit,
      requireConfirmation: user.team.requireConfirmation,
      webhooksEnabled: user.team.webhooksEnabled,
      privacyPolicyUrl: user.team.privacyPolicyUrl,
      contactPerson: user.team.contactPerson,
      email: user.team.email,
      logoUrl: user.team.logoUrl,
      slug: user.team.slug,
      bookingSlug: user.team.bookingSlug || user.team.slug,
      timezone: user.team.timezone
    }

    return NextResponse.json({ settings })

  } catch (error) {
    console.error('Ошибка получения настроек команды:', error)
    return NextResponse.json(
      { error: 'Ошибка получения настроек' },
      { status: 500 }
    )
  }
}

// PUT - обновить настройки команды
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { team: true }
    })

    if (!user || !user.team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json()
    const {
      bookingStep,
      masterLimit,
      requireConfirmation,
      webhooksEnabled,
      privacyPolicyUrl,
      contactPerson,
      email,
      logoUrl,
      bookingSlug,
      timezone
    } = body

    // Валидация интервала бронирования
    if (bookingStep !== undefined) {
      const validSteps = [15, 30, 60]
      if (!validSteps.includes(bookingStep)) {
        return NextResponse.json(
          { error: 'Интервал бронирования должен быть 15, 30 или 60 минут' },
          { status: 400 }
        )
      }
    }

    // Валидация лимита мастеров
    if (masterLimit !== undefined) {
      if (masterLimit < 1 || masterLimit > 50) {
        return NextResponse.json(
          { error: 'Лимит мастеров должен быть от 1 до 50' },
          { status: 400 }
        )
      }

      // Проверяем что новый лимит не меньше текущего количества активных мастеров
      const activeMastersCount = await prisma.master.count({
        where: {
          teamId: user.teamId,
          isActive: true
        }
      })

      if (masterLimit < activeMastersCount) {
        return NextResponse.json(
          { error: `Нельзя установить лимит меньше текущего количества активных мастеров (${activeMastersCount})` },
          { status: 400 }
        )
      }
    }

    // Валидация bookingSlug
    if (bookingSlug !== undefined) {
      if (bookingSlug && bookingSlug.trim()) {
        // Проверяем что slug уникален среди других команд
        const slugPattern = /^[a-z0-9-]+$/
        if (!slugPattern.test(bookingSlug)) {
          return NextResponse.json(
            { error: 'Ссылка может содержать только латинские буквы, цифры и дефисы' },
            { status: 400 }
          )
        }

        const existingTeam = await prisma.team.findFirst({
          where: {
            OR: [
              { slug: bookingSlug },
              { bookingSlug: bookingSlug }
            ],
            NOT: { id: user.teamId }
          }
        })

        if (existingTeam) {
          return NextResponse.json(
            { error: 'Эта ссылка уже используется другим салоном' },
            { status: 400 }
          )
        }
      }
    }

    // Валидация часового пояса
    if (timezone !== undefined) {
      const validTimezones = [
        'Europe/Moscow', 'Europe/Kiev', 'Europe/Minsk', 'Asia/Almaty', 'Asia/Tashkent',
        'Asia/Yekaterinburg', 'Asia/Novosibirsk', 'Asia/Vladivostok', 'Europe/London',
        'America/New_York', 'UTC'
      ]
      
      if (!validTimezones.includes(timezone)) {
        return NextResponse.json(
          { error: 'Неподдерживаемый часовой пояс' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (bookingStep !== undefined) updateData.bookingStep = bookingStep
    if (masterLimit !== undefined) updateData.masterLimit = masterLimit
    if (requireConfirmation !== undefined) updateData.requireConfirmation = requireConfirmation
    if (webhooksEnabled !== undefined) updateData.webhooksEnabled = webhooksEnabled
    if (privacyPolicyUrl !== undefined) updateData.privacyPolicyUrl = privacyPolicyUrl || null
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson
    if (email !== undefined) updateData.email = email
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null
    if (bookingSlug !== undefined) updateData.bookingSlug = bookingSlug?.trim() || null
    if (timezone !== undefined) updateData.timezone = timezone

    const updatedTeam = await prisma.team.update({
      where: { id: user.teamId },
      data: updateData
    })

    return NextResponse.json({
      message: 'Настройки обновлены',
      settings: {
        bookingStep: updatedTeam.bookingStep,
        masterLimit: updatedTeam.masterLimit,
        requireConfirmation: updatedTeam.requireConfirmation,
        webhooksEnabled: updatedTeam.webhooksEnabled,
        privacyPolicyUrl: updatedTeam.privacyPolicyUrl,
        contactPerson: updatedTeam.contactPerson,
        email: updatedTeam.email,
        logoUrl: updatedTeam.logoUrl,
        slug: updatedTeam.slug,
        bookingSlug: updatedTeam.bookingSlug || updatedTeam.slug,
        timezone: updatedTeam.timezone
      }
    })

  } catch (error) {
    console.error('Ошибка обновления настроек команды:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления настроек' },
      { status: 500 }
    )
  } finally {
    // Не отключаем singleton Prisma клиент
  }
}