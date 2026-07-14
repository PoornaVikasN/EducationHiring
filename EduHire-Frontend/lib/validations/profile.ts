import { z } from 'zod';
import { Availability, AvailableTimings, Gender, MaritalStatus, SalaryRange, Subject, TeacherPost, TypeOfPractice } from '../shared/enums';

export const seekerProfileSchema = z.object({
  fullName: z.string().min(2, 'Name is required').max(80),
  headline: z.string().max(120).optional().or(z.literal('')),
  city: z.string().min(2, 'City is required').optional().or(z.literal('')),
  state: z.string().min(2, 'State is required').optional().or(z.literal('')),
  experienceYears: z.number().min(0).max(50).optional(),
  availability: z.nativeEnum(Availability).optional(),
  gender: z.nativeEnum(Gender).optional(),
  bio: z.string().max(500).optional().or(z.literal('')),
  skills: z.string().optional().or(z.literal('')),
  age: z.number().min(18, 'Must be at least 18').max(80).optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),
  degrees: z.array(z.string()).optional(),
  desiredCities: z.array(z.string()).optional(),
  whatsappNumber: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode').optional().or(z.literal('')),
  currentSchool: z.string().max(200).optional().or(z.literal('')),
  employmentType: z.nativeEnum(TypeOfPractice).optional(),
  expertise: z.array(z.nativeEnum(Subject)).optional(),
  academics: z.nativeEnum(TeacherPost).optional(),
  salaryRange: z.nativeEnum(SalaryRange).optional(),
  availableTimings: z.array(z.nativeEnum(AvailableTimings)).optional(),
  interestedToCover: z.array(z.nativeEnum(Subject)).optional(),
  indemnityInsurance: z.boolean().optional(),
  isRegisteredWithBoard: z.boolean().optional(),
  boardRegistrationName: z.string().max(200).optional().or(z.literal('')),
});

export type SeekerProfileFormValues = z.infer<typeof seekerProfileSchema>;

export const schoolProfileSchema = z.object({
  name: z.string().min(2, 'School name is required').max(120),
  registrationNumber: z.string().min(3, 'Affiliation number / recognition number is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  contactPhone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  contactEmail: z.string().email('Enter a valid email'),
  description: z.string().max(1000).optional().or(z.literal('')),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  noOfClassrooms: z.number().min(0).optional(),
  campusFacilities: z.array(z.string()).optional(),
  noOfLabsOrSpecialRooms: z.number().min(0).optional(),
  photos: z.array(z.string().url()).max(3).optional(),
  scopeOfServices: z.string().max(1000).optional().or(z.literal('')),
  schoolStrength: z.number().min(0).optional(),
  studentCapacity: z.number().min(0).optional(),
  accreditations: z.array(z.string()).optional(),
  departments: z.array(z.nativeEnum(Subject)).optional(),
});

export type SchoolProfileFormValues = z.infer<typeof schoolProfileSchema>;
