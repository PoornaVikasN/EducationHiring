import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

interface ChatSendPayload {
  applicationId: string;
  text: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }) as { sub: string; role: string };

      client.data['userId'] = payload.sub;
      client.data['role'] = payload.role;
      this.logger.debug(`Chat client connected: ${client.id} (user ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:join')
  async handleJoin(
    @MessageBody() applicationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId: string = client.data['userId'];
    const role: string = client.data['role'];
    try {
      await this.chatService.verifyAccess(applicationId, userId, role);
      await client.join(`chat:${applicationId}`);
      client.emit('chat:joined', { applicationId });
    } catch (err: unknown) {
      client.emit('chat:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('chat:send')
  async handleSend(
    @MessageBody() payload: ChatSendPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const userId: string = client.data['userId'];
    const role: string = client.data['role'];
    try {
      await this.chatService.verifyAccess(payload.applicationId, userId, role);
      const msg = await this.chatService.sendMessage(
        payload.applicationId,
        userId,
        role,
        payload.text,
      );
      this.server.to(`chat:${payload.applicationId}`).emit('chat:message', msg);
    } catch (err: unknown) {
      client.emit('chat:error', { message: (err as Error).message });
    }
  }
}
