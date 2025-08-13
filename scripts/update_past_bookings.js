// One-off script: set all past CONFIRMED bookings to COMPLETED
// Usage: node scripts/update_past_bookings.js [--team TEAM_ID_OR_SLUG]
// Supports env TEAM_ID or TEAM_SLUG as well

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function resolveTeam() {
  const argv = process.argv.slice(2)
  const teamArgIndex = argv.indexOf('--team')
  let teamId = process.env.TEAM_ID || null
  let teamSlug = process.env.TEAM_SLUG || null
  if (teamArgIndex !== -1 && argv[teamArgIndex + 1]) {
    const val = argv[teamArgIndex + 1]
    if (val.startsWith('cm') || val.length > 20) teamId = val
    else teamSlug = val
  }
  let team = null
  if (teamId) {
    team = await prisma.team.findUnique({ where: { id: teamId } })
  } else if (teamSlug) {
    team = await prisma.team.findUnique({ where: { slug: teamSlug } })
  } else {
    team = await prisma.team.findFirst()
  }
  if (!team) throw new Error('Team not found. Provide TEAM_ID or TEAM_SLUG')
  return team
}

async function main() {
  const team = await resolveTeam()
  const now = new Date()
  console.log(`Team: ${team.name} (${team.id})`)

  const toFixCount = await prisma.booking.count({
    where: { teamId: team.id, status: 'CONFIRMED', endTime: { lt: now } }
  })
  console.log(`Found ${toFixCount} past CONFIRMED bookings to update...`)

  if (toFixCount === 0) {
    console.log('Nothing to update.')
    return
  }

  const result = await prisma.booking.updateMany({
    where: { teamId: team.id, status: 'CONFIRMED', endTime: { lt: now } },
    data: { status: 'COMPLETED' }
  })
  console.log(`Updated: ${result.count}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })


