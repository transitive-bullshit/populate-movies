import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// prisma.movie.upsert({
//   where: { imdbId: '' },
//   update: {},
//   create: {}
// })

export { prisma }
