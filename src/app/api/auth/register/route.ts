import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateTeamNumber, generateToken } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, teamName, contactPerson } = body

    // Валидация
    if (!email || !password || !teamName || !contactPerson) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      )
    }

    // Проверка существования пользователя
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      )
    }

    // Генерация уникального номера команды
    let teamNumber: string
    let isUnique = false
    do {
      teamNumber = generateTeamNumber()
      const existingTeam = await prisma.team.findUnique({
        where: { teamNumber }
      })
      isUnique = !existingTeam
    } while (!isUnique)

    // Генерация slug для команды
    const baseSlug = teamName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    
    let slug = baseSlug
    let slugCounter = 1
    let isSlugUnique = false
    do {
      const existingTeam = await prisma.team.findUnique({
        where: { slug }
      })
      if (!existingTeam) {
        isSlugUnique = true
      } else {
        slug = `${baseSlug}-${slugCounter}`
        slugCounter++
      }
    } while (!isSlugUnique)

    // Хеширование пароля
    const hashedPassword = await hashPassword(password)

    // Создание команды и администратора в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Создание команды
      const team = await tx.team.create({
        data: {
          teamNumber,
          name: teamName,
          slug,
          contactPerson,
          email,
        }
      })

      // Создание администратора команды
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: UserRole.ADMIN,
          firstName: contactPerson,
          teamId: team.id,
        }
      })

      return { team, user }
    })

    // Генерация токена
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      teamId: result.team.id,
    })

    return NextResponse.json({
      success: true,
      token,
      team: {
        id: result.team.id,
        teamNumber: result.team.teamNumber,
        name: result.team.name,
        slug: result.team.slug,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        firstName: result.user.firstName,
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    
    // В development режиме показываем детальную ошибку
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: 'Внутренняя ошибка сервера',
          details: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}