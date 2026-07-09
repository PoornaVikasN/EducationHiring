'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Building, CheckCircle, Clock, Loader2, Upload } from 'lucide-react';
import { LocationAutocomplete } from '../../../common-components/location-autocomplete';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../../common-components/ui/button';
import { ExpertiseSelector } from '../../../common-components/ui/expertise-selector';
import { Input } from '../../../common-components/ui/input';
import { Label } from '../../../common-components/ui/label';
import { Textarea } from '../../../common-components/ui/textarea';
import { schoolsApi } from '../../../lib/api/schools';
import { uploadFile } from '../../../lib/api/uploads';
import { useAuth } from '../../../lib/auth-context';
import { useToast } from '../../../hooks/use-toast';
import { Subject, UploadKind, VerificationStatus } from '../../../lib/shared/enums';
import { SCHOOL_ACCREDITATION_OPTIONS, SCHOOL_INFRA_OPTIONS } from '../../../lib/shared/constants';
import { schoolProfileSchema, type SchoolProfileFormValues } from '../../../lib/validations/profile';
import type { Resolver } from 'react-hook-form';

export default function RecruiterSchoolPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const logoRef = useRef<HTMLInputElement>(null);
  const photoRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const schoolCoordsRef = useRef<{ latitude?: number; longitude?: number }>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean[]>([false, false, false]);

  const { data: school, isLoading } = useQuery({
    queryKey: ['my-school'],
    queryFn: () => schoolsApi.getMine().then((r) => r.data).catch(() => null),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isDirty, isSubmitting } } = useForm<SchoolProfileFormValues>({
    resolver: zodResolver(schoolProfileSchema) as Resolver<SchoolProfileFormValues>,
  });

  useEffect(() => {
    if (school) {
      reset({
        name: school.name,
        registrationNumber: school.registrationNumber ?? '',
        address: school.address,
        city: school.city,
        state: school.state,
        pincode: school.pincode,
        contactPhone: school.contactPhone.replace(/^\+91/, ''),
        contactEmail: school.contactEmail,
        description: school.description ?? '',
        website: school.website ?? '',
        noOfClassrooms: school.noOfClassrooms ?? undefined,
        campusFacilities: school.campusFacilities ?? [],
        noOfLabsOrSpecialRooms: school.noOfLabsOrSpecialRooms ?? undefined,
        photos: school.photos ?? [],
        scopeOfServices: school.scopeOfServices ?? '',
        schoolStrength: school.schoolStrength ?? undefined,
        studentCapacity: school.studentCapacity ?? undefined,
        accreditations: school.accreditations ?? [],
        departments: school.departments ?? [],
      });
      setLogoUrl(school.logoUrl);
      const existingPhotos = school.photos ?? [];
      setPhotos([existingPhotos[0] ?? null, existingPhotos[1] ?? null, existingPhotos[2] ?? null]);
    } else {
      // Pre-fill contact from registration for a new school
      reset({
        contactEmail: user?.email ?? '',
        contactPhone: (user?.phone ?? '').replace(/^\+91/, ''),
      });
    }
  }, [school, user, reset]);

  const mutation = useMutation({
    mutationFn: (values: SchoolProfileFormValues) => {
      const photoList = photos.filter(Boolean) as string[];
      const payload = {
        ...values,
        ...schoolCoordsRef.current,
        contactPhone: `+91${values.contactPhone}`,
        logoUrl: logoUrl ?? undefined,
        website: values.website || undefined,
        description: values.description || undefined,
        scopeOfServices: values.scopeOfServices || undefined,
        photos: photoList.length > 0 ? photoList : undefined,
      };
      return school
        ? schoolsApi.update(school._id, payload)
        : schoolsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-school'] });
      if (!school) {
        toast({ title: 'School profile submitted!', description: 'Your profile is now under review by the admin.' });
        router.push('/recruiter/dashboard');
      } else {
        toast({ title: 'School profile updated!' });
      }
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? 'Save failed') : 'Save failed';
      toast({ title: 'Error', description: typeof msg === 'string' ? msg : 'Please try again.', variant: 'destructive' });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadFile(UploadKind.LOGO, file);
      setLogoUrl(url);
      toast({ title: 'Logo uploaded!' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handlePhotoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto((prev) => { const next = [...prev]; next[index] = true; return next; });
    try {
      const url = await uploadFile(UploadKind.SCHOOL_PHOTO, file);
      setPhotos((prev) => { const next = [...prev]; next[index] = url; return next; });
      toast({ title: 'Photo uploaded!' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploadingPhoto((prev) => { const next = [...prev]; next[index] = false; return next; });
    }
  };

  const isVerifiedFinal = school?.isVerified === true;
  const isRejected = school?.verificationStatus === VerificationStatus.REJECTED && !isVerifiedFinal;

  // Determine helper subtitle based on profile state
  const subtitle = !school
    ? 'Fill in your school details to get verified and start posting jobs'
    : isVerifiedFinal
    ? 'Your profile is verified and visible to teachers after they apply'
    : isRejected
    ? 'Your profile was rejected — update the details below and save again'
    : 'Profile submitted — please wait while admin reviews and approves your school';

  if (isLoading) {
    return <div className="space-y-4 animate-pulse">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-bg-card border border-border-default rounded-2xl" />)}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2"><Building className="w-5 h-5" /> School Profile</h1>
          <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>
        </div>
        {school && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
            isVerifiedFinal ? 'bg-green-100 text-green-700' :
            isRejected ? 'bg-red-100 text-red-600' :
            'bg-amber-100 text-amber-700'
          }`}>
            {isVerifiedFinal ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {isVerifiedFinal ? 'Verified' : isRejected ? 'Rejected' : 'Awaiting Admin Approval'}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5">
        {/* Logo */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">School Logo</h2>
          <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-border-default overflow-hidden bg-bg-page flex items-center justify-center">
              {logoUrl
                ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                : <Building className="w-7 h-7 text-text-muted" />}
            </div>
            <Button type="button" variant="outline" onClick={() => logoRef.current?.click()} disabled={uploadingLogo}>
              {uploadingLogo ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading…</> : <><Upload className="w-4 h-4 mr-2" />Upload Logo</>}
            </Button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">Basic Information</h2>

          <div className="space-y-1.5">
            <Label htmlFor="name">School Name *</Label>
            <Input id="name" placeholder="ABC Public School" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="registrationNumber">Affiliation Number / Recognition Number *</Label>
            <Input id="registrationNumber" placeholder="TS/SCH/2024/001" {...register('registrationNumber')} />
            {errors.registrationNumber && <p className="text-xs text-red-500">{errors.registrationNumber.message}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">Contact Phone *</Label>
              <Input id="contactPhone" placeholder="9876543210" {...register('contactPhone')} />
              {errors.contactPhone && <p className="text-xs text-red-500">{errors.contactPhone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input id="contactEmail" type="email" placeholder="hr@school.com" {...register('contactEmail')} />
              {errors.contactEmail && <p className="text-xs text-red-500">{errors.contactEmail.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" placeholder="https://school.com" {...register('website')} />
            {errors.website && <p className="text-xs text-red-500">{errors.website.message}</p>}
          </div>
        </div>

        {/* Address */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">Address</h2>

          <div className="space-y-1.5">
            <Label>Search Location *</Label>
            <LocationAutocomplete
              defaultValue={watch('city') ?? ''}
              placeholder="Search city, area or school name…"
              onSelect={({ city, state, pincode, street, latitude, longitude }) => {
                setValue('city', city, { shouldDirty: true, shouldValidate: true });
                setValue('state', state, { shouldDirty: true, shouldValidate: true });
                if (pincode) setValue('pincode', pincode, { shouldDirty: true, shouldValidate: true });
                if (street) setValue('address', street, { shouldDirty: true });
                schoolCoordsRef.current = { latitude, longitude };
              }}
              onClear={() => {
                setValue('city', '', { shouldDirty: true });
                setValue('state', '', { shouldDirty: true });
                setValue('pincode', '', { shouldDirty: true });
              }}
            />
            {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Street Address *</Label>
            <Input id="address" placeholder="Auto-filled or enter manually (e.g. Road No. 2, Building A)" {...register('address')} />
            {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="state">State *</Label>
              <Input id="state" placeholder="Auto-filled from location" {...register('state')} />
              {errors.state && <p className="text-xs text-red-500">{errors.state.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input id="pincode" placeholder="Auto-filled from location" {...register('pincode')} />
              {errors.pincode && <p className="text-xs text-red-500">{errors.pincode.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">About the School</Label>
            <Textarea id="description" placeholder="Describe your school — curriculum, facilities, student capacity…" rows={3} {...register('description')} />
          </div>
        </div>

        {/* Infrastructure */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">Infrastructure</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="noOfClassrooms">No. of Classrooms</Label>
              <Input id="noOfClassrooms" type="number" min={0} placeholder="20" {...register('noOfClassrooms', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="noOfLabsOrSpecialRooms">No. of Labs / Special Rooms</Label>
              <Input id="noOfLabsOrSpecialRooms" type="number" min={0} placeholder="5" {...register('noOfLabsOrSpecialRooms', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>School Infrastructure & Facilities</Label>
            <ExpertiseSelector
              options={SCHOOL_INFRA_OPTIONS}
              value={watch('campusFacilities') ?? []}
              onValueChange={(v) => setValue('campusFacilities', v, { shouldDirty: true })}
              searchPlaceholder="Search facilities…"
              placeholder="Select available facilities"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="schoolStrength">Teaching Staff Count</Label>
              <Input id="schoolStrength" type="number" min={0} placeholder="50" {...register('schoolStrength', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studentCapacity">Total Student Capacity</Label>
              <Input id="studentCapacity" type="number" min={0} placeholder="800" {...register('studentCapacity', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Board / Affiliations</Label>
            <ExpertiseSelector
              options={SCHOOL_ACCREDITATION_OPTIONS}
              value={watch('accreditations') ?? []}
              onValueChange={(v) => setValue('accreditations', v, { shouldDirty: true })}
              searchPlaceholder="Search board or affiliation…"
              placeholder="Select board / affiliations"
            />
          </div>

          <div className="space-y-1.5">
            <Label>School Sections / Levels</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.values(Subject)).map((dept) => {
                const active = (watch('departments') ?? []).includes(dept);
                return (
                  <Button
                    key={dept}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    onClick={() => {
                      const current = watch('departments') ?? [];
                      setValue('departments', active ? current.filter((d) => d !== dept) : [...current, dept], { shouldDirty: true });
                    }}
                  >
                    {dept.replace(/_/g, ' ')}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Subjects & Programs */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">Subjects Taught / Programs Offered</h2>
          <div className="space-y-1.5">
            <Label htmlFor="scopeOfServices">Subjects & Programs</Label>
            <Textarea id="scopeOfServices" placeholder="e.g. CBSE curriculum from Pre-Primary to Class XII, with STEM lab, computer science, and arts programs…" rows={3} {...register('scopeOfServices')} />
          </div>
        </div>

        {/* School Photos */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-default pb-3">School Photos (max 3)</h2>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <input
                  ref={photoRefs[i]}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(i, e)}
                />
                <div
                  className="aspect-square rounded-xl border border-border-default bg-bg-page flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => photoRefs[i].current?.click()}
                >
                  {photos[i]
                    ? <img src={photos[i]!} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    : <div className="text-center p-2">
                        {uploadingPhoto[i]
                          ? <Loader2 className="w-5 h-5 animate-spin text-text-muted mx-auto" />
                          : <><Upload className="w-5 h-5 text-text-muted mx-auto mb-1" /><p className="text-xs text-text-muted">Photo {i + 1}</p></>
                        }
                      </div>
                  }
                </div>
                {photos[i] && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => setPhotos((prev) => { const next = [...prev]; next[i] = null; return next; })}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending || (!isDirty && !!school && !uploadingLogo)}>
          {isSubmitting || mutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
            : school ? 'Save Changes' : 'Submit School Profile'}
        </Button>
      </form>
    </div>
  );
}
