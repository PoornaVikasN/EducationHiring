import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':applicationId')
  getHistory(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatService.getHistory(applicationId, user.sub, user.role);
  }

  @Post(':applicationId')
  sendMessage(
    @Param('applicationId') applicationId: string,
    @Body('text') text: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatService.sendMessage(applicationId, user.sub, user.role, text);
  }
}
