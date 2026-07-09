'use client';

import { AlertCircle, Building2, CheckCircle, ExternalLink, Mail, Phone, XCircle } from 'lucide-react';
import type { AdminSchool } from '../lib/api/admin';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-text-muted w-32 shrink-0">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}

interface Props {
  school: AdminSchool | null;
  onOpenChange: (open: boolean) => void;
}

export function AdminSchoolDetailDialog({ school, onOpenChange }: Props) {
  if (!school) return null;

  const contactEmail = school.contactEmail ?? school.email;
  const contactPhone = school.contactPhone ?? school.phone;

  return (
    <Dialog open={!!school} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-bg-card border border-border-default">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {school.logoUrl ? (
              <img src={school.logoUrl} alt={school.name} className="w-12 h-12 rounded-xl object-contain border border-border-default bg-bg-page" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold text-text-primary leading-snug">{school.name}</DialogTitle>
              <p className="text-xs text-text-muted mt-0.5">
                {school.city}, {school.state}
                {school.pincode ? ` — ${school.pincode}` : ''}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {school.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                ) : school.verificationStatus === 'REJECTED' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Rejected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    <XCircle className="w-3 h-3" /> Pending verification
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Contact */}
          <div className="bg-bg-page border border-border-default rounded-xl p-3 space-y-1.5">
            <p className="text-xs font-semibold text-text-muted mb-1.5">Contact</p>
            {contactPhone && (
              <a href={`tel:${contactPhone}`} className="flex items-center gap-2 text-xs text-text-primary hover:text-brand-primary">
                <Phone className="w-3.5 h-3.5 text-text-muted" /> {contactPhone}
              </a>
            )}
            {contactEmail && (
              <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-xs text-text-primary hover:text-brand-primary">
                <Mail className="w-3.5 h-3.5 text-text-muted" /> {contactEmail}
              </a>
            )}
            {school.website && (
              <a href={school.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-brand-primary hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> {school.website}
              </a>
            )}
          </div>

          {/* Details */}
          <div className="space-y-2">
            {school.address && <Row label="Address" value={school.address} />}
            {school.registrationNumber && <Row label="Reg. number" value={school.registrationNumber} />}
            {school.noOfLabsOrSpecialRooms != null && <Row label="Labs / special rooms" value={school.noOfLabsOrSpecialRooms} />}
            {school.studentCapacity != null && <Row label="Student capacity" value={school.studentCapacity} />}
            {school.noOfClassrooms != null && <Row label="Classrooms" value={school.noOfClassrooms} />}
            {school.schoolStrength != null && <Row label="Teaching staff count" value={school.schoolStrength} />}
            <Row label="Registered on" value={new Date(school.createdAt).toLocaleDateString('en-IN')} />
          </div>

          {/* Photos */}
          {(school.photos?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Photos</p>
              <div className="flex gap-2 flex-wrap">
                {school.photos!.map((url, i) => (
                  <img key={i} src={url} alt={`School photo ${i + 1}`} className="w-20 h-20 rounded-lg object-cover border border-border-default" />
                ))}
              </div>
            </div>
          )}

          {/* Accreditations */}
          {(school.accreditations?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Accreditations</p>
              <div className="flex flex-wrap gap-1.5">
                {school.accreditations!.map((a) => (
                  <span key={a} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Departments */}
          {(school.departments?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Departments</p>
              <div className="flex flex-wrap gap-1.5">
                {school.departments!.map((d) => (
                  <span key={d} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{d.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          )}

          {/* Infrastructure */}
          {(school.campusFacilities?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Infrastructure</p>
              <div className="flex flex-wrap gap-1.5">
                {school.campusFacilities!.map((item) => (
                  <span key={item} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{item}</span>
                ))}
              </div>
            </div>
          )}

          {/* Scope of Services */}
          {school.scopeOfServices && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Scope of Services</p>
              <p className="text-xs text-text-muted leading-relaxed">{school.scopeOfServices}</p>
            </div>
          )}

          {/* Description */}
          {school.description && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">About</p>
              <p className="text-xs text-text-muted leading-relaxed">{school.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
