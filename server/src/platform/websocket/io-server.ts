import { Server } from 'socket.io';

let ioServer: Server | null = null;

export function setServer(server: Server): void {
  ioServer = server;
}

export function emitToUser(userId: string, event: string, payload: unknown): boolean {
  if (!ioServer) return false;
  ioServer.to(`user:${userId}`).emit(event, payload);
  return true;
}
