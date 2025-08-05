import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Валидация
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны для заполнения' },
        { status: 400 }
      )
    }

    // Поиск пользователя
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        team: true,
        master: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Проверка активности пользователя
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Аккаунт заблокирован' },
        { status: 403 }
      )
    }

    // Проверка статуса команды
    if (user.team.status === 'DISABLED') {
      return NextResponse.json(
        { error: 'Команда временно отключена' },
        { status: 403 }
      )
    }

    // Проверка пароля
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Обновление времени последнего входа
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Генерация токена
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
    })

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        team: {
          id: user.team.id,
          teamNumber: user.team.teamNumber,
          name: user.team.name,
          slug: user.team.slug,
        },
        master: user.master ? {
          id: user.master.id,
          firstName: user.master.firstName,
          lastName: user.master.lastName,
        } : null,
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}