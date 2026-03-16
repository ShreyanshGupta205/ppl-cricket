export async function GET() {
  const url = process.env.DATABASE_URL ?? 'NOT SET';
  
  // Parse URL safely to show structure without exposing password
  let info: Record<string, string> = {};
  try {
    const u = new URL(url);
    info = {
      protocol:  u.protocol,           // should be "postgresql:"
      username:  u.username,           // should be "postgres.PROJECTREF"
      password:  u.password ? `SET(${u.password.length} chars)` : 'MISSING',
      host:      u.host,               // should have pooler + port 6543
      pathname:  u.pathname,           // should be "/postgres"
      pgbouncer: u.searchParams.get('pgbouncer') ?? 'MISSING',  // should be "true"
    };
  } catch (e) {
    info = { parseError: String(e), raw_length: String(url.length), first20: url.substring(0, 20) };
  }

  return Response.json(info);
}