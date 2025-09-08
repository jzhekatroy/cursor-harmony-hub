import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        bookingSlug: true,
        telegramBotToken: true
      }
    })

    return NextResponse.json({
      success: true,
      teams
    })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}
