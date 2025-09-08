import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user, teamSlug, url } = body
    
    console.log('🔍 DEBUG WebApp Data:', {
      user,
      teamSlug,
      url,
      userExists: !!user,
      userId: user?.id,
      userIdType: typeof user?.id,
      userIdString: user?.id?.toString()
    })
    
    return NextResponse.json({
      success: true,
      debug: {
        user,
        teamSlug,
        url,
        userExists: !!user,
        userId: user?.id,
        userIdType: typeof user?.id,
        userIdString: user?.id?.toString(),
        telegramId: user?.id?.toString()
      }
    })
    
  } catch (error) {
    console.error('Error in debug WebApp data:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
