import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { HospitalDepartment } from '../../../shared/enums';

export class CreateHospitalDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  registrationNumber!: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsString()
  @MaxLength(300)
  address!: string;

  @IsString()
  @MaxLength(100)
  city!: string;

  @IsString()
  @MaxLength(100)
  state!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Pincode must be 6 digits' })
  pincode!: string;

  @IsEmail()
  contactEmail!: string;

  @Matches(/^\+91[6-9]\d{9}$/, { message: 'Phone must be a valid Indian mobile number' })
  contactPhone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  noOfOperationTheatres?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hospitalInfra?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  noOfCabinsAndBeds?: number;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMaxSize(3)
  photos?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  scopeOfServices?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  hospitalStrength?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  noOfBeds?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accreditations?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(HospitalDepartment, { each: true })
  departments?: HospitalDepartment[];

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
