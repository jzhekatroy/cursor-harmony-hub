import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug не указан' },
        { status: 400 }
      )
    }

    // Проверяем, существует ли команда с таким slug
    const existingTeam = await prisma.team.findUnique({
      where: { slug },
      select: { id: true }
    })

    return NextResponse.json({
      available: !existingTeam,
      slug
    })

  } catch (error) {
    console.error('Error checking slug availability:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
