import { z } from 'zod';
import { JobType } from '../shared/enums';

export const createJobSchema = z.object({
  type: z.nativeEnum(JobType),
  title: z.string().min(3, 'Title is too short').max(120),
  description: z.string().min(20, 'Description is too short').max(2000),
  requirements: z.string().min(5, 'Add at least one requirement'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  department: z.string().min(2, 'Department is required'),
  role: z.string().min(2, 'Role is required'),
  experienceMin: z.number({ message: 'Enter a number' }).min(0, 'Min 0').max(50, 'Max 50 years'),
  experienceMax: z.number({ message: 'Enter a number' }).min(0, 'Min 0').max(50, 'Max 50 years'),
  salaryMin: z.number({ message: 'Enter a number' }).min(0, 'Min 0'),
  salaryMax: z.number({ message: 'Enter a number' }).min(0, 'Min 0'),
  jobTimingStart: z.string().optional(),
  jobTimingEnd: z.string().optional(),
  noOfCasesPerMonth: z.number().min(0, 'Min 0').optional(),
  departmentRequirements: z.array(z.string()).optional(),
  openPositions: z.number().int().min(1).max(50).default(1),
  jobDocumentUrl: z.string().url().optional().or(z.literal('')),
  specializations: z.array(z.string()).optional(),
  requiredDegree: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).refine((d) => d.experienceMax >= d.experienceMin, {
  message: 'Max must be ≥ min',
  path: ['experienceMax'],
}).refine((d) => d.salaryMax >= d.salaryMin, {
  message: 'Max must be ≥ min',
  path: ['salaryMax'],
});

export type CreateJobFormValues = z.infer<typeof createJobSchema>;
