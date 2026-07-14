import { Role } from '../enums';
import { UserDocument } from '../../modules/users/schemas/user.schema';

// Client-facing user shape — no passwordHash, no other sensitive fields, and
// critically has `id` (string) rather than the raw Mongoose `_id`. Every
// endpoint that returns "the current user" must go through this, not return
// a raw UserDocument directly — Mongoose only includes the `id` virtual in
// JSON output if the schema opts in (this one doesn't), so a raw document
// serializes with `_id` only. Any frontend code doing `user.id` against a
// raw-document response gets `undefined` silently, no error, at every call
// site — this exact gap broke chat message alignment after a page reload
// (GET /users/me used to return a raw document; login/OTP did not, so the
// bug only showed up post-reload, not on fresh login).
export interface SafeUser {
  id: string;
  role: Role;
  email?: string;
  phone?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  seekerProfile: unknown;
  recruiterProfile: unknown;
  alertNewJobs: boolean;
}

export function toSafeUser(user: UserDocument): SafeUser {
  return {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    phone: user.phone,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    seekerProfile: user.seekerProfile,
    recruiterProfile: user.recruiterProfile,
    alertNewJobs: user.alertNewJobs,
  };
}
