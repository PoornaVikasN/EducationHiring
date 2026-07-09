'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, ExternalLink, Loader2, Upload } from 'lucide-react';
import { LocationAutocomplete } from '../../../../../common-components/location-autocomplete';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { Button } from '../../../../../common-components/ui/button';
import { Combobox } from '../../../../../common-components/ui/combobox';
import { ExpertiseSelector } from '../../../../../common-components/ui/expertise-selector';
import { Input } from '../../../../../common-components/ui/input';
import { Label } from '../../../../../common-components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../common-components/ui/select';
import { Textarea } from '../../../../../common-components/ui/textarea';
import { jobsApi } from '../../../../../lib/api/jobs';
import { uploadFile } from '../../../../../lib/api/uploads';
import { useToast } from '../../../../../hooks/use-toast';
import { JobDepartment, Subject, TeacherPost, UploadKind } from '../../../../../lib/shared/enums';
import { DEGREE_OPTIONS, JOB_TIMING_DISPLAY_OPTIONS } from '../../../../../lib/shared/constants';
import { createJobSchema, type CreateJobFormValues } from '../../../../../lib/validations/jobs';
import { enumComboboxOptions, enumLabel } from '../../../../../lib/utils/enum-options';

const DEPARTMENT_OPTIONS = enumComboboxOptions(JobDepartment);
const ROLE_OPTIONS = enumComboboxOptions(TeacherPost);
const SUBJECT_OPTIONS = Object.values(Subject);
const JOB_DEPARTMENT_OPTIONS = Object.values(JobDepartment);

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const docRef = useRef<HTMLInputElement>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [jobDocumentUrl, setJobDocumentUrl] = useState<string | null>(null);
  const [existingDocUrl, setExistingDocUrl] = useState<string | null>(null);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job-detail', params.id],
    queryFn: () => jobsApi.getMyById(params.id).then((r) => r.data),
    enabled: !!params.id,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobSchema) as Resolver<CreateJobFormValues>,
    defaultValues: { experienceMin: 0, experienceMax: 5, salaryMin: 0, salaryMax: 0, departmentRequirements: [] },
  });

  useEffect(() => {
    if (!job) return;
    const existingDoc = job.jobDocumentUrl ?? null;
    setExistingDocUrl(existingDoc);
    reset({
      title: job.title,
      description: job.description,
      requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : job.requirements,
      city: job.city,
      state: job.state,
      department: job.department,
      role: job.role,
      experienceMin: job.experienceMin ?? 0,
      experienceMax: job.experienceMax ?? 5,
      salaryMin: job.salaryMin ?? 0,
      salaryMax: job.salaryMax ?? 0,
      jobTimingStart: job.jobTimingStart ?? undefined,
      jobTimingEnd: job.jobTimingEnd ?? undefined,
      noOfCasesPerMonth: job.noOfCasesPerMonth ?? undefined,
      departmentRequirements: job.departmentRequirements ?? [],
      specializations: job.specializations ?? [],
      requiredDegree: job.requiredDegree ?? undefined,
      openPositions: job.openPositions ?? 1,
      jobDocumentUrl: existingDoc ?? undefined,
    });
  }, [job, reset]);

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocUploading(true);
    try {
      const url = await uploadFile(UploadKind.DOCUMENT, file);
      setJobDocumentUrl(url);
      setValue('jobDocumentUrl', url, { shouldDirty: true });
      toast({ title: 'Document uploaded!' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setDocUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: (values: CreateJobFormValues) => {
      const requirements = values.requirements.split('\n').map((s) => s.trim()).filter(Boolean);
      const docUrl = jobDocumentUrl ?? existingDocUrl ?? undefined;
      return jobsApi.update(params.id, { ...values, requirements, openPositions: values.openPositions ?? 1, jobDocumentUrl: docUrl, specializations: values.specializations, requiredDegree: values.requiredDegree || undefined });
    },
    onSuccess: () => {
      toast({ title: 'Job updated!', description: 'Your changes are now live.' });
      qc.invalidateQueries({ queryKey: ['recruiter-jobs'] });
      qc.invalidateQueries({ queryKey: ['job-detail', params.id] });
      router.push('/recruiter/jobs');
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? 'Failed to update job') : 'Failed to update job';
      toast({ title: 'Failed', description: typeof msg === 'string' ? msg : 'Please try again.', variant: 'destructive' });
    },
  });

  const activeDocUrl = jobDocumentUrl ?? existingDocUrl;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-border-default animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-5 w-32 bg-border-default rounded animate-pulse" />
            <div className="h-3.5 w-48 bg-border-default rounded animate-pulse" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-bg-card border border-border-default rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/recruiter/jobs">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Edit Job</h1>
          <p className="text-sm text-text-muted">{job?.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5">
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">Job Details</h2>

          <div className="space-y-1.5">
            <Label htmlFor="title">Job Title *</Label>
            <Input id="title" placeholder="PGT Mathematics — Secondary Section" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Combobox
                options={DEPARTMENT_OPTIONS}
                value={watch('department') ?? ''}
                onValueChange={(v) => setValue('department', v as JobDepartment, { shouldDirty: true })}
                placeholder="Select department"
                searchPlaceholder="Search department…"
              />
              {errors.department && <p className="text-xs text-red-500">{errors.department.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Combobox
                options={ROLE_OPTIONS}
                value={watch('role') ?? ''}
                onValueChange={(v) => setValue('role', v as TeacherPost, { shouldDirty: true })}
                placeholder="Select role"
                searchPlaceholder="Search role…"
              />
              {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>City / Location *</Label>
            <LocationAutocomplete
              defaultValue={watch('city') ?? ''}
              placeholder="Search city or area…"
              onSelect={({ city, state }) => {
                setValue('city', city, { shouldDirty: true, shouldValidate: true });
                setValue('state', state, { shouldDirty: true, shouldValidate: true });
              }}
              onClear={() => {
                setValue('city', '', { shouldDirty: true });
                setValue('state', '', { shouldDirty: true });
              }}
            />
            {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="state">State *</Label>
            <Input id="state" placeholder="Auto-filled from location" {...register('state')} />
            {errors.state && <p className="text-xs text-red-500">{errors.state.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Job Description *</Label>
            <Textarea id="description" placeholder="Describe the role, responsibilities, and work environment…" rows={4} {...register('description')} />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="requirements">Requirements (one per line) *</Label>
            <Textarea id="requirements" placeholder="B.Ed or D.Ed qualified&#10;Minimum 1 year teaching experience&#10;Strong subject knowledge preferred" rows={4} {...register('requirements')} />
            {errors.requirements && <p className="text-xs text-red-500">{errors.requirements.message}</p>}
          </div>
        </div>

        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">Shift & Volume (optional)</h2>

          <div className="space-y-1.5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Shift Start Time</Label>
                <Select value={watch('jobTimingStart') ?? ''} onValueChange={(v) => setValue('jobTimingStart', v, { shouldDirty: true })}>
                  <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                  <SelectContent>
                    {JOB_TIMING_DISPLAY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Shift End Time</Label>
                <Select value={watch('jobTimingEnd') ?? ''} onValueChange={(v) => setValue('jobTimingEnd', v, { shouldDirty: true })}>
                  <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                  <SelectContent>
                    {JOB_TIMING_DISPLAY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(() => {
              const start = watch('jobTimingStart');
              const end = watch('jobTimingEnd');
              if (!start || !end) return null;
              const [sh, sm] = start.split(':').map(Number);
              const [eh, em] = end.split(':').map(Number);
              let diff = (eh * 60 + em) - (sh * 60 + sm);
              if (diff <= 0) diff += 24 * 60;
              const hrs = Math.floor(diff / 60);
              const mins = diff % 60;
              const label = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
              return <p className="text-xs text-brand-primary font-medium mt-1">⏱ Shift duration: {label}</p>;
            })()}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="noOfCasesPerMonth">No. of Students per Class (optional)</Label>
            <Input id="noOfCasesPerMonth" type="number" min={0} placeholder="30" onFocus={(e) => e.target.select()} {...register('noOfCasesPerMonth', { setValueAs: (v: string) => v === '' ? undefined : Number(v) })} />
          </div>

          <div className="space-y-1.5">
            <Label>Department Requirements</Label>
            <ExpertiseSelector
              options={JOB_DEPARTMENT_OPTIONS}
              formatLabel={enumLabel}
              value={watch('departmentRequirements') ?? []}
              onValueChange={(v) => setValue('departmentRequirements', v as JobDepartment[], { shouldDirty: true })}
              searchPlaceholder="Search departments…"
              placeholder="Select required departments"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Specializations Required</Label>
            <ExpertiseSelector
              options={SUBJECT_OPTIONS}
              formatLabel={enumLabel}
              value={watch('specializations') ?? []}
              onValueChange={(v) => setValue('specializations', v as Subject[], { shouldDirty: true })}
              searchPlaceholder="Search specializations…"
              placeholder="Select required specializations"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Required Degree</Label>
            <Select value={watch('requiredDegree') ?? ''} onValueChange={(v) => setValue('requiredDegree', v, { shouldDirty: true })}>
              <SelectTrigger><SelectValue placeholder="Select required degree (optional)" /></SelectTrigger>
              <SelectContent>
                {DEGREE_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Job Document (optional)</Label>
            <input ref={docRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={handleDocUpload} />
            {activeDocUrl ? (
              <div className="flex items-center justify-between bg-brand-primary-light border border-brand-primary/20 rounded-xl px-4 py-3">
                <a href={activeDocUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-primary font-medium flex items-center gap-1.5 hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> View Document
                </a>
                <Button type="button" variant="outline" size="sm" onClick={() => docRef.current?.click()}>Replace</Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={() => docRef.current?.click()} disabled={docUploading}>
                {docUploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading…</> : <><Upload className="w-4 h-4 mr-2" />Upload Document</>}
              </Button>
            )}
          </div>
        </div>

        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">Experience & Salary *</h2>

          <div className="space-y-1.5">
            <Label htmlFor="openPositions">Number of Positions *</Label>
            <Input
              id="openPositions"
              type="number"
              min={1}
              max={50}
              placeholder="1"
              onFocus={(e) => e.target.select()}
              {...register('openPositions', { valueAsNumber: true })}
            />
            {errors.openPositions && <p className="text-xs text-red-500">{errors.openPositions.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="experienceMin">Min Experience (years) *</Label>
              <Input id="experienceMin" type="number" min={0} placeholder="0" onFocus={(e) => e.target.select()} {...register('experienceMin', { valueAsNumber: true })} />
              {errors.experienceMin && <p className="text-xs text-red-500">{errors.experienceMin.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experienceMax">Max Experience (years) *</Label>
              <Input id="experienceMax" type="number" min={0} placeholder="5" onFocus={(e) => e.target.select()} {...register('experienceMax', { valueAsNumber: true })} />
              {errors.experienceMax && <p className="text-xs text-red-500">{errors.experienceMax.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="salaryMin">Min Salary (₹/month) *</Label>
              <Input id="salaryMin" type="number" min={0} placeholder="20000" onFocus={(e) => e.target.select()} {...register('salaryMin', { valueAsNumber: true })} />
              {errors.salaryMin && <p className="text-xs text-red-500">{errors.salaryMin.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salaryMax">Max Salary (₹/month) *</Label>
              <Input id="salaryMax" type="number" min={0} placeholder="40000" onFocus={(e) => e.target.select()} {...register('salaryMax', { valueAsNumber: true })} />
              {errors.salaryMax && <p className="text-xs text-red-500">{errors.salaryMax.message}</p>}
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
          {isSubmitting || mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}
