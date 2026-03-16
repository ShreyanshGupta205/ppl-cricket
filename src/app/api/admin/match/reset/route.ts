import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Delete in correct order to avoid constraint issues
    await prisma.ballEvent.deleteMany();
    await prisma.partnership.deleteMany();
    await prisma.over.deleteMany();
    await prisma.innings.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.player.deleteMany();
    await prisma.team.deleteMany();
    await prisma.match.deleteMany();

    // Re-seed default match/teams/players so app is usable
    const match = await prisma.match.create({
      data: {
        title:            'PPL Final 2026',
        totalOvers:       20,
        status:           'SETUP',
        team1Id:          'placeholder1',
        team2Id:          'placeholder2',
      },
    });

    const team1 = await prisma.team.create({
      data: { matchId: match.id, name: 'GIR x Pichavaram', shortName: 'GIR x Pichavaram' },
    });
    await prisma.player.createMany({
      data: [
        { name: 'Amit Raj',            displayName: 'AMIT RAJ',            isCaptain: true,  jerseyNo: 1,  teamId: team1.id },
        { name: 'Aditya Parmar',       displayName: 'Aditya Parmar',       isCaptain: false, jerseyNo: 2,  teamId: team1.id },
        { name: 'Md Razi Anwar',       displayName: 'Md Razi Anwar',       isCaptain: false, jerseyNo: 3,  teamId: team1.id },
        { name: 'Sagar Kumar',         displayName: 'Sagar Kumar',         isCaptain: false, jerseyNo: 4,  teamId: team1.id },
        { name: 'Rohit Kumar',         displayName: 'Rohit Kumar #1',      isCaptain: false, jerseyNo: 5,  teamId: team1.id },
        { name: 'Amritraj',            displayName: 'Amritraj',            isCaptain: false, jerseyNo: 6,  teamId: team1.id },
        { name: 'Raj Aryan',           displayName: 'Raj Aryan',           isCaptain: false, jerseyNo: 7,  teamId: team1.id },
        { name: 'Ritwick Kumar Singh', displayName: 'Ritwick Kumar Singh', isCaptain: false, jerseyNo: 8,  teamId: team1.id },
        { name: 'Amar Nath Kumar',     displayName: 'Amar Nath Kumar',     isCaptain: false, jerseyNo: 9,  teamId: team1.id },
        { name: 'Ayush Bhardwaj',      displayName: 'Ayush Bhardwaj',      isCaptain: false, jerseyNo: 10, teamId: team1.id },
        { name: 'Rohit Kumar',         displayName: 'Rohit Kumar #2',      isCaptain: false, jerseyNo: 11, teamId: team1.id },
        { name: 'Rohit Kumar',         displayName: 'Rohit Kumar #3',      isCaptain: false, jerseyNo: 12, teamId: team1.id },
        { name: 'Pranav Raj',          displayName: 'Pranav Raj',          isCaptain: false, jerseyNo: 13, teamId: team1.id },
      ],
    });

    const team2 = await prisma.team.create({
      data: { matchId: match.id, name: 'Kanha x Nallamala', shortName: 'Kanha x Nallamala' },
    });
    await prisma.player.createMany({
      data: [
        { name: 'Hritik',             displayName: 'HRITIK',              isCaptain: true,  jerseyNo: 1,  teamId: team2.id },
        { name: 'Prince Raj',         displayName: 'Prince Raj',          isCaptain: false, jerseyNo: 2,  teamId: team2.id },
        { name: 'Ashu',               displayName: 'Ashu',                isCaptain: false, jerseyNo: 3,  teamId: team2.id },
        { name: 'Rishu',              displayName: 'Rishu',               isCaptain: false, jerseyNo: 4,  teamId: team2.id },
        { name: 'Krishna Kumar',      displayName: 'Krishna Kumar',       isCaptain: false, jerseyNo: 5,  teamId: team2.id },
        { name: 'Suraj Kumar',        displayName: 'Suraj Kumar',         isCaptain: false, jerseyNo: 6,  teamId: team2.id },
        { name: 'Deepak Kumar Singh', displayName: 'Deepak Kumar Singh',  isCaptain: false, jerseyNo: 7,  teamId: team2.id },
        { name: 'Ankit Raj',          displayName: 'Ankit Raj',           isCaptain: false, jerseyNo: 8,  teamId: team2.id },
        { name: 'Aman Kumar Singh',   displayName: 'Aman Kumar Singh',    isCaptain: false, jerseyNo: 9,  teamId: team2.id },
        { name: 'Shubham Shree',      displayName: 'Shubham Shree',       isCaptain: false, jerseyNo: 10, teamId: team2.id },
        { name: 'Vishal Kumar',       displayName: 'Vishal Kumar',        isCaptain: false, jerseyNo: 11, teamId: team2.id },
        { name: 'MD Talha Azam',      displayName: 'MD Talha Azam',       isCaptain: false, jerseyNo: 12, teamId: team2.id },
      ],
    });

    await prisma.match.update({
      where: { id: match.id },
      data:  { team1Id: team1.id, team2Id: team2.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/admin/match/reset]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
