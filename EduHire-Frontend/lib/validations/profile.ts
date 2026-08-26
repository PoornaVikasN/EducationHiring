import { z } from 'zod';
import { Availability, AvailableTimings, Gender, MaritalStatus, SalaryRange, Subject, TeacherPost, TypeOfPractice } from '../shared/enums';

// register(name, { valueAsNumber: true }) reads input.valueAsNumber, which is NaN
// (not undefined) for a cleared/blank <input type="number">. Left as a bare
// z.number().optional(), that NaN fails validation instead of satisfying
// "optional" — silently blocking the whole form's submit for any user who
// leaves the field blank, with no visible error. Coerce NaN to undefined first.
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((v) => (typeof v === 'number' && Number.isNaN(v) ? undefined : v), schema.optional());

export const seekerProfileSchema = z.object({
  fullName: z.string().min(2, 'Name is required').max(80),
  headline: z.string().max(120).optional().or(z.literal('')),
  city: z.string().min(2, 'City is required').optional().or(z.literal('')),
  state: z.string().min(2, 'State is required').optional().or(z.literal('')),
  experienceYears: optionalNumber(z.number().min(0).max(50)),
  availability: z.nativeEnum(Availability).optional(),
  gender: z.nativeEnum(Gender).optional(),
  bio: z.string().max(500).optional().or(z.literal('')),
  skills: z.string().optional().or(z.literal('')),
  age: optionalNumber(z.number().min(18, 'Must be at least 18').max(80)),
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
  name: z.string({ message: 'School name is required' }).min(2, 'School name is required').max(120),
  registrationNumber: z.string({ message: 'Affiliation number / recognition number is required' }).min(3, 'Affiliation number / recognition number is required'),
  address: z.string({ message: 'Address is required' }).min(5, 'Address is required'),
  city: z.string({ message: 'City is required — select a location from the search suggestions' }).min(2, 'City is required — select a location from the search suggestions'),
  state: z.string({ message: 'State is required — select a location from the search suggestions' }).min(2, 'State is required — select a location from the search suggestions'),
  pincode: z.string({ message: 'Pincode is required' }).regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  contactPhone: z.string({ message: 'Contact phone is required' }).regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  contactEmail: z.string().email('Enter a valid email'),
  description: z.string().max(1000).optional().or(z.literal('')),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  noOfClassrooms: optionalNumber(z.number().min(0)),
  campusFacilities: z.array(z.string()).optional(),
  noOfLabsOrSpecialRooms: optionalNumber(z.number().min(0)),
  photos: z.array(z.string().url()).max(3).optional(),
  scopeOfServices: z.string().max(1000).optional().or(z.literal('')),
  schoolStrength: optionalNumber(z.number().min(0)),
  studentCapacity: optionalNumber(z.number().min(0)),
  accreditations: z.array(z.string()).optional(),
  departments: z.array(z.nativeEnum(Subject)).optional(),
});

export type SchoolProfileFormValues = z.infer<typeof schoolProfileSchema>;
