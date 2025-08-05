import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeader, verifyToken } from '@/lib/auth'

// PUT /api/masters/[id] - обновить мастера
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    // Проверяем права доступа
    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав доступа' }, { status: 403 })
    }

    const body = await request.json()
    const { firstName, lastName, description, photoUrl, serviceIds, isActive, password } = body

    // Проверяем, что мастер принадлежит команде
    const existingMaster = await prisma.master.findFirst({
      where: {
        id,
        teamId: decoded.teamId
      },
      include: {
        user: true
      }
    })

    if (!existingMaster) {
      return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 })
    }

    // Если это изменение статуса активности
    if (typeof isActive === 'boolean') {
      // Проверяем активные бронирования при деактивации
      if (!isActive) {
        const activeBookings = await prisma.booking.count({
          where: {
            masterId: id,
            status: 'CONFIRMED',
            startTime: {
              gte: new Date()
            }
          }
        })

        if (activeBookings > 0) {
          return NextResponse.json({ 
            error: 'Невозможно уволить мастера с активными записями. Перенесите или отмените записи.' 
          }, { status: 400 })
        }
      }

      // Обновляем статус мастера и пользователя
      const updatedMaster = await prisma.$transaction(async (tx) => {
        // Обновляем статус пользователя
        await tx.user.update({
          where: { id: existingMaster.userId },
          data: { isActive }
        })

        // Обновляем статус мастера
        return await tx.master.update({
          where: { id },
          data: { isActive },
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
            }
          }
        })
      })

      return NextResponse.json({ 
        success: true, 
        master: updatedMaster 
      })
    }

    // Валидация при обновлении профиля
    if (firstName !== undefined && !firstName?.trim()) {
      return NextResponse.json({ error: 'Имя обязательно для заполнения' }, { status: 400 })
    }
    if (lastName !== undefined && !lastName?.trim()) {
      return NextResponse.json({ error: 'Фамилия обязательна для заполнения' }, { status: 400 })
    }

    // Проверяем, что указанные услуги принадлежат команде
    if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
      const servicesCount = await prisma.service.count({
        where: {
          id: { in: serviceIds },
          teamId: decoded.teamId
        }
      })
      
      if (servicesCount !== serviceIds.length) {
        console.error('Service validation failed:', { serviceIds, servicesCount, teamId: decoded.teamId })
        return NextResponse.json({ error: 'Некоторые услуги не принадлежат вашей команде' }, { status: 400 })
      }
    }

    // Обновляем мастера в транзакции
    const updatedMaster = await prisma.$transaction(async (tx) => {
      // Обновляем данные пользователя если нужно
      const userUpdateData: any = {}
      if (firstName) userUpdateData.firstName = firstName.trim()
      if (lastName) userUpdateData.lastName = lastName.trim()
      if (password && password.trim()) {
        const { hashPassword } = await import('@/lib/auth')
        userUpdateData.password = await hashPassword(password.trim())
      }
      
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: existingMaster.userId },
          data: userUpdateData
        })
      }

      // Обновляем данные мастера
      return await tx.master.update({
        where: { id },
        data: {
          ...(firstName && { firstName: firstName.trim() }),
          ...(lastName && { lastName: lastName.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(photoUrl !== undefined && { photoUrl: photoUrl?.trim() || null }),
          ...(serviceIds !== undefined && {
            services: {
              set: serviceIds.map((serviceId: string) => ({ id: serviceId }))
            }
          })
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
          }
        }
      })
    })

    return NextResponse.json({ 
      success: true, 
      master: updatedMaster 
    })

  } catch (error) {
    console.error('Master update error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

// DELETE /api/masters/[id] - деактивировать мастера (не удаляем, а увольняем)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    // Проверяем права доступа
    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав доступа' }, { status: 403 })
    }

    // Проверяем, что мастер принадлежит команде
    const existingMaster = await prisma.master.findFirst({
      where: {
        id,
        teamId: decoded.teamId
      },
      include: {
        user: true
      }
    })

    if (!existingMaster) {
      return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 })
    }

    // Проверяем активные бронирования
    const activeBookings = await prisma.booking.count({
      where: {
        masterId: id,
        status: 'CONFIRMED',
        startTime: {
          gte: new Date()
        }
      }
    })

    if (activeBookings > 0) {
      return NextResponse.json({ 
        error: 'Невозможно уволить мастера с активными записями. Перенесите или отмените записи.' 
      }, { status: 400 })
    }

    // Деактивируем мастера и пользователя
    const deactivatedMaster = await prisma.$transaction(async (tx) => {
      // Деактивируем пользователя
      await tx.user.update({
        where: { id: existingMaster.userId },
        data: { isActive: false }
      })

      // Деактивируем мастера
      return await tx.master.update({
        where: { id },
        data: { isActive: false },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true
            }
          }
        }
      })
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Мастер успешно уволен',
      master: deactivatedMaster 
    })

  } catch (error) {
    console.error('Master deactivation error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}