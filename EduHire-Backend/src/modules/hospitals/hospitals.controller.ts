import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { Role } from '../../shared/enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { HospitalsService } from './hospitals.service';

@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.RECRUITER)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateHospitalDto) {
    return this.hospitalsService.create(user, dto);
  }

  @Get('mine')
  @Roles(Role.RECRUITER)
  getMyHospital(@CurrentUser() user: JwtPayload) {
    return this.hospitalsService.getMyHospital(user);
  }

  @Get(':id')
  getById(@Param('id', ParseObjectIdPipe) id: string) {
    return this.hospitalsService.getById(id);
  }

  @Patch(':id')
  @Roles(Role.RECRUITER)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateHospitalDto,
  ) {
    return this.hospitalsService.update(user, id, dto);
  }
}
