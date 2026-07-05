'use client';

import { Button } from '../ui/button';
import { Role } from '../../lib/shared/enums';

interface RoleToggleProps {
  value: Role;
  onChange: (role: Role.JOB_SEEKER | Role.RECRUITER) => void;
  teacherLabel?: string;
  schoolLabel?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function RoleToggle({ value, onChange, teacherLabel = 'Teacher', schoolLabel = 'School', size = 'default' }: RoleToggleProps) {
  const options: { role: Role.JOB_SEEKER | Role.RECRUITER; label: string }[] = [
    { role: Role.JOB_SEEKER, label: teacherLabel },
    { role: Role.RECRUITER, label: schoolLabel },
  ];

  return (
    <div className="flex gap-2">
      {options.map(({ role, label }) => (
        <Button
          key={role}
          type="button"
          variant={value === role ? 'default' : 'outline'}
          size={size}
          className="flex-1 text-sm"
          onClick={() => onChange(role)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
