import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { RecaptchaService } from '../../common/recaptcha/recaptcha.service';
import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly recaptchaService: RecaptchaService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    await this.recaptchaService.verify(dto.recaptchaToken, 'register');
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, res, {
      ip: req.ip,
      userAgent: req.headers['user-agent']?.toString(),
    });
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleAuth(
    @Body() dto: GoogleAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.googleAuth(dto, res);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    await this.recaptchaService.verify(dto.recaptchaToken, 'otp_send');
    return this.authService.sendOtp(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifyOtp(dto, res, {
      ip: req.ip,
      userAgent: req.headers['user-agent']?.toString(),
    });
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body('email') email: string,
    @Body('recaptchaToken') recaptchaToken?: string,
  ) {
    await this.recaptchaService.verify(recaptchaToken, 'forgot_password');
    return this.authService.forgotPassword(email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body('email') email: string,
    @Body('otp') otp: string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(email, otp, password);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('activation/set-password')
  @HttpCode(HttpStatus.OK)
  setPasswordViaActivation(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.authService.completeActivation(token, password);
  }

  @Public()
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies['refresh_token'] as string | undefined;
    if (!token) {
      return { message: 'No refresh token' };
    }
    return this.authService.refresh(token, res);
  }

  @Public()
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies['refresh_token'] as string | undefined;
    return this.authService.logout(token, res);
  }
}
