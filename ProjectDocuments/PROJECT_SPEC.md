# PROJECT_SPEC.md — School Teacher (STUB)

> **This file is a stub.** Fill it with the product spec as it lands with the client.
> `PROJECT_BLUEPRINT.md` covers architecture; this file covers **product requirements**
> — the "what" from the client's mouth, not the "how".

---

## 1. Elevator Pitch

*(1–2 sentences: what does School Teacher do for a school? for a teacher? why is it better than the current alternative?)*

TBD.

## 2. Primary User Journeys

*(Two or three end-to-end journeys, told as narratives.)*

### 2.1 Teacher — finds an urgent posting near me
TBD.

### 2.2 School Admin — needs a substitute for tomorrow
TBD.

### 2.3 School Admin — hires a permanent teacher
TBD.

## 3. Functional Requirements

*(Group by actor. Keep it declarative — "Teacher can filter by subject" not "the FE calls GET /postings?subject=...".)*

### 3.1 Teacher
- Register with email + password (+ Google).
- Complete profile: name, subjects, grade levels, experience, location, resume.
- Browse postings (search + filters).
- Apply to postings.
- After shortlist: pay to unlock school contact + chat.
- Manage urgent-access subscription.

### 3.2 School Admin
- Register + verify school.
- Post: permanent (paid) or urgent (subscription).
- Review applicants, shortlist, hire.
- Chat with paid applicants.
- Manage urgent subscription.

### 3.3 Admin
- Verify schools.
- Suspend abusive users / postings.
- Edit pricing + settings via UI.
- View audit + analytics.

## 4. Non-functional Requirements

- **Latency**: sub-second on browse; email delivery within 30s.
- **Availability**: target 99% at MVP; 99.9% post-launch.
- **Locale**: en-IN only at launch. Multi-language deferred.
- **Currency**: INR only.
- **Compliance**: India DPDP Act, best-effort GDPR (data-export + delete endpoints).

## 5. Pricing

**All pricing is dynamic** via `SystemConfig{type:'price'}`. Client fills the values at go-live; admin can edit any time via UI without deploy. See `PROJECT_BLUEPRINT.md §5` for the seeded keys.

TBD values.

## 6. Open Product Questions

- Subscription cycle: monthly / annual / both?
- Auto-renewal: manual re-purchase vs Razorpay Subscriptions API?
- Multi-user per school (multiple admins)?
- Verified badges — who / how?
- Teacher rating by school? School rating by teacher? Deferred?
- Referral / invite programme?
- Notification frequency caps?

## 7. Explicit Non-Goals (v1)

- Video interviews inside chat.
- Featured / boosted postings.
- International markets.
- Non-teaching staff hiring.
- School-to-school hiring / poaching.

## 8. Success Metrics (post-launch)

- Weekly active teachers / schools.
- Time-to-fill for urgent posts (target < 6 hours).
- Application-to-hire conversion.
- Subscription retention (school + teacher).

---

*Once this file is filled, `SCREEN_MAP.md` gets updated with the concrete screens implied, and Phase 1 planning begins.*
