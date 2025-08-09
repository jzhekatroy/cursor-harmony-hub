import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeader, verifyToken, hashPassword } from '@/lib/auth'
import { initializeMasterRotation } from '@/lib/masterRotation'

// GET /api/masters - получить список мастеров команды
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    // Получаем мастеров команды
    const masters = await prisma.master.findMany({
      where: {
        teamId: decoded.teamId
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            lastLoginAt: true
          }
        },
        services: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            bookings: {
              where: {
                status: 'CONFIRMED'
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json({ masters })

  } catch (error) {
    console.error('Masters fetch error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

// POST /api/masters - добавить нового мастера
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    // Проверяем права доступа (только админы могут добавлять мастеров)
    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав доступа' }, { status: 403 })
    }

    const body = await request.json()
    const { email, firstName, lastName, description, photoUrl, password, serviceIds = [] } = body

    // Валидация обязательных полей
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email обязателен для заполнения' }, { status: 400 })
    }
    if (!firstName?.trim()) {
      return NextResponse.json({ error: 'Имя обязательно для заполнения' }, { status: 400 })
    }
    if (!lastName?.trim()) {
      return NextResponse.json({ error: 'Фамилия обязательна для заполнения' }, { status: 400 })
    }
    if (!password?.trim()) {
      return NextResponse.json({ error: 'Пароль обязателен для заполнения' }, { status: 400 })
    }

    // Проверяем лимит мастеров (по умолчанию 2, может изменить только супер-админ)
    const team = await prisma.team.findUnique({
      where: { id: decoded.teamId },
      select: { masterLimit: true }
    })

    if (!team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }

    const currentMastersCount = await prisma.master.count({
      where: { teamId: decoded.teamId, isActive: true }
    })

    if (currentMastersCount >= team.masterLimit) {
      return NextResponse.json({ 
        error: `Достигнут лимит мастеров (${team.masterLimit}). Обратитесь к администратору для увеличения лимита.` 
      }, { status: 400 })
    }

    // Проверяем, что email уникален
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim() }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 })
    }

    // Проверяем, что указанные услуги принадлежат команде
    if (serviceIds.length > 0) {
      const servicesCount = await prisma.service.count({
        where: {
          id: { in: serviceIds },
          teamId: decoded.teamId
        }
      })
      
      if (servicesCount !== serviceIds.length) {
        return NextResponse.json({ error: 'Некоторые услуги не принадлежат вашей команде' }, { status: 400 })
      }
    }

    // Хэшируем пароль
    const hashedPassword = await hashPassword(password.trim())

    // Создаем мастера в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Создаем пользователя
      const user = await tx.user.create({
        data: {
          email: email.trim(),
          password: hashedPassword,
          role: 'MASTER',
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          teamId: decoded.teamId
        }
      })

      // Создаем профиль мастера
      const master = await tx.master.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          description: description?.trim() || null,
          photoUrl: photoUrl?.trim() || null,
          userId: user.id,
          teamId: decoded.teamId,
          services: serviceIds.length > 0 ? {
            connect: serviceIds.map((id: string) => ({ id }))
          } : undefined
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true
            }
          },
          services: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Создаем расписание по умолчанию (пн-пт, 9:00-18:00)
      const defaultSchedules = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }, // Понедельник
        { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' }, // Вторник
        { dayOfWeek: 3, startTime: '09:00', endTime: '18:00' }, // Среда
        { dayOfWeek: 4, startTime: '09:00', endTime: '18:00' }, // Четверг
        { dayOfWeek: 5, startTime: '09:00', endTime: '18:00' }, // Пятница
      ]

      await tx.masterSchedule.createMany({
        data: defaultSchedules.map(schedule => ({
          masterId: master.id,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        }))
      })

      console.log(`✅ Создано расписание по умолчанию для мастера ${master.firstName} ${master.lastName} (ID: ${master.id})`)
      console.log(`📅 Рабочие дни: пн-пт, время: 09:00-18:00`)

      return master
    })

    // Инициализируем ротацию для нового мастера
    await initializeMasterRotation(decoded.teamId, result.id)

    return NextResponse.json({ 
      success: true, 
      master: result 
    }, { status: 201 })

  } catch (error) {
    console.error('Master creation error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}