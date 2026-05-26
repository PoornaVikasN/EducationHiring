'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { LocationAutocomplete } from '../../../../common-components/location-autocomplete';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { Button } from '../../../../common-components/ui/button';
import { Combobox } from '../../../../common-components/ui/combobox';
import { ExpertiseSelector } from '../../../../common-components/ui/expertise-selector';
import { Input } from '../../../../common-components/ui/input';
import { Label } from '../../../../common-components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../common-components/ui/select';
import { Textarea } from '../../../../common-components/ui/textarea';
import { jobsApi } from '../../../../lib/api/jobs';
import { hospitalsApi } from '../../../../lib/api/hospitals';
import { subscriptionsApi } from '../../../../lib/api/subscriptions';
import { uploadFile } from '../../../../lib/api/uploads';
import { useToast } from '../../../../hooks/use-toast';
import { useRazorpay } from '../../../../hooks/use-razorpay';
import { JobType, PaymentKind, SubscriptionStatus, UploadKind } from '../../../../lib/shared/enums';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { DEGREE_OPTIONS, DEPARTMENT_REQUIREMENTS_OPTIONS, EXPERTISE_OPTIONS, JOB_TIMING_DISPLAY_OPTIONS, RECRUITER_MONTHLY_PAISE } from '../../../../lib/shared/constants';
import { usePublicPricing, formatRupees } from '../../../../hooks/use-public-pricing';
import { createJobSchema, type CreateJobFormValues } from '../../../../lib/validations/jobs';

const DEPARTMENT_OPTIONS = ['Pre-Primary', 'Primary', 'Secondary', 'Senior Secondary', 'Arts & Crafts', 'Computer Science', 'Physical Education', 'Administration', 'Library', 'Counseling', 'Other'].map((d) => ({ value: d, label: d }));
const ROLE_OPTIONS = ['SGT (Standard Grade Teacher)', 'TGT (Trained Graduate Teacher)', 'PGT (Post Graduate Teacher)', 'Pre-Primary Teacher', 'Head Master / HM', 'Principal', 'Vice Principal', 'Special Educator', 'Lab Assistant', 'Librarian', 'Counselor', 'Other'].map((r) => ({ value: r, label: r }));

function NewJobForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { pricing } = usePublicPricing();
  const subMo = pricing.RECRUITER_MONTHLY_PAISE ?? RECRUITER_MONTHLY_PAISE;
  const { pay } = useRazorpay();
  const docRef = useRef<HTMLInputElement>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [jobDocumentUrl, setJobDocumentUrl] = useState<string | null>(null);
  const defaultType = JobType.FULL_TIME;

  const { data: hospital, isLoading: hospitalLoading } = useQuery({
    queryKey: ['my-hospital'],
    queryFn: () => hospitalsApi.getMine().then((r) => r.data).catch(() => null),
  });

  const { data: subscription } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionsApi.getMine().then((r) => r.data).catch(() => null),
  });

  const hasActiveSub = subscription?.status === SubscriptionStatus.ACTIVE
    && new Date(subscription.expiresAt) > new Date();

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobSchema) as Resolver<CreateJobFormValues>,
    defaultValues: { type: defaultType, experienceMin: 0, experienceMax: 5, salaryMin: 0, salaryMax: 0, departmentRequirements: [] },
  });

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

  const type = watch('type');

  const mutation = useMutation({
    mutationFn: (values: CreateJobFormValues) => {
      const requirements = values.requirements.split('\n').map((s) => s.trim()).filter(Boolean);
      return jobsApi.create({ ...values, requirements, openPositions: values.openPositions ?? 1, jobDocumentUrl: jobDocumentUrl ?? undefined, specializations: values.specializations, requiredDegree: values.requiredDegree || undefined });
    },
    onSuccess: (res) => {
      const job = res.data;
      if (job.status === 'PENDING_PAYMENT') {
        pay(
          PaymentKind.JOB_POST,
          job._id,
          `Teaching job listing — ${formatRupees(subMo)}/mo unlimited`,
          () => {
            toast({ title: 'Job posted!', description: 'Your job is now live.' });
            router.push('/recruiter/jobs');
          },
          () => {
            toast({ title: 'Job created, payment pending', description: 'Pay from My Jobs to activate.' });
            router.push('/recruiter/jobs');
          },
        );
      } else {
        toast({ title: 'Job posted!', description: 'Your job is now live.' });
        router.push('/recruiter/jobs');
      }
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? 'Failed to post job') : 'Failed to post job';
      toast({ title: 'Failed', description: typeof msg === 'string' ? msg : 'Please try again.', variant: 'destructive' });
    },
  });

  if (!hospitalLoading && !hospital) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/recruiter/jobs">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Post a Job</h1>
            <p className="text-sm text-text-muted">Fill in the details to post a new opening</p>
          </div>
        </div>
        <div className="flex flex-col items-center text-center bg-bg-card border border-amber-200 rounded-2xl p-10 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-text-primary">School profile required</p>
            <p className="text-sm text-text-muted mt-1 max-w-xs">You need to complete your school profile before you can post job listings.</p>
          </div>
          <Link href="/recruiter/hospital" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            <Building2 className="w-4 h-4" /> Set Up School Profile
          </Link>
        </div>
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
          <h1 className="text-xl font-bold text-text-primary">Post a Job</h1>
          <p className="text-sm text-text-muted">Fill in the details to post a new opening</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5">
        {/* Pricing info */}
        <div className="bg-brand-primary-light border border-brand-primary/20 rounded-2xl p-4 text-sm text-brand-primary">
          📋 <strong>2 free listings/month</strong> — or subscribe at {formatRupees(subMo)}/mo for unlimited postings.
          {hasActiveSub && <span className="ml-2 text-green-600 font-medium">✓ Active subscription</span>}
        </div>

        {/* Job Details */}
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
                onValueChange={(v) => setValue('department', v, { shouldDirty: true })}
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
                onValueChange={(v) => setValue('role', v, { shouldDirty: true })}
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
              onSelect={({ city, state, latitude, longitude }) => {
                setValue('city', city, { shouldDirty: true, shouldValidate: true });
                setValue('state', state, { shouldDirty: true, shouldValidate: true });
                if (latitude !== undefined) setValue('latitude', latitude, { shouldDirty: true });
                if (longitude !== undefined) setValue('longitude', longitude, { shouldDirty: true });
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

        {/* Experience & Salary */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">Experience & Salary *</h2>

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

        {/* Shift & Volume */}
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
              options={DEPARTMENT_REQUIREMENTS_OPTIONS}
              value={watch('departmentRequirements') ?? []}
              onValueChange={(v) => setValue('departmentRequirements', v, { shouldDirty: true })}
              searchPlaceholder="Search departments…"
              placeholder="Select required departments"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Specializations Required</Label>
            <ExpertiseSelector
              options={EXPERTISE_OPTIONS}
              value={watch('specializations') ?? []}
              onValueChange={(v) => setValue('specializations', v, { shouldDirty: true })}
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
            {jobDocumentUrl ? (
              <div className="flex items-center justify-between bg-brand-primary-light border border-brand-primary/20 rounded-xl px-4 py-3">
                <span className="text-sm text-brand-primary font-medium">Document uploaded ✓</span>
                <Button type="button" variant="outline" size="sm" onClick={() => docRef.current?.click()}>Replace</Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={() => docRef.current?.click()} disabled={docUploading}>
                {docUploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading…</> : <><Upload className="w-4 h-4 mr-2" />Upload Document</>}
              </Button>
            )}
          </div>
        </div>

        <div className="bg-brand-primary-light border border-brand-primary/20 rounded-xl p-4 text-sm text-brand-primary">
          {hasActiveSub
            ? '✓ You have an active subscription — your job will go live immediately after submitting.'
            : `📋 If you've used your 2 free listings this month, you'll be taken to the payment page after submitting.`}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
          {isSubmitting || mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Posting…</> : 'Post Job'}
        </Button>
      </form>
    </div>
  );
}

export default function NewJobPage() {
  return (
    <Suspense>
      <NewJobForm />
    </Suspense>
  );
}
