'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CheckCircle, Loader2, MapPin, Upload, User, X } from 'lucide-react';
import { LocationAutocomplete } from '../../../common-components/location-autocomplete';
import { useEffect, useRef, useState } from 'react';

import { useForm } from 'react-hook-form';
import { Button } from '../../../common-components/ui/button';
import { ExpertiseSelector } from '../../../common-components/ui/expertise-selector';
import { Input } from '../../../common-components/ui/input';
import { Label } from '../../../common-components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../common-components/ui/select';
import { Switch } from '../../../common-components/ui/switch';
import { Textarea } from '../../../common-components/ui/textarea';
import { uploadFile } from '../../../lib/api/uploads';
import { usersApi, type SeekerProfilePayload } from '../../../lib/api/users';
import { useAuth } from '../../../lib/auth-context';
import { useToast } from '../../../hooks/use-toast';
import type { Resolver } from 'react-hook-form';
import {
  Academics,
  Availability,
  AvailableTimings,
  Gender,
  MaritalStatus,
  SalaryRange,
  TypeOfPractice,
  UploadKind,
} from '../../../lib/shared/enums';
import {
  DEGREE_OPTIONS,
  EXPERTISE_OPTIONS,
  INTERESTED_TO_COVER_OPTIONS,
  SALARY_RANGE_LABELS,
} from '../../../lib/shared/constants';
import { seekerProfileSchema, type SeekerProfileFormValues } from '../../../lib/validations/profile';

const TIMINGS_OPTIONS: { value: AvailableTimings; label: string }[] = [
  { value: AvailableTimings.TWENTY_FOUR_SEVEN, label: '24/7' },
  { value: AvailableTimings.MORNING, label: 'Morning' },
  { value: AvailableTimings.NINE_TO_FIVE, label: '9 to 5' },
  { value: AvailableTimings.EVENING, label: 'Evening' },
  { value: AvailableTimings.NIGHT, label: 'Night' },
];

export default function SeekerProfilePage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const resumeRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [otpInlineOpen, setOtpInlineOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [cityPickerKey, setCityPickerKey] = useState(0);
  const locationCoordsRef = useRef<{ latitude?: number; longitude?: number }>({});

  const profile = user?.seekerProfile as Record<string, unknown> | null;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isDirty, isSubmitting } } = useForm<SeekerProfileFormValues>({
    resolver: zodResolver(seekerProfileSchema) as Resolver<SeekerProfileFormValues>,
    defaultValues: {
      fullName: (profile?.fullName as string) ?? '',
      headline: (profile?.headline as string) ?? '',
      city: (profile?.city as string) ?? '',
      state: (profile?.state as string) ?? '',
      experienceYears: (profile?.experienceYears as number) ?? 0,
      availability: (profile?.availability as Availability) ?? undefined,
      gender: (profile?.gender as Gender) ?? undefined,
      bio: (profile?.bio as string) ?? '',
      skills: ((profile?.skills as string[])?.join(', ')) ?? '',
      age: (profile?.age as number) ?? undefined,
      maritalStatus: (profile?.maritalStatus as MaritalStatus) ?? undefined,
      degrees: (profile?.degrees as string[]) ?? [],
      desiredCities: (profile?.desiredCities as string[]) ?? [],
      whatsappNumber: ((profile?.whatsappNumber as string) ?? '').replace(/^\+91/, ''),
      pincode: (profile?.pincode as string) ?? '',
      placeOfPractice: (profile?.placeOfPractice as string) ?? '',
      typeOfPractice: (profile?.typeOfPractice as TypeOfPractice) ?? undefined,
      expertise: (profile?.expertise as string[]) ?? [],
      academics: (profile?.academics as Academics) ?? undefined,
      salaryRange: (profile?.salaryRange as SalaryRange) ?? undefined,
      availableTimings: (profile?.availableTimings as AvailableTimings[]) ?? [],
      interestedToCover: (profile?.interestedToCover as string[]) ?? [],
      indemnityInsurance: (profile?.indemnityInsurance as boolean) ?? false,
      isRegisteredInCouncil: (profile?.isRegisteredInCouncil as boolean) ?? undefined,
      medicalCouncilName: (profile?.medicalCouncilName as string) ?? '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        fullName: (profile.fullName as string) ?? '',
        headline: (profile.headline as string) ?? '',
        city: (profile.city as string) ?? '',
        state: (profile.state as string) ?? '',
        experienceYears: (profile.experienceYears as number) ?? 0,
        availability: (profile.availability as Availability) ?? undefined,
        gender: (profile.gender as Gender) ?? undefined,
        bio: (profile.bio as string) ?? '',
        skills: ((profile.skills as string[])?.join(', ')) ?? '',
        age: (profile.age as number) ?? undefined,
        maritalStatus: (profile.maritalStatus as MaritalStatus) ?? undefined,
        degrees: (profile.degrees as string[]) ?? [],
        desiredCities: (profile.desiredCities as string[]) ?? [],
        whatsappNumber: ((profile.whatsappNumber as string) ?? '').replace(/^\+91/, ''),
        pincode: (profile.pincode as string) ?? '',
        placeOfPractice: (profile.placeOfPractice as string) ?? '',
        typeOfPractice: (profile.typeOfPractice as TypeOfPractice) ?? undefined,
        expertise: (profile.expertise as string[]) ?? [],
        academics: (profile.academics as Academics) ?? undefined,
        salaryRange: (profile.salaryRange as SalaryRange) ?? undefined,
        availableTimings: (profile.availableTimings as AvailableTimings[]) ?? [],
        interestedToCover: (profile.interestedToCover as string[]) ?? [],
        indemnityInsurance: (profile.indemnityInsurance as boolean) ?? false,
        isRegisteredInCouncil: (profile.isRegisteredInCouncil as boolean) ?? undefined,
        medicalCouncilName: (profile.medicalCouncilName as string) ?? '',
      });
      setResumeUrl((profile.resumeUrl as string) ?? null);
    }
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (values: SeekerProfileFormValues) => {
      const payload: SeekerProfilePayload = {
        fullName: values.fullName,
        headline: values.headline || undefined,
        city: values.city || undefined,
        state: values.state || undefined,
        ...locationCoordsRef.current,
        experienceYears: values.experienceYears,
        availability: values.availability,
        gender: values.gender,
        bio: values.bio || undefined,
        resumeUrl: resumeUrl ?? undefined,
        skills: values.skills ? values.skills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        age: values.age,
        maritalStatus: values.maritalStatus,
        degrees: values.degrees,
        desiredCities: values.desiredCities,
        whatsappNumber: values.whatsappNumber ? `+91${values.whatsappNumber}` : undefined,
        pincode: values.pincode || undefined,
        placeOfPractice: values.placeOfPractice || undefined,
        typeOfPractice: values.typeOfPractice,
        expertise: values.expertise,
        academics: values.academics,
        salaryRange: values.salaryRange,
        availableTimings: values.availableTimings,
        interestedToCover: values.interestedToCover,
        indemnityInsurance: values.indemnityInsurance,
        isRegisteredInCouncil: values.isRegisteredInCouncil,
        medicalCouncilName: values.medicalCouncilName || undefined,
      };
      return usersApi.updateSeekerProfile(payload);
    },
    onSuccess: (res) => {
      updateUser(res.data);
      toast({ title: 'Profile updated!' });
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? 'Update failed') : 'Update failed';
      toast({ title: 'Update failed', description: typeof msg === 'string' ? msg : 'Please try again.', variant: 'destructive' });
    },
  });

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(UploadKind.RESUME, file);
      setResumeUrl(url);
      toast({ title: 'Resume uploaded!' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSendOtp = async () => {
    setOtpSending(true);
    setOtpError('');
    try {
      await usersApi.sendWhatsAppOtp();
      setOtpInlineOpen(true);
      setOtpCode('');
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? 'Failed to send OTP') : 'Failed to send OTP';
      toast({ title: typeof msg === 'string' ? msg : 'Failed to send OTP', variant: 'destructive' });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) { setOtpError('Enter the 6-digit OTP'); return; }
    setOtpVerifying(true);
    setOtpError('');
    try {
      await usersApi.verifyWhatsAppOtp(otpCode);
      setOtpInlineOpen(false);
      if (user?.seekerProfile) {
        updateUser({ ...user, seekerProfile: { ...(user.seekerProfile as Record<string, unknown>), whatsappVerified: true } });
      }
      toast({ title: 'WhatsApp number verified!' });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? 'Verification failed') : 'Verification failed';
      setOtpError(typeof msg === 'string' ? msg : 'Verification failed');
    } finally {
      setOtpVerifying(false);
    }
  };

  const watchedTimings = watch('availableTimings') ?? [];

  const toggleTiming = (t: AvailableTimings) => {
    const current = watch('availableTimings') ?? [];
    setValue(
      'availableTimings',
      current.includes(t) ? current.filter((x) => x !== t) : [...current, t],
      { shouldDirty: true },
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2"><User className="w-5 h-5" /> My Profile</h1>
        <p className="text-sm text-text-muted mt-0.5">Keep your profile updated to get the best job matches</p>
      </div>

      {/* ── Account Contact (read-only) ──────────────────────────────── */}
      {(user?.email || user?.phone) && (
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">Account Contact</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {user.email && (
              <div className="space-y-1">
                <p className="text-xs text-text-muted">Email</p>
                <p className="text-sm text-text-primary font-medium">{user.email}</p>
              </div>
            )}
            {user.phone && (
              <div className="space-y-1">
                <p className="text-xs text-text-muted">Phone</p>
                <p className="text-sm text-text-primary font-medium">{user.phone}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-text-muted">These are set at registration and cannot be changed here.</p>
        </div>
      )}

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5">

        {/* ── Basic Information ───────────────────────────────────────── */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">Basic Information</h2>

          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" placeholder="Priya Sharma" {...register('fullName')} />
            {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="headline">Professional Headline</Label>
            <Input id="headline" placeholder="Mathematics Teacher with 5+ years in CBSE schools" {...register('headline')} />
            {errors.headline && <p className="text-xs text-red-500">{errors.headline.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted select-none pointer-events-none">+91</span>
              <Input
                id="whatsappNumber"
                placeholder="9876543210"
                className="pl-10 pr-16"
                {...register('whatsappNumber')}
              />
              {(profile?.whatsappVerified as boolean) ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                  <CheckCircle className="w-4 h-4" />
                </span>
              ) : watch('whatsappNumber') && !otpInlineOpen ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-primary hover:underline disabled:opacity-50"
                >
                  {otpSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                </button>
              ) : null}
            </div>
            {errors.whatsappNumber && <p className="text-xs text-red-500">{errors.whatsappNumber.message}</p>}

            {otpInlineOpen && (
              <div className="mt-2 p-3 rounded-xl border border-brand-primary/30 bg-brand-primary/5 space-y-2">
                <p className="text-xs text-text-muted">Enter the 6-digit OTP sent to your WhatsApp</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="• • • • • •"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                    className="flex-1 text-center tracking-widest font-mono text-lg"
                  />
                  <Button type="button" size="sm" onClick={handleVerifyOtp} disabled={otpVerifying}>
                    {otpVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                  </Button>
                </div>
                {otpError && <p className="text-xs text-red-500">{otpError}</p>}
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending}
                  className="text-xs text-text-muted hover:text-brand-primary disabled:opacity-50"
                >
                  {otpSending ? 'Sending…' : 'Resend OTP'}
                </button>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" min={18} max={80} placeholder="28" onFocus={(e) => e.target.select()} {...register('age', { valueAsNumber: true })} />
              {errors.age && <p className="text-xs text-red-500">{errors.age.message}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={watch('gender') ?? ''} onValueChange={(v) => setValue('gender', v as Gender, { shouldDirty: true })}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={Gender.MALE}>Male</SelectItem>
                  <SelectItem value={Gender.FEMALE}>Female</SelectItem>
                  <SelectItem value={Gender.OTHER}>Other</SelectItem>
                  <SelectItem value={Gender.PREFER_NOT_TO_SAY}>Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Marital Status</Label>
              <Select value={watch('maritalStatus') ?? ''} onValueChange={(v) => setValue('maritalStatus', v as MaritalStatus, { shouldDirty: true })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={MaritalStatus.SINGLE}>Single</SelectItem>
                  <SelectItem value={MaritalStatus.MARRIED}>Married</SelectItem>
                  <SelectItem value={MaritalStatus.DIVORCED}>Divorced</SelectItem>
                  <SelectItem value={MaritalStatus.WIDOWED}>Widowed</SelectItem>
                  <SelectItem value={MaritalStatus.PREFER_NOT_TO_SAY}>Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Location ────────────────────────────────────────────────── */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">Location</h2>

          <div className="space-y-1.5">
            <Label>Search Location *</Label>
            <LocationAutocomplete
              defaultValue={watch('city') ?? ''}
              placeholder="Search city or area…"
              onSelect={({ city, state, pincode, latitude, longitude }) => {
                setValue('city', city, { shouldDirty: true, shouldValidate: true });
                setValue('state', state, { shouldDirty: true });
                if (pincode) setValue('pincode', pincode, { shouldDirty: true });
                locationCoordsRef.current = { latitude, longitude };
              }}
              onClear={() => {
                setValue('city', '', { shouldDirty: true });
                setValue('state', '', { shouldDirty: true });
                setValue('pincode', '', { shouldDirty: true });
                locationCoordsRef.current = {};
              }}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" placeholder="Auto-filled from location" {...register('state')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" placeholder="Auto-filled from location" maxLength={6} {...register('pincode')} />
              {errors.pincode && <p className="text-xs text-red-500">{errors.pincode.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Current School / Institution</Label>
            <LocationAutocomplete
              defaultValue={watch('placeOfPractice') ?? ''}
              placeholder="Search school or institution name…"
              onSelect={({ displayText }) => setValue('placeOfPractice', displayText, { shouldDirty: true })}
              onClear={() => setValue('placeOfPractice', '', { shouldDirty: true })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Employment Type</Label>
            <Select value={watch('typeOfPractice') ?? ''} onValueChange={(v) => setValue('typeOfPractice', v as TypeOfPractice, { shouldDirty: true })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TypeOfPractice.REGULAR_JOB}>Full-time / Regular</SelectItem>
                <SelectItem value={TypeOfPractice.FREELANCE}>Part-time / Visiting</SelectItem>
                <SelectItem value={TypeOfPractice.PRIVATE}>Private Tutor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Preferred Job Locations</Label>
            <LocationAutocomplete
              key={cityPickerKey}
              placeholder="Search a city to add…"
              onSelect={({ city, displayText }) => {
                const name = city || displayText;
                if (!name) return;
                const current = watch('desiredCities') ?? [];
                if (!current.includes(name)) {
                  setValue('desiredCities', [...current, name], { shouldDirty: true });
                }
                setCityPickerKey((k) => k + 1);
              }}
            />
            {(watch('desiredCities') ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {(watch('desiredCities') ?? []).map((city) => (
                  <span key={city} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary">
                    <MapPin className="w-3 h-3" />
                    {city}
                    <button
                      type="button"
                      onClick={() => setValue('desiredCities', (watch('desiredCities') ?? []).filter((c) => c !== city), { shouldDirty: true })}
                      className="ml-0.5 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${city}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-text-muted">Add cities where you'd like to work — used for job alerts.</p>
          </div>
        </div>

        {/* ── Professional Details ─────────────────────────────────────── */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">Professional Details</h2>

          <div className="space-y-1.5">
            <Label>Subjects / Specialisation</Label>
            <ExpertiseSelector
              options={EXPERTISE_OPTIONS}
              value={watch('expertise') ?? []}
              onValueChange={(v) => setValue('expertise', v, { shouldDirty: true })}
              searchPlaceholder="Search subjects…"
              placeholder="Select subjects you teach"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Degrees / Qualifications</Label>
            <ExpertiseSelector
              options={DEGREE_OPTIONS}
              value={watch('degrees') ?? []}
              onValueChange={(v) => setValue('degrees', v, { shouldDirty: true })}
              searchPlaceholder="Search degrees…"
              placeholder="Select your qualifications"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="experienceYears">Years of Experience</Label>
              <Input id="experienceYears" type="number" min={0} max={50} onFocus={(e) => e.target.select()} {...register('experienceYears', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Expected Salary</Label>
              <Select value={watch('salaryRange') ?? ''} onValueChange={(v) => setValue('salaryRange', v as SalaryRange, { shouldDirty: true })}>
                <SelectTrigger><SelectValue placeholder="Select salary range" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SALARY_RANGE_LABELS) as SalaryRange[]).map((key) => (
                    <SelectItem key={key} value={key}>{SALARY_RANGE_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Availability</Label>
              <Select value={watch('availability') ?? ''} onValueChange={(v) => setValue('availability', v as Availability, { shouldDirty: true })}>
                <SelectTrigger><SelectValue placeholder="Select availability" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={Availability.IMMEDIATE}>Immediate</SelectItem>
                  <SelectItem value={Availability.WITHIN_2_WEEKS}>Within 2 weeks</SelectItem>
                  <SelectItem value={Availability.WITHIN_1_MONTH}>Within 1 month</SelectItem>
                  <SelectItem value={Availability.READY_TO_SERVE_NOTICE}>Ready to serve notice period</SelectItem>
                  <SelectItem value={Availability.NOT_LOOKING}>Not actively looking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Academics</Label>
              <Select value={watch('academics') ?? ''} onValueChange={(v) => setValue('academics', v as Academics, { shouldDirty: true })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={Academics.INTERNSHIP}>Internship</SelectItem>
                  <SelectItem value={Academics.GRADUATE}>Graduate</SelectItem>
                  <SelectItem value={Academics.POST_GRADUATE}>Post Graduate</SelectItem>
                  <SelectItem value={Academics.ASST_PROFESSOR}>Assistant Professor</SelectItem>
                  <SelectItem value={Academics.ASSOCIATE_PROFESSOR}>Associate Professor</SelectItem>
                  <SelectItem value={Academics.PROFESSOR}>Professor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Available Timings</Label>
            <div className="flex flex-wrap gap-2">
              {TIMINGS_OPTIONS.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  size="sm"
                  variant={watchedTimings.includes(t.value) ? 'default' : 'outline'}
                  onClick={() => toggleTiming(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Subjects Willing to Cover (as Substitute)</Label>
            <ExpertiseSelector
              options={INTERESTED_TO_COVER_OPTIONS}
              value={watch('interestedToCover') ?? []}
              onValueChange={(v) => setValue('interestedToCover', v, { shouldDirty: true })}
              searchPlaceholder="Search subjects…"
              placeholder="Select subjects you can cover"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border-default px-4 py-3">
            <div>
              <p className="text-sm font-medium text-text-primary">Registered with Teaching Council / Board</p>
              <p className="text-xs text-text-muted">Are you registered with a teaching or education council?</p>
            </div>
            <Switch
              checked={watch('isRegisteredInCouncil') ?? false}
              onCheckedChange={(v) => setValue('isRegisteredInCouncil', v, { shouldDirty: true })}
            />
          </div>

          {watch('isRegisteredInCouncil') && (
            <div className="space-y-1.5">
              <Label htmlFor="medicalCouncilName">Council / Board Name</Label>
              <Input id="medicalCouncilName" placeholder="e.g. Telangana State Teachers Council" {...register('medicalCouncilName')} />
              {errors.medicalCouncilName && <p className="text-xs text-red-500">{errors.medicalCouncilName.message}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input id="skills" placeholder="Classroom management, Lesson planning, STEM, Digital learning…" {...register('skills')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Brief summary of your experience and goals…" rows={3} {...register('bio')} />
            {errors.bio && <p className="text-xs text-red-500">{errors.bio.message}</p>}
          </div>
        </div>

        {/* ── Resume ──────────────────────────────────────────────────── */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">Resume</h2>
          <input ref={resumeRef} type="file" accept="application/pdf" className="hidden" onChange={handleResumeUpload} />
          {resumeUrl ? (
            <div className="flex items-center justify-between bg-brand-primary-light border border-brand-primary/20 rounded-xl px-4 py-3">
              <span className="text-sm text-brand-primary font-medium">Resume uploaded ✓</span>
              <Button type="button" variant="outline" size="sm" onClick={() => resumeRef.current?.click()}>
                Replace
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full" onClick={() => resumeRef.current?.click()} disabled={uploading}>
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading…</> : <><Upload className="w-4 h-4 mr-2" />Upload Resume (PDF)</>}
            </Button>
          )}
        </div>

        {isSubmitting || mutation.isPending ? (
          <Button disabled className="w-full">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving…
          </Button>
        ) : (
          <Button type="submit" className="w-full" disabled={!isDirty && resumeUrl === (profile?.resumeUrl as string | null ?? null)}>
            Save Profile
          </Button>
        )}
      </form>

    </div>
  );
}
