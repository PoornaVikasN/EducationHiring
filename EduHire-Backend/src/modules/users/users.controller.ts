import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../shared/enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto';
import { UpdateSeekerProfileDto } from './dto/update-seeker-profile.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.getMe(user);
  }

  @Patch('me/seeker-profile')
  @Roles(Role.JOB_SEEKER)
  updateSeekerProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateSeekerProfileDto,
  ) {
    return this.usersService.updateSeekerProfile(user, dto);
  }

  @Patch('me/recruiter-profile')
  @Roles(Role.RECRUITER)
  updateRecruiterProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateRecruiterProfileDto,
  ) {
    return this.usersService.updateRecruiterProfile(user, dto);
  }

  @Patch('me/change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  deactivate(@CurrentUser() user: JwtPayload) {
    return this.usersService.deactivate(user);
  }

  @Post('me/push-subscription')
  @HttpCode(HttpStatus.OK)
  savePushSubscription(@CurrentUser() user: JwtPayload, @Body() subscription: object) {
    return this.usersService.savePushSubscription(user.sub, subscription);
  }

  @Delete('me/push-subscription')
  @HttpCode(HttpStatus.OK)
  removePushSubscription(@CurrentUser() user: JwtPayload) {
    return this.usersService.removePushSubscription(user.sub);
  }

  @Patch('me/settings')
  @HttpCode(HttpStatus.OK)
  updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateUserSettingsDto) {
    return this.usersService.updateSettings(user.sub, dto);
  }

  @Post('profile/whatsapp/send-otp')
  @Roles(Role.JOB_SEEKER)
  @HttpCode(HttpStatus.OK)
  sendWhatsAppOtp(@CurrentUser() user: JwtPayload) {
    return this.usersService.sendWhatsAppOtp(user.sub);
  }

  @Post('profile/whatsapp/verify-otp')
  @Roles(Role.JOB_SEEKER)
  @HttpCode(HttpStatus.OK)
  verifyWhatsAppOtp(@CurrentUser() user: JwtPayload, @Body() body: { code: string }) {
    return this.usersService.verifyWhatsAppOtp(user.sub, body.code);
  }
}
