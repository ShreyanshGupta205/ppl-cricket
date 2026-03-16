import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Socket.IO runs via custom server' });
}