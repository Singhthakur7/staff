# Security Specification & Payload-First TDD (`security_spec.md`)

## 1. Data Invariants

1. **Master Gate Tenant Isolation**: Every subcollection document under `/companies/{companyId}/...` can only be accessed or mutated if `/companies/{companyId}` exists AND `active == true` (except for Master Admin oversight) AND the requesting user is an active member in `/companies/{companyId}/members/{emailKey}` (or Master Admin).
2. **Verified Identity Mandate**: Every read/write requires `request.auth != null && request.auth.token.email_verified == true`. Unverified emails cannot impersonate the bootstrapped Master Admin (`shriyanshsingh7581@gmail.com`) or any Company Admin/Staff member.
3. **Zero Cross-Tenant Leakage**: A Company Admin or Staff member of `comp_A` can NEVER `get`, `list`, `create`, `update`, or `delete` any document under `comp_B` or read `/system/master_config` or `/admins/{uid}`.
4. **Staff PII & Wage Immutability**: Staff members can only `get`/`list` their own `staff`, `attendance`, `payments`, `expenses`, `leaves`, `receipts`, `instructions`, and assigned `works`. Staff can NEVER modify `wageEarned`, `dailyWage`, `amount`, `status` (approval), or `companyAdminEmail`.
5. **Terminal State Locking**: Once an `ExpenseClaim` or `LeaveRequest` moves to `approved` or `rejected`, or a `SalaryPayment` moves to `confirmed`, staff cannot mutate it (only Company Admin or Master Admin override).
6. **Strict Schema & No Shadow Fields**: Every `create` enforces `hasAll` + `hasOnly` + `createdAt == request.time` + `updatedAt == request.time` + `createdByUid == request.auth.uid`; every `update` enforces `isValid[Entity](incoming())`, `affectedKeys().hasOnly(...)`, `createdAt == existing().createdAt`, and `updatedAt == request.time`.
7. **Zero `get()`/`exists()` in `allow list`**: Every `allow list` evaluates `resource.data` directly against `request.auth.token.email` (or Master Admin check), preventing O(n) read amplification and unauthorized collection scraping.
8. **Path ID Hardening**: Every `get`, `create`, `update`, and `delete` validates path IDs against `^[a-zA-Z0-9_\-]+$` with length `<= 128`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Email Spoofing (Unverified Master Admin)**: Unverified token (`email_verified: false`) with `email: "shriyanshsingh7581@gmail.com"` attempting to read `/companies/comp_1`.
2. **Shadow Field Injection on Company Create**: Master Admin payload on `/companies/comp_shadow` containing ghost field `"isSuperVerified": true`.
3. **Cross-Tenant Company Read**: Verified Company Admin of `comp_A` attempting `get` on `/companies/comp_B/ledger/ldg_1`.
4. **Self-Escalation to Master Admin**: Verified Company Admin attempting `create` on `/admins/{ownUid}` with `{ "role": "master_admin" }`.
5. **Staff Wage Tampering (Update-Gap Attack)**: Verified Staff member updating own `/companies/comp_A/attendance/att_1` with `{ "wageEarned": 999999 }` alongside `"venue"`.
6. **Staff Self-Approving Expense Claim**: Verified Staff member creating `/companies/comp_A/expenses/exp_1` with `{ "status": "approved" }`.
7. **Terminal State Bypass on Confirmed Payment**: Verified Staff member updating a `confirmed` `/companies/comp_A/payments/pay_1` back to `"pending"`.
8. **ID Poisoning Attack**: Verified Company Admin attempting to create `/companies/comp_A/ledger/invalid..$id!@#` with invalid characters or 200-char ID.
9. **Client Timestamp Forgery**: Verified Staff member creating `/companies/comp_A/leaves/lv_1` with a forged past `createdAt` timestamp instead of `request.time`.
10. **Suspended Company Access**: Active Staff member of a suspended company (`companies/comp_suspended.active == false`) attempting `create` on `/companies/comp_suspended/attendance/att_2`.
11. **PII Blanket Scraping (`allow list` without filter)**: Verified Staff member executing an unfiltered `list` query on `/companies/comp_A/staff` to scrape coworkers' phones, UPI IDs, and KYC digits.
12. **Unbounded Array / Value Poisoning on Customer**: Verified Company Admin creating `/companies/comp_A/customers/cust_bad` with `allowedStaffEmails` containing >100 items or non-string first element (`[12345]`).
