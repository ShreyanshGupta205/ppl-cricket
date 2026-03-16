import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { NextApiResponse } from 'next';
import type { Socket as NetSocket } from 'net';

// Extend the Node socket type so we can attach the IO instance
interface SocketServer extends HTTPServer {
  io?: SocketIOServer;
}
interface SocketWithIO extends NetSocket {
  server: SocketServer;
}
export interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

// Singleton — only create one Socket.IO server per Node process
let io: SocketIOServer | null = null;

export function getSocketIO(res?: NextApiResponseWithSocket): SocketIOServer | null {
  // If already initialized, return existing instance
  if (io) return io;

  // Need res.socket.server to attach Socket.IO (only available in API routes)
  if (!res) return null;

  const httpServer: SocketServer = res.socket.server;
  if (httpServer.io) {
    io = httpServer.io;
    return io;
  }

  console.log('🔌 Initializing Socket.IO server...');
  io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin:  '*',
      methods: ['GET', 'POST'],
    },
  });

  httpServer.io = io;

  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Client joins the match room to receive updates
    socket.on('client:connect', (matchId: string) => {
      socket.join(`match:${matchId}`);
      console.log(`   └─ Joined room match:${matchId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

// ─── Emit helpers (call these from API routes after score changes) ────────────

export function emitScoreUpdate(matchId: string, matchState: unknown) {
  if (!io) return;
  io.to(`match:${matchId}`).emit('score:update', matchState);
}

export function emitWicket(matchId: string, wicketInfo: unknown) {
  if (!io) return;
  io.to(`match:${matchId}`).emit('wicket:fell', wicketInfo);
}

export function emitMatchComplete(matchId: string, result: unknown) {
  if (!io) return;
  io.to(`match:${matchId}`).emit('match:complete', result);
}

export function emitMatchPaused(matchId: string, reason: string) {
  if (!io) return;
  io.to(`match:${matchId}`).emit('match:paused', reason);
}

export function emitMatchResumed(matchId: string, matchState: unknown) {
  if (!io) return;
  io.to(`match:${matchId}`).emit('match:resumed', matchState);
}

export function emitInningsStart(matchId: string, inningsData: unknown) {
  if (!io) return;
  io.to(`match:${matchId}`).emit('innings:start', inningsData);
}