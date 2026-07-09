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
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolsService } from './schools.service';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.RECRUITER)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(user, dto);
  }

  @Get('mine')
  @Roles(Role.RECRUITER)
  getMySchool(@CurrentUser() user: JwtPayload) {
    return this.schoolsService.getMySchool(user);
  }

  @Get(':id')
  getById(@Param('id', ParseObjectIdPipe) id: string) {
    return this.schoolsService.getById(id);
  }

  @Patch(':id')
  @Roles(Role.RECRUITER)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateSchoolDto,
  ) {
    return this.schoolsService.update(user, id, dto);
  }
}
