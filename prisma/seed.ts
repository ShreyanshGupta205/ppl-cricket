import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
  },
});

async function main() {
  console.log('🌱 Starting seed...');

  await prisma.$executeRawUnsafe(`DELETE FROM "AuditLog"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "BallEvent"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Partnership"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Over"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Innings"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Player"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Team"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Match"`);
  console.log('🧹 Cleared old data');

  // ── Step 1: Create Match (team1Id/team2Id filled after teams exist) ──
  const match = await prisma.match.create({
    data: {
      title:            'PPL Final 2026',
      totalOvers:       20,
      ballsPerOver:     6,
      wideBallRuns:     1,
      noBallRuns:       1,
      status:           'SETUP',
      superOverEnabled: false,
      team1Id:          'placeholder1',   // updated below
      team2Id:          'placeholder2',   // updated below
      matchDate:        new Date('2026-03-14T00:00:00.000Z'),
    },
  });
  console.log(`✅ Match created: ${match.id}`);

  // ── Step 2: Create Team 1 ────────────────────────────────────────────
  const team1 = await prisma.team.create({
    data: { matchId: match.id, name: 'GIR x Pichavaram', shortName: 'GIR x Pichavaram' },
  });
  console.log(`✅ Team 1 created: ${team1.id}`);

  const squad1: { name: string; displayName: string; isCaptain: boolean; jerseyNo: number }[] = [
    { name: 'Amit Raj',            displayName: 'AMIT RAJ',            isCaptain: true,  jerseyNo: 1  },
    { name: 'Aditya Parmar',       displayName: 'Aditya Parmar',       isCaptain: false, jerseyNo: 2  },
    { name: 'Md Razi Anwar',       displayName: 'Md Razi Anwar',       isCaptain: false, jerseyNo: 3  },
    { name: 'Sagar Kumar',         displayName: 'Sagar Kumar',         isCaptain: false, jerseyNo: 4  },
    { name: 'Rohit Kumar',         displayName: 'Rohit Kumar #1',      isCaptain: false, jerseyNo: 5  },
    { name: 'Amritraj',            displayName: 'Amritraj',            isCaptain: false, jerseyNo: 6  },
    { name: 'Raj Aryan',           displayName: 'Raj Aryan',           isCaptain: false, jerseyNo: 7  },
    { name: 'Ritwick Kumar Singh', displayName: 'Ritwick Kumar Singh', isCaptain: false, jerseyNo: 8  },
    { name: 'Amar Nath Kumar',     displayName: 'Amar Nath Kumar',     isCaptain: false, jerseyNo: 9  },
    { name: 'Ayush Bhardwaj',      displayName: 'Ayush Bhardwaj',      isCaptain: false, jerseyNo: 10 },
    { name: 'Rohit Kumar',         displayName: 'Rohit Kumar #2',      isCaptain: false, jerseyNo: 11 },
    { name: 'Rohit Kumar',         displayName: 'Rohit Kumar #3',      isCaptain: false, jerseyNo: 12 },
    { name: 'Pranav Raj',          displayName: 'Pranav Raj',          isCaptain: false, jerseyNo: 13 },
  ];

  await prisma.player.createMany({
    data: squad1.map((p) => ({ ...p, teamId: team1.id })),
  });
  console.log(`✅ Squad 1 inserted (${squad1.length} players)`);

  // ── Step 3: Create Team 2 ────────────────────────────────────────────
  const team2 = await prisma.team.create({
    data: { matchId: match.id, name: 'Kanha x Nallamala', shortName: 'Kanha x Nallamala' },
  });
  console.log(`✅ Team 2 created: ${team2.id}`);

  const squad2: { name: string; displayName: string; isCaptain: boolean; jerseyNo: number }[] = [
    { name: 'Hritik',             displayName: 'HRITIK',              isCaptain: true,  jerseyNo: 1  },
    { name: 'Prince Raj',         displayName: 'Prince Raj',          isCaptain: false, jerseyNo: 2  },
    { name: 'Ashu',               displayName: 'Ashu',                isCaptain: false, jerseyNo: 3  },
    { name: 'Rishu',              displayName: 'Rishu',               isCaptain: false, jerseyNo: 4  },
    { name: 'Krishna Kumar',      displayName: 'Krishna Kumar',       isCaptain: false, jerseyNo: 5  },
    { name: 'Suraj Kumar',        displayName: 'Suraj Kumar',         isCaptain: false, jerseyNo: 6  },
    { name: 'Deepak Kumar Singh', displayName: 'Deepak Kumar Singh',  isCaptain: false, jerseyNo: 7  },
    { name: 'Ankit Raj',          displayName: 'Ankit Raj',           isCaptain: false, jerseyNo: 8  },
    { name: 'Aman Kumar Singh',   displayName: 'Aman Kumar Singh',    isCaptain: false, jerseyNo: 9  },
    { name: 'Shubham Shree',      displayName: 'Shubham Shree',       isCaptain: false, jerseyNo: 10 },
    { name: 'Vishal Kumar',       displayName: 'Vishal Kumar',        isCaptain: false, jerseyNo: 11 },
    { name: 'MD Talha Azam',      displayName: 'MD Talha Azam',       isCaptain: false, jerseyNo: 12 },
  ];

  await prisma.player.createMany({
    data: squad2.map((p) => ({ ...p, teamId: team2.id })),
  });
  console.log(`✅ Squad 2 inserted (${squad2.length} players)`);

  // ── Step 4: Update match with real team IDs ──────────────────────────
  await prisma.match.update({
    where: { id: match.id },
    data:  { team1Id: team1.id, team2Id: team2.id },
  });
  console.log('✅ Match updated with team IDs');

  // ── Summary ──────────────────────────────────────────────────────────
  const playerCount = await prisma.player.count();
  console.log('\n🏏 Seed complete!');
  console.log(`   Match ID  : ${match.id}`);
  console.log(`   Team 1    : ${team1.id}  →  ${team1.name}`);
  console.log(`   Team 2    : ${team2.id}  →  ${team2.name}`);
  console.log(`   Players   : ${playerCount} total`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());