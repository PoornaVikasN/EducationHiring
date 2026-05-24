'use client';

import { AlertCircle, Building2, CheckCircle, ExternalLink, Mail, Phone, XCircle } from 'lucide-react';
import type { AdminHospital } from '../lib/api/admin';
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
  hospital: AdminHospital | null;
  onOpenChange: (open: boolean) => void;
}

export function AdminHospitalDetailDialog({ hospital, onOpenChange }: Props) {
  if (!hospital) return null;

  const contactEmail = hospital.contactEmail ?? hospital.email;
  const contactPhone = hospital.contactPhone ?? hospital.phone;

  return (
    <Dialog open={!!hospital} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-bg-card border border-border-default">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {hospital.logoUrl ? (
              <img src={hospital.logoUrl} alt={hospital.name} className="w-12 h-12 rounded-xl object-contain border border-border-default bg-bg-page" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold text-text-primary leading-snug">{hospital.name}</DialogTitle>
              <p className="text-xs text-text-muted mt-0.5">
                {hospital.city}, {hospital.state}
                {hospital.pincode ? ` — ${hospital.pincode}` : ''}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {hospital.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                ) : hospital.verificationStatus === 'REJECTED' ? (
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
            {hospital.website && (
              <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-brand-primary hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> {hospital.website}
              </a>
            )}
          </div>

          {/* Details */}
          <div className="space-y-2">
            {hospital.address && <Row label="Address" value={hospital.address} />}
            {hospital.registrationNumber && <Row label="Reg. number" value={hospital.registrationNumber} />}
            {hospital.noOfCabinsAndBeds != null && <Row label="Cabins / beds" value={hospital.noOfCabinsAndBeds} />}
            {hospital.noOfBeds != null && <Row label="No. of beds" value={hospital.noOfBeds} />}
            {hospital.noOfOperationTheatres != null && <Row label="Operation theatres" value={hospital.noOfOperationTheatres} />}
            {hospital.hospitalStrength != null && <Row label="Staff strength" value={hospital.hospitalStrength} />}
            <Row label="Registered on" value={new Date(hospital.createdAt).toLocaleDateString('en-IN')} />
          </div>

          {/* Photos */}
          {(hospital.photos?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Photos</p>
              <div className="flex gap-2 flex-wrap">
                {hospital.photos!.map((url, i) => (
                  <img key={i} src={url} alt={`Hospital photo ${i + 1}`} className="w-20 h-20 rounded-lg object-cover border border-border-default" />
                ))}
              </div>
            </div>
          )}

          {/* Accreditations */}
          {(hospital.accreditations?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Accreditations</p>
              <div className="flex flex-wrap gap-1.5">
                {hospital.accreditations!.map((a) => (
                  <span key={a} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Departments */}
          {(hospital.departments?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Departments</p>
              <div className="flex flex-wrap gap-1.5">
                {hospital.departments!.map((d) => (
                  <span key={d} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{d.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          )}

          {/* Infrastructure */}
          {(hospital.hospitalInfra?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Infrastructure</p>
              <div className="flex flex-wrap gap-1.5">
                {hospital.hospitalInfra!.map((item) => (
                  <span key={item} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{item}</span>
                ))}
              </div>
            </div>
          )}

          {/* Scope of Services */}
          {hospital.scopeOfServices && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Scope of Services</p>
              <p className="text-xs text-text-muted leading-relaxed">{hospital.scopeOfServices}</p>
            </div>
          )}

          {/* Description */}
          {hospital.description && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">About</p>
              <p className="text-xs text-text-muted leading-relaxed">{hospital.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
