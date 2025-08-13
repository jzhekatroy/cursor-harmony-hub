// Fix analytics admin password by hashing it properly
// Usage: node scripts/fix_admin_password.js

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = 'analytics_admin@example.com'
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.log('User not found:', email)
    return
  }
  const hashed = await bcrypt.hash('password', 12)
  await prisma.user.update({ where: { email }, data: { password: hashed } })
  console.log('Password updated for', email)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })


