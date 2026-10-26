import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Input, Row, Select, Statistic, Table, Tag } from 'antd';
import './App.css';

type Role = 'AICTE' | 'Institution' | 'Student' | 'Verifier';
type Section = 'overview' | 'claims' | 'new-claim' | 'seat-ledger' | 'bulk-upload' | 'rules' | 'cases' | 'student-wallet' | 'verifier' | 'credentials' | 'integrations' | 'architecture' | 'audit';
type BucketKey = 'General' | 'Lateral' | 'Supernumerary';
type Severity = 'Error' | 'Warning' | 'Info' | 'Blocker';
type ClaimStatus = 'Accepted' | 'Pending' | 'Blocked';

type Finding = { code: string; severity: Severity; message: string; suggestedFix: string };

type Claim = {
  id: string;
  studentRef: string;
  studentName: string;
  institutionId: string;
  institutionName: string;
  programme: string;
  cycle: string;
  bucket: BucketKey;
  apaarStatus: 'Verified' | 'Pending' | 'Missing';
  matchStatus: 'Match' | 'Mismatch' | 'Pending';
  consent: 'Yes' | 'No';
  status: ClaimStatus;
  createdAt: string;
  findings: Finding[];
};

type Institution = { id: string; name: string; state: string; buckets: Record<BucketKey, { capacity: number; occupied: number }> };

type RuleItem = { code: string; name: string; severity: 'Blocker' | 'Error' | 'Warning' | 'Info'; summary: string; version: string; enabled: boolean };

type AuditEvent = { id: string; actor: string; action: string; record: string; reason: string; timestamp: string };

type CaseItem = { id: string; title: string; severity: 'High' | 'Medium' | 'Low'; owner: string; status: 'Open' | 'In review' | 'Resolved'; score: number; evidence: string };

type BulkRow = { studentRef: string; name: string; institution: string; programme: string; status: 'Clean' | 'Review' | 'Blocked'; notes: string };

type ClaimForm = {
  studentRef: string;
  studentName: string;
  institutionId: string;
  programme: string;
  cycle: string;
  bucket: BucketKey;
  apaarStatus: 'Verified' | 'Pending' | 'Missing';
  matchStatus: 'Match' | 'Mismatch' | 'Pending';
  consent: 'Yes' | 'No';
};

const landingRoles: { role: Role; number: string; title: string; description: string; action: string; tone: string }[] = [
  { role: 'AICTE', number: '01', title: 'AICTE', description: 'National intake analytics, explainable risk leads, policy rules, and institution oversight.', action: 'Open AICTE dashboard', tone: 'green' },
  { role: 'Institution', number: '02', title: 'Institution', description: 'Submit admission claims, monitor approved seats, and resolve verification tasks.', action: 'Open institution workspace', tone: 'saffron' },
  { role: 'Verifier', number: '03', title: 'Verifier', description: 'Check a purpose-bound credential and receive only the permitted response.', action: 'Open verifier portal', tone: 'blue' },
  { role: 'Student', number: '04', title: 'Student', description: 'Review your admission status, Triple-Lock progress, and credential activity.', action: 'Open student wallet', tone: 'purple' },
];

const platformFeatures = [
  { number: '01', title: 'Admission Gate', description: 'A shared decision point for portal, bulk-upload, and ERP claims checks intake and required fields before a seat is reserved.' },
  { number: '02', title: 'Live seat ledger', description: 'Approved capacity and occupied seats stay in view, with a warning at 90% and a hard stop at the approved limit.' },
  { number: '03', title: 'Triple-Lock verification', description: 'Institution, APAAR registry, and student confirmations are tracked independently so incomplete claims remain visible.' },
  { number: '04', title: 'APAAR validation', description: 'Unresolved registry checks can follow a provisional review path instead of automatically rejecting a student.' },
  { number: '05', title: 'Duplicate detection', description: 'Potential duplicate enrolments become explainable review leads for a human—not an automatic fraud verdict.' },
  { number: '06', title: 'AICTE analytics & Trust Index', description: 'Aggregate intake views and evidence-linked trust signals help prioritize reviews without automatic penalties.' },
  { number: '07', title: 'Privacy-preserving verification', description: 'Purpose-bound checks return only the minimum approved details, with access and consent considered.' },
  { number: '08', title: 'Signed credentials', description: 'Verified enrolments can be represented as portable, issuer-signed credentials for future verification.' },
  { number: '09', title: 'Tamper-evident audit', description: 'Append-only admission and audit events preserve a traceable history of important actions.' },
];

const storageKey = 'apaar-sentinel-state-v1';
const roleOptions: Role[] = ['AICTE', 'Institution', 'Student', 'Verifier'];
const sectionNav: { key: Section; label: string; roles: Role[] }[] = [
  { key: 'overview', label: 'Overview', roles: ['AICTE', 'Institution', 'Student', 'Verifier'] },
  { key: 'claims', label: 'Claims', roles: ['AICTE', 'Institution'] },
  { key: 'new-claim', label: 'New Claim', roles: ['Institution'] },
  { key: 'seat-ledger', label: 'Seat Ledger', roles: ['AICTE', 'Institution'] },
  { key: 'bulk-upload', label: 'Bulk Upload', roles: ['Institution'] },
  { key: 'rules', label: 'Rules', roles: ['AICTE', 'Institution'] },
  { key: 'cases', label: 'Cases', roles: ['AICTE', 'Institution'] },
  { key: 'student-wallet', label: 'Student Wallet', roles: ['Student', 'Institution', 'AICTE'] },
  { key: 'verifier', label: 'Verifier', roles: ['Verifier'] },
  { key: 'credentials', label: 'Credentials', roles: ['AICTE', 'Institution', 'Student', 'Verifier'] },
  { key: 'integrations', label: 'Integrations', roles: ['AICTE', 'Institution'] },
  { key: 'architecture', label: 'Architecture', roles: ['AICTE', 'Institution', 'Verifier'] },
  { key: 'audit', label: 'Audit Trail', roles: ['AICTE', 'Institution', 'Student', 'Verifier'] },
];

const seedInstitutions: Institution[] = [
  { id: 'INST-01', name: 'Northgate Institute of Technology', state: 'Delhi', buckets: { General: { capacity: 120, occupied: 108 }, Lateral: { capacity: 30, occupied: 24 }, Supernumerary: { capacity: 15, occupied: 12 } } },
  { id: 'INST-02', name: 'Riverside School of Engineering', state: 'Maharashtra', buckets: { General: { capacity: 100, occupied: 82 }, Lateral: { capacity: 20, occupied: 17 }, Supernumerary: { capacity: 10, occupied: 4 } } },
  { id: 'INST-03', name: 'Greenfield Institute of Management', state: 'Tamil Nadu', buckets: { General: { capacity: 90, occupied: 70 }, Lateral: { capacity: 15, occupied: 12 }, Supernumerary: { capacity: 8, occupied: 3 } } },
  { id: 'INST-04', name: 'Coastal Polytechnic College', state: 'Kerala', buckets: { General: { capacity: 80, occupied: 66 }, Lateral: { capacity: 20, occupied: 15 }, Supernumerary: { capacity: 8, occupied: 5 } } },
  { id: 'INST-05', name: 'Deccan Institute of Engineering', state: 'Karnataka', buckets: { General: { capacity: 110, occupied: 91 }, Lateral: { capacity: 25, occupied: 19 }, Supernumerary: { capacity: 12, occupied: 8 } } },
  { id: 'INST-06', name: 'Eastern Valley Technical University', state: 'West Bengal', buckets: { General: { capacity: 140, occupied: 112 }, Lateral: { capacity: 35, occupied: 23 }, Supernumerary: { capacity: 15, occupied: 9 } } },
  { id: 'INST-07', name: 'Central Institute of Applied Sciences', state: 'Madhya Pradesh', buckets: { General: { capacity: 95, occupied: 74 }, Lateral: { capacity: 20, occupied: 14 }, Supernumerary: { capacity: 10, occupied: 6 } } },
];

const seedClaims: Claim[] = [
  { id: 'CLAIM-1024', studentRef: 'STU-24091', studentName: 'Aarav Mehta', institutionId: 'INST-01', institutionName: 'Northgate Institute of Technology', programme: 'B.Tech Computer Science', cycle: '2026-27', bucket: 'General', apaarStatus: 'Verified', matchStatus: 'Match', consent: 'Yes', status: 'Accepted', createdAt: '22 Oct 2026, 08:30', findings: [{ code: 'LOCKS_COMPLETE', severity: 'Info', message: 'All required verification locks are confirmed.', suggestedFix: 'Proceed to final approval.' }] },
  { id: 'CLAIM-1031', studentRef: 'STU-88022', studentName: 'Nisha Verma', institutionId: 'INST-02', institutionName: 'Riverside School of Engineering', programme: 'B.E. Mechanical', cycle: '2026-27', bucket: 'Lateral', apaarStatus: 'Pending', matchStatus: 'Pending', consent: 'Yes', status: 'Pending', createdAt: '23 Oct 2026, 11:10', findings: [{ code: 'APAAR_PENDING', severity: 'Warning', message: 'APAAR validation is pending and the claim remains provisional.', suggestedFix: 'Keep the claim in manual review until registry confirmation is received.' }] },
  { id: 'CLAIM-1038', studentRef: 'STU-24091', studentName: 'Aarav Mehta', institutionId: 'INST-03', institutionName: 'Greenfield Institute of Management', programme: 'BBA Digital Marketing', cycle: '2026-27', bucket: 'General', apaarStatus: 'Verified', matchStatus: 'Match', consent: 'Yes', status: 'Blocked', createdAt: '24 Oct 2026, 14:45', findings: [{ code: 'DUPLICATE_EXCLUSIVE_CLAIM', severity: 'Blocker', message: 'This student already has an exclusive claim in the active cycle.', suggestedFix: 'Reject the second claim and escalate for human review.' }] },
  { id: 'CLAIM-1042', studentRef: 'STU-55102', studentName: 'Kavya Rao', institutionId: 'INST-01', institutionName: 'Northgate Institute of Technology', programme: 'B.Tech Information Technology', cycle: '2026-27', bucket: 'General', apaarStatus: 'Verified', matchStatus: 'Match', consent: 'Yes', status: 'Accepted', createdAt: '24 Oct 2026, 09:20', findings: [{ code: 'LOCKS_COMPLETE', severity: 'Info', message: 'Institution, registry, and student confirmations are complete.', suggestedFix: 'No action required.' }] },
  { id: 'CLAIM-1047', studentRef: 'STU-55103', studentName: 'Dev Patel', institutionId: 'INST-02', institutionName: 'Riverside School of Engineering', programme: 'B.Tech Electronics and Communication', cycle: '2026-27', bucket: 'General', apaarStatus: 'Pending', matchStatus: 'Match', consent: 'Yes', status: 'Pending', createdAt: '24 Oct 2026, 10:05', findings: [{ code: 'APAAR_PENDING', severity: 'Warning', message: 'Registry confirmation is pending; the claim remains provisional.', suggestedFix: 'Keep the claim in manual review until registry confirmation is received.' }] },
  { id: 'CLAIM-1053', studentRef: 'STU-55104', studentName: 'Saanvi Das', institutionId: 'INST-04', institutionName: 'Coastal Polytechnic College', programme: 'Diploma in Computer Engineering', cycle: '2026-27', bucket: 'General', apaarStatus: 'Verified', matchStatus: 'Match', consent: 'Yes', status: 'Accepted', createdAt: '24 Oct 2026, 10:42', findings: [{ code: 'LOCKS_COMPLETE', severity: 'Info', message: 'All required verification locks are confirmed.', suggestedFix: 'Proceed to final approval.' }] },
  { id: 'CLAIM-1058', studentRef: 'STU-55105', studentName: 'Ishaan Khan', institutionId: 'INST-05', institutionName: 'Deccan Institute of Engineering', programme: 'B.Tech Computer Science', cycle: '2026-27', bucket: 'General', apaarStatus: 'Verified', matchStatus: 'Mismatch', consent: 'Yes', status: 'Blocked', createdAt: '24 Oct 2026, 11:18', findings: [{ code: 'NAME_MISMATCH', severity: 'Error', message: 'The submitted name does not match the verified identity record.', suggestedFix: 'Request a correction and re-check the identity match before resubmission.' }] },
  { id: 'CLAIM-1062', studentRef: 'STU-55106', studentName: 'Diya Menon', institutionId: 'INST-06', institutionName: 'Eastern Valley Technical University', programme: 'B.Tech Data Science', cycle: '2026-27', bucket: 'General', apaarStatus: 'Verified', matchStatus: 'Match', consent: 'Yes', status: 'Accepted', createdAt: '24 Oct 2026, 12:03', findings: [{ code: 'LOCKS_COMPLETE', severity: 'Info', message: 'All required verification locks are confirmed.', suggestedFix: 'No action required.' }] },
  { id: 'CLAIM-1069', studentRef: 'STU-55107', studentName: 'Aditya Bose', institutionId: 'INST-07', institutionName: 'Central Institute of Applied Sciences', programme: 'B.Tech Civil Engineering', cycle: '2026-27', bucket: 'Lateral', apaarStatus: 'Verified', matchStatus: 'Match', consent: 'Yes', status: 'Accepted', createdAt: '24 Oct 2026, 13:16', findings: [{ code: 'LOCKS_COMPLETE', severity: 'Info', message: 'All required verification locks are confirmed.', suggestedFix: 'No action required.' }] },
  { id: 'CLAIM-1072', studentRef: 'STU-55108', studentName: 'Myra Shah', institutionId: 'INST-03', institutionName: 'Greenfield Institute of Management', programme: 'BBA Business Analytics', cycle: '2026-27', bucket: 'General', apaarStatus: 'Pending', matchStatus: 'Pending', consent: 'Yes', status: 'Pending', createdAt: '24 Oct 2026, 14:02', findings: [{ code: 'APAAR_PENDING', severity: 'Warning', message: 'Registry confirmation is pending and the claim needs manual review.', suggestedFix: 'Keep the claim provisional while the institution follows up.' }] },
  { id: 'CLAIM-1076', studentRef: 'STU-55109', studentName: 'Arjun Nair', institutionId: 'INST-01', institutionName: 'Northgate Institute of Technology', programme: 'B.Tech Mechanical Engineering', cycle: '2026-27', bucket: 'Lateral', apaarStatus: 'Verified', matchStatus: 'Match', consent: 'Yes', status: 'Pending', createdAt: '24 Oct 2026, 15:10', findings: [{ code: 'STUDENT_CONFIRMATION_PENDING', severity: 'Warning', message: 'The student has not yet confirmed this admission claim.', suggestedFix: 'Request student confirmation before treating the claim as fully verified.' }] },
  { id: 'CLAIM-1081', studentRef: 'STU-55110', studentName: 'Ananya Kulkarni', institutionId: 'INST-05', institutionName: 'Deccan Institute of Engineering', programme: 'B.Tech Electrical Engineering', cycle: '2026-27', bucket: 'General', apaarStatus: 'Verified', matchStatus: 'Match', consent: 'Yes', status: 'Accepted', createdAt: '25 Oct 2026, 09:32', findings: [{ code: 'LOCKS_COMPLETE', severity: 'Info', message: 'Institution, registry, and student confirmations are complete.', suggestedFix: 'No action required.' }] },
  { id: 'CLAIM-1084', studentRef: 'STU-55111', studentName: 'Rahul Sen', institutionId: 'INST-06', institutionName: 'Eastern Valley Technical University', programme: 'B.Tech Artificial Intelligence', cycle: '2026-27', bucket: 'General', apaarStatus: 'Pending', matchStatus: 'Match', consent: 'Yes', status: 'Pending', createdAt: '25 Oct 2026, 10:18', findings: [{ code: 'APAAR_PENDING', severity: 'Warning', message: 'Registry confirmation is pending; this claim remains provisional.', suggestedFix: 'Follow up with the registry before final verification.' }] },
  { id: 'CLAIM-1087', studentRef: 'STU-55112', studentName: 'Fatima Ali', institutionId: 'INST-04', institutionName: 'Coastal Polytechnic College', programme: 'Diploma in Electronics Engineering', cycle: '2026-27', bucket: 'Lateral', apaarStatus: 'Verified', matchStatus: 'Match', consent: 'Yes', status: 'Accepted', createdAt: '25 Oct 2026, 11:47', findings: [{ code: 'LOCKS_COMPLETE', severity: 'Info', message: 'All required verification locks are confirmed.', suggestedFix: 'No action required.' }] },
];

const seedRules: RuleItem[] = [
  { code: 'REQ_FIELD', name: 'Required data validation', severity: 'Error', summary: 'Rejects incomplete submissions', version: 'v1.4', enabled: true },
  { code: 'SEAT_90_PERCENT', name: 'Capacity watch threshold', severity: 'Warning', summary: 'Warns at 90% seat use', version: 'v1.4', enabled: true },
  { code: 'SEAT_CAP_REACHED', name: 'Capacity ceiling', severity: 'Blocker', summary: 'Prevents allocation beyond approved intake', version: 'v1.4', enabled: true },
  { code: 'DUPLICATE_EXCLUSIVE_CLAIM', name: 'Exclusive claim guard', severity: 'Blocker', summary: 'Rejects duplicate student claims per cycle', version: 'v1.4', enabled: true },
  { code: 'APAAR_PENDING', name: 'APAAR pending check', severity: 'Warning', summary: 'Keeps unresolved APAAR claims provisional', version: 'v1.4', enabled: true },
  { code: 'VERIFIER_SCOPE', name: 'Verifier purpose restriction', severity: 'Blocker', summary: 'Limits verification to permitted purposes', version: 'v1.4', enabled: true },
];

const seedAuditEvents: AuditEvent[] = [
  { id: 'AUD-1017', actor: 'Verifier', action: 'Verifier query', record: 'A-00000', reason: 'Unknown synthetic credential returned not verified', timestamp: '25 Oct 2026, 16:03' },
  { id: 'AUD-1016', actor: 'Institution admin', action: 'Claim accepted', record: 'CLAIM-1087', reason: 'Admission claim accepted for Fatima Ali at Coastal Polytechnic College', timestamp: '25 Oct 2026, 12:01' },
  { id: 'AUD-1015', actor: 'Registry adapter', action: 'Status check', record: 'CLAIM-1084', reason: 'APAAR registry response pending; claim remains provisional', timestamp: '25 Oct 2026, 11:04' },
  { id: 'AUD-1014', actor: 'Institution admin', action: 'Claim accepted', record: 'CLAIM-1081', reason: 'Admission claim accepted for Ananya Kulkarni at Deccan Institute of Engineering', timestamp: '25 Oct 2026, 09:35' },
  { id: 'AUD-1013', actor: 'Verifier', action: 'Verifier query', record: 'A-10982', reason: 'Admission status confirmed for an approved purpose; minimal response returned', timestamp: '25 Oct 2026, 15:42' },
  { id: 'AUD-1012', actor: 'Student', action: 'Student confirmation', record: 'CLAIM-1024', reason: 'Aarav Mehta confirmed the Northgate admission record', timestamp: '25 Oct 2026, 14:08' },
  { id: 'AUD-1011', actor: 'AICTE reviewer', action: 'Review completed', record: 'CLAIM-1053', reason: 'Coastal Polytechnic claim sampled; all three locks confirmed', timestamp: '25 Oct 2026, 12:36' },
  { id: 'AUD-1010', actor: 'AICTE reviewer', action: 'Allocation reviewed', record: 'CLAIM-1069', reason: 'Lateral-entry seat allocation checked for Central Institute of Applied Sciences', timestamp: '25 Oct 2026, 11:52' },
  { id: 'AUD-1009', actor: 'Registry adapter', action: 'Status check', record: 'CLAIM-1062', reason: 'Synthetic registry match confirmed for Eastern Valley claim', timestamp: '25 Oct 2026, 10:24' },
  { id: 'AUD-1008', actor: 'Institution admin', action: 'Student confirmation requested', record: 'CLAIM-1076', reason: 'Student confirmation link issued for Northgate admission', timestamp: '25 Oct 2026, 09:10' },
  { id: 'AUD-1007', actor: 'AICTE reviewer', action: 'Case opened', record: 'CLAIM-1058', reason: 'Identity mismatch routed to institution correction queue', timestamp: '24 Oct 2026, 15:34' },
  { id: 'AUD-1006', actor: 'Rules engine', action: 'Claim blocked', record: 'CLAIM-1058', reason: 'Identity name mismatch requires correction', timestamp: '24 Oct 2026, 11:20' },
  { id: 'AUD-1005', actor: 'Registry adapter', action: 'Status check', record: 'CLAIM-1047', reason: 'APAAR validation returned pending', timestamp: '24 Oct 2026, 10:07' },
  { id: 'AUD-1004', actor: 'Institution admin', action: 'Claim accepted', record: 'CLAIM-1042', reason: 'Admission submitted for Kavya Rao', timestamp: '24 Oct 2026, 09:21' },
  { id: 'AUD-1003', actor: 'Institution admin', action: 'Claim blocked', record: 'CLAIM-1038', reason: 'Duplicate exclusive claim detected', timestamp: '24 Oct 2026, 14:47' },
  { id: 'AUD-1002', actor: 'AICTE reviewer', action: 'Rule check', record: 'CLAIM-1031', reason: 'Parent record flagged for APAAR pending review', timestamp: '23 Oct 2026, 11:13' },
  { id: 'AUD-1001', actor: 'Institution admin', action: 'Claim created', record: 'CLAIM-1024', reason: 'Admission submitted for Aarav Mehta', timestamp: '22 Oct 2026, 08:31' },
];

const seedCases: CaseItem[] = [
  { id: 'CASE-104', title: 'Duplicate exclusive claim lead', severity: 'High', owner: 'AICTE review', status: 'In review', score: 78, evidence: 'The same student record was matched across two institutions in the same cycle' },
  { id: 'CASE-105', title: 'APAAR status unresolved', severity: 'Medium', owner: 'Institution admin', status: 'Open', score: 62, evidence: 'Registry status remains pending while student consent is already captured' },
  { id: 'CASE-107', title: 'Seat utilisation breach risk', severity: 'Low', owner: 'Policy desk', status: 'Resolved', score: 41, evidence: 'General bucket at 90% with approved waiver available' },
  { id: 'CASE-108', title: 'Identity name mismatch', severity: 'High', owner: 'Institution admin', status: 'Open', score: 71, evidence: 'A synthetic claim needs a correction before identity matching can be confirmed' },
  { id: 'CASE-109', title: 'Student confirmation outstanding', severity: 'Medium', owner: 'Institution admin', status: 'In review', score: 54, evidence: 'The institution submitted the claim but the student lock is not yet confirmed' },
];

const seedBulkRows: BulkRow[] = [
  { studentRef: 'STU-44011', name: 'Priya Iyer', institution: 'Northgate Institute of Technology', programme: 'B.Tech Electronics', status: 'Clean', notes: 'Matches institution and seat bucket' },
  { studentRef: 'STU-44012', name: 'Rohan Shah', institution: 'Riverside School of Engineering', programme: 'B.E. Civil', status: 'Review', notes: 'APAAR pending; provisional status applied' },
  { studentRef: 'STU-24091', name: 'Aarav Mehta', institution: 'Greenfield Institute of Management', programme: 'BBA Digital Marketing', status: 'Blocked', notes: 'Exclusive claim duplicate detected' },
  { studentRef: 'STU-55104', name: 'Saanvi Das', institution: 'Coastal Polytechnic College', programme: 'Diploma in Computer Engineering', status: 'Clean', notes: 'Verified locks and available seat capacity' },
  { studentRef: 'STU-55105', name: 'Ishaan Khan', institution: 'Deccan Institute of Engineering', programme: 'B.Tech Computer Science', status: 'Blocked', notes: 'Identity name mismatch requires correction' },
];

const seedStudent = {
  name: 'Aarav Mehta',
  ref: 'STU-24091',
  institution: 'Northgate Institute of Technology',
  cycle: '2026-27',
  locks: { institution: 'Verified', registry: 'Verified', student: 'Verified' },
  accessLog: ['08:30 - Institution admin reviewed the claim submission', '09:15 - AICTE reviewer opened the case summary', '10:00 - Student confirmation was recorded', '10:42 - Verifier executed a minimal credential check'],
};

const defaultClaimForm: ClaimForm = {
  studentRef: 'STU-44088',
  studentName: 'Rhea Kapoor',
  institutionId: 'INST-01',
  programme: 'B.Tech Civil Engineering',
  cycle: '2026-27',
  bucket: 'General',
  apaarStatus: 'Pending',
  matchStatus: 'Match',
  consent: 'Yes',
};

const defaultVerifierForm = { ref: 'A-10982', purpose: 'Admission verification' };

const roleCredentials: Record<Role, { kind: string; title: string; reference: string; subject: string; issued: string; expires: string; scope: string }> = {
  AICTE: {
    kind: 'AICTE issuer credential',
    title: 'Intake oversight authority',
    reference: 'ORG-AICTE-2026',
    subject: 'APAAR ShikshaSetu · AICTE demo issuer',
    issued: '01 Apr 2026',
    expires: '31 Mar 2027',
    scope: 'Review aggregate intake, rules, and institution claim records',
  },
  Institution: {
    kind: 'Institution admission credential',
    title: 'Institution admission authority',
    reference: 'ORG-INST-01-2026',
    subject: 'Northgate Institute of Technology',
    issued: '01 Apr 2026',
    expires: '31 Mar 2027',
    scope: 'Submit claims and issue admission records for Northgate',
  },
  Student: {
    kind: 'Student admission credential',
    title: 'Admission verification certificate',
    reference: 'A-10982',
    subject: 'Aarav Mehta · STU-24091',
    issued: '24 Oct 2026',
    expires: '31 Dec 2027',
    scope: 'Share minimal admission status for an approved purpose',
  },
  Verifier: {
    kind: 'Verifier access credential',
    title: 'Admissions verification access',
    reference: 'V-20416',
    subject: 'External verifier · synthetic demo account',
    issued: '01 Oct 2026',
    expires: '31 Dec 2026',
    scope: 'Request minimal admission or eligibility responses',
  },
};

const demoCredentialClaims: Record<string, string> = {
  'A-10982': 'CLAIM-1024',
  'A-55102': 'CLAIM-1042',
  'A-55104': 'CLAIM-1053',
  'A-55106': 'CLAIM-1062',
  'A-55107': 'CLAIM-1069',
  'A-55110': 'CLAIM-1081',
  'A-55112': 'CLAIM-1087',
};

const withSeedRecords = <T extends { id: string }>(saved: T[] | undefined, seeds: T[]): T[] => {
  const records = Array.isArray(saved) ? saved : [];
  const existingIds = new Set(records.map((record) => record.id));
  return [...records, ...seeds.filter((record) => !existingIds.has(record.id))];
};

function App() {
  const [role, setRole] = useState<Role>('AICTE');
  const [section, setSection] = useState<Section>('overview');
  const [showLanding, setShowLanding] = useState(true);
  const [institutions, setInstitutions] = useState<Institution[]>(() => {
    const value = localStorage.getItem(storageKey);
    if (!value) return seedInstitutions;
    try {
      return withSeedRecords(JSON.parse(value).institutions, seedInstitutions);
    } catch {
      return seedInstitutions;
    }
  });
  const [claims, setClaims] = useState<Claim[]>(() => {
    const value = localStorage.getItem(storageKey);
    if (!value) return seedClaims;
    try {
      return withSeedRecords(JSON.parse(value).claims, seedClaims);
    } catch {
      return seedClaims;
    }
  });
  const [rules, setRules] = useState<RuleItem[]>(() => {
    const value = localStorage.getItem(storageKey);
    if (!value) return seedRules;
    try {
      return JSON.parse(value).rules ?? seedRules;
    } catch {
      return seedRules;
    }
  });
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => {
    const value = localStorage.getItem(storageKey);
    if (!value) return seedAuditEvents;
    try {
      return withSeedRecords(JSON.parse(value).auditEvents, seedAuditEvents);
    } catch {
      return seedAuditEvents;
    }
  });
  const [cases, setCases] = useState<CaseItem[]>(() => {
    const value = localStorage.getItem(storageKey);
    if (!value) return seedCases;
    try {
      return JSON.parse(value).cases ?? seedCases;
    } catch {
      return seedCases;
    }
  });
  const [bulkPreview, setBulkPreview] = useState<BulkRow[]>(seedBulkRows);
  const [claimForm, setClaimForm] = useState<ClaimForm>(defaultClaimForm);
  const [verifierForm, setVerifierForm] = useState(defaultVerifierForm);
  const [verifierResult, setVerifierResult] = useState<{ status: string; purpose: string; message: string } | null>(null);
  const [lastResult, setLastResult] = useState<{ title: string; message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [bulkCsvText, setBulkCsvText] = useState('studentRef,name,institution,programme,status\nSTU-55010,Meera Nair,Northgate Institute of Technology,B.Tech Information Technology,Clean\nSTU-55011,Arjun Bhat,Riverside School of Engineering,B.E. Civil,Review\nSTU-24091,Aarav Mehta,Greenfield Institute of Management,BBA Digital Marketing,Blocked');

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ institutions, claims, rules, auditEvents, cases }));
  }, [institutions, claims, rules, auditEvents, cases]);

  const visibleSections = useMemo(() => sectionNav.filter((item) => item.roles.includes(role)), [role]);

  const nationalStats = useMemo(() => {
    const accepted = claims.filter((claim) => claim.status === 'Accepted').length;
    const pending = claims.filter((claim) => claim.status === 'Pending').length;
    const blocked = claims.filter((claim) => claim.status === 'Blocked').length;
    const totalSeats = institutions.reduce((sum, institution) => sum + Object.values(institution.buckets).reduce((bucketSum, bucket) => bucketSum + bucket.capacity, 0), 0);
    const occupiedSeats = institutions.reduce((sum, institution) => sum + Object.values(institution.buckets).reduce((bucketSum, bucket) => bucketSum + bucket.occupied, 0), 0);
    return { accepted, pending, blocked, totalSeats, occupiedSeats, utilisation: Math.round((occupiedSeats / totalSeats) * 100) };
  }, [claims, institutions]);

  const instituteSummary = useMemo(
    () =>
      institutions.map((institution) => {
        const seatTotal = Object.values(institution.buckets).reduce((sum, bucket) => sum + bucket.capacity, 0);
        const occupied = Object.values(institution.buckets).reduce((sum, bucket) => sum + bucket.occupied, 0);
        return { ...institution, seatTotal, occupied, utilisation: Math.round((occupied / seatTotal) * 100) };
      }),
    [institutions],
  );

  const flaggedClaims = claims.filter((claim) => claim.findings.some((finding) => finding.severity === 'Warning' || finding.severity === 'Blocker'));
  const visibleAuditEvents = useMemo(() => {
    const claimForRecord = (record: string) => {
      const claimId = demoCredentialClaims[record] ?? record;
      return claims.find((claim) => claim.id === claimId);
    };
    const scopedEvents = auditEvents.filter((event) => {
      if (role === 'AICTE') return true;
      if (role === 'Verifier') return event.actor === 'Verifier' || event.action === 'Verifier query';
      if (role === 'Institution') return claimForRecord(event.record)?.institutionId === 'INST-01' || event.record === 'INST-01';
      const claim = claimForRecord(event.record);
      return claim?.studentRef === seedStudent.ref || event.record === seedStudent.ref || event.record === 'A-10982';
    });
    return [...scopedEvents].sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
  }, [auditEvents, claims, role]);
  const credential = roleCredentials[role];

  const addAuditEvent = (actor: string, action: string, record: string, reason: string) => {
    setAuditEvents((current) => [{ id: `AUD-${Date.now()}`, actor, action, record, reason, timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) }, ...current]);
  };

  const handleClaimChange = <K extends keyof ClaimForm>(field: K, value: ClaimForm[K]) => {
    setClaimForm((current) => ({ ...current, [field]: value }));
  };

  const enterWorkspace = (selectedRole: Role) => {
    setRole(selectedRole);
    const firstVisible = sectionNav.find((item) => item.roles.includes(selectedRole));
    if (firstVisible) setSection(firstVisible.key);
    setShowLanding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateClaim = (input: ClaimForm) => {
    const findings: Finding[] = [];
    const requiredFields = [input.studentRef, input.studentName, input.institutionId, input.programme, input.cycle];
    if (requiredFields.some((value) => !value || value.trim() === '')) {
      findings.push({ code: 'REQ_FIELD', severity: 'Error', message: 'One or more required claim fields are missing.', suggestedFix: 'Complete the missing fields before submission.' });
    }

    const institution = institutions.find((entry) => entry.id === input.institutionId);
    if (!institution) {
      findings.push({ code: 'INSTITUTION_UNKNOWN', severity: 'Blocker', message: 'The institution is not in the approved master list.', suggestedFix: 'Choose a valid institution from the list.' });
    }

    const bucket = institution?.buckets[input.bucket];
    if (bucket) {
      const projectedOccupied = bucket.occupied + 1;
      if (projectedOccupied > bucket.capacity) {
        findings.push({ code: 'SEAT_CAP_REACHED', severity: 'Blocker', message: `The ${input.bucket} seat bucket is already full for this institution.`, suggestedFix: 'Move the student to an alternate bucket or escalate for manual review.' });
      }
      if (bucket.occupied >= Math.ceil(bucket.capacity * 0.9)) {
        findings.push({ code: 'SEAT_90_PERCENT', severity: 'Warning', message: `The ${input.bucket} bucket is at or above 90% utilisation.`, suggestedFix: 'Continue only after approval from the intake desk.' });
      }
    }

    if (claims.some((claim) => claim.studentRef === input.studentRef && claim.cycle === input.cycle && claim.institutionId === input.institutionId && claim.status !== 'Blocked')) {
      findings.push({ code: 'DUPLICATE_EXCLUSIVE_CLAIM', severity: 'Blocker', message: 'A duplicate exclusive claim already exists in the active cycle.', suggestedFix: 'Reject the second claim and escalate for case review.' });
    }

    if (input.apaarStatus !== 'Verified') {
      findings.push({ code: 'APAAR_PENDING', severity: 'Warning', message: 'APAAR validation is pending or unavailable for the student record.', suggestedFix: 'Keep the claim provisional until registry confirmation is received.' });
    }

    if (input.matchStatus === 'Mismatch') {
      findings.push({ code: 'APAAR_MISMATCH', severity: 'Error', message: 'Student identity data does not match the registry record.', suggestedFix: 'Request correction before final verification is completed.' });
    }

    if (input.consent !== 'Yes') {
      findings.push({ code: 'LOCKS_INCOMPLETE', severity: 'Info', message: 'Student consent is not available for this claim.', suggestedFix: 'Capture confirmation and resume the verification flow.' });
    }

    return findings;
  };

  const handleClaimSubmit = () => {
    const findings = validateClaim(claimForm);
    const blockers = findings.filter((finding) => finding.severity === 'Blocker' || finding.severity === 'Error');
    if (blockers.length > 0) {
      setLastResult({ title: 'Claim rejected', message: blockers[0].message, type: 'error' });
      addAuditEvent('Institution admin', 'Claim blocked', claimForm.studentRef, blockers[0].message);
      return;
    }

    const institution = institutions.find((entry) => entry.id === claimForm.institutionId);
    if (!institution) {
      setLastResult({ title: 'Submission failed', message: 'Institution record not found.', type: 'error' });
      return;
    }

    setInstitutions((current) =>
      current.map((entry) =>
        entry.id !== claimForm.institutionId
          ? entry
          : {
              ...entry,
              buckets: {
                ...entry.buckets,
                [claimForm.bucket]: {
                  ...entry.buckets[claimForm.bucket],
                  occupied: entry.buckets[claimForm.bucket].occupied + 1,
                },
              },
            },
      ),
    );

    const acceptedClaim: Claim = {
      id: `CLAIM-${Date.now().toString().slice(-5)}`,
      studentRef: claimForm.studentRef,
      studentName: claimForm.studentName,
      institutionId: claimForm.institutionId,
      institutionName: institution.name,
      programme: claimForm.programme,
      cycle: claimForm.cycle,
      bucket: claimForm.bucket,
      apaarStatus: claimForm.apaarStatus,
      matchStatus: claimForm.matchStatus,
      consent: claimForm.consent,
      status: 'Accepted',
      createdAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      findings,
    };

    setClaims((current) => [acceptedClaim, ...current]);
    setLastResult({ title: 'Claim accepted', message: `Seat reserved for ${claimForm.studentName} in the ${claimForm.bucket} bucket.`, type: 'success' });
    addAuditEvent('Institution admin', 'Claim accepted', acceptedClaim.id, `Admission approved for ${claimForm.studentName}`);
    setClaimForm({ ...defaultClaimForm, institutionId: claimForm.institutionId });
  };

  const handleVerifierCheck = () => {
    const ref = verifierForm.ref.trim();
    const purpose = verifierForm.purpose;
    const claimId = demoCredentialClaims[ref.toUpperCase()];
    const credentialClaim = claims.find((claim) => claim.id === claimId);
    const permitted = purpose === 'Admission verification' || purpose === 'Eligibility check';

    if (!ref) {
      setVerifierResult({ status: 'Unable to Confirm', purpose, message: 'Enter a synthetic student credential reference before running the check.' });
      return;
    }

    if (!credentialClaim || credentialClaim.status !== 'Accepted') {
      setVerifierResult({ status: 'Not Verified', purpose, message: 'The submitted credential reference does not match a recognised record in the verification registry.' });
      addAuditEvent('Verifier', 'Verifier query', ref, 'Unknown credential reference returned not verified');
      return;
    }

    if (!permitted) {
      setVerifierResult({ status: 'Unable to Confirm', purpose, message: 'This purpose is outside the permitted scope for the selected credential.' });
      addAuditEvent('Verifier', 'Verifier query', ref, 'Access denied by verifier scope rule');
      return;
    }

    setVerifierResult({ status: 'Verified', purpose, message: 'Only approved fields were returned in the minimal response payload.' });
    addAuditEvent('Verifier', 'Verifier query', ref, 'Minimal verification successful');
  };

  const handleBulkPreview = () => {
    const rows = bulkCsvText
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .slice(1)
      .map((line) => {
        const columns = line.split(',');
        const studentRef = columns[0]?.trim() ?? '';
        const name = columns[1]?.trim() ?? '';
        const institution = columns[2]?.trim() ?? '';
        const programme = columns[3]?.trim() ?? '';
        const status = columns[4]?.trim() ?? 'Review';
        const mappedStatus: BulkRow['status'] = status === 'Blocked' ? 'Blocked' : status === 'Review' ? 'Review' : 'Clean';
        return {
          studentRef,
          name,
          institution,
          programme,
          status: mappedStatus,
          notes: mappedStatus === 'Blocked' ? 'Duplicate claim detected or capacity threshold reached' : mappedStatus === 'Review' ? 'Pending document and lock confirmation' : 'Ready for intake approval',
        };
      });
    setBulkPreview(rows);
  };

  const handleReset = () => {
    if (!window.confirm('Reset all local intake data to the baseline state?')) return;
    setInstitutions(seedInstitutions);
    setClaims(seedClaims);
    setRules(seedRules);
    setAuditEvents(seedAuditEvents);
    setCases(seedCases);
    setClaimForm(defaultClaimForm);
    setLastResult(null);
    setVerifierResult(null);
    setBulkPreview(seedBulkRows);
    setBulkCsvText('studentRef,name,institution,programme,status\nSTU-55010,Meera Nair,Northgate Institute of Technology,B.Tech Information Technology,Clean\nSTU-55011,Arjun Bhat,Riverside School of Engineering,B.E. Civil,Review\nSTU-24091,Aarav Mehta,Greenfield Institute of Management,BBA Digital Marketing,Blocked');
    addAuditEvent('System', 'Data reset', 'baseline', 'Baseline state restored');
  };

  const activeInstitution = institutions.find((institution) => institution.id === 'INST-01') ?? institutions[0];
  const activeInstitutionClaims = claims.filter((claim) => claim.institutionId === activeInstitution?.id);
  const studentClaims = claims.filter((claim) => claim.studentRef === seedStudent.ref);
  const institutionSeatTotal = activeInstitution
    ? Object.values(activeInstitution.buckets).reduce((sum, bucket) => sum + bucket.capacity, 0)
    : 0;
  const institutionSeatsOccupied = activeInstitution
    ? Object.values(activeInstitution.buckets).reduce((sum, bucket) => sum + bucket.occupied, 0)
    : 0;
  const institutionPending = activeInstitutionClaims.filter((claim) => claim.status === 'Pending').length;

  const renderAictOverview = () => (
    <>
      <Row gutter={[16, 16]}>
        <Col span={6}><Card><Statistic title="Accepted claims" value={nationalStats.accepted} valueStyle={{ color: '#16a34a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Pending review" value={nationalStats.pending} valueStyle={{ color: '#d97706' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Blocked claims" value={nationalStats.blocked} valueStyle={{ color: '#dc2626' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Seat utilisation" value={nationalStats.utilisation} suffix="%" /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-16">
        <Col span={12}>
          <Card title="National intake overview">
            <div className="overview-grid">
              <div className="metric-card highlight"><span className="label">Intake utilisation</span><strong>{nationalStats.utilisation}%</strong></div>
              <div className="metric-card"><span className="label">Seats filled</span><strong>{nationalStats.occupiedSeats}</strong></div>
              <div className="metric-card"><span className="label">Approved capacity</span><strong>{nationalStats.totalSeats}</strong></div>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Institution risk map">
            <div className="institution-list">
              {instituteSummary.map((institution) => (
                <div key={institution.id} className="institution-row">
                  <div>
                    <strong>{institution.name}</strong>
                    <span>{institution.state}</span>
                  </div>
                  <div className="institution-metrics">
                    <Tag color={institution.utilisation >= 90 ? 'red' : institution.utilisation >= 75 ? 'gold' : 'green'}>{institution.utilisation}% used</Tag>
                    <span>{institution.occupied}/{institution.seatTotal}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Queue requiring action" className="mt-16">
        <Table
          dataSource={flaggedClaims}
          pagination={false}
          rowKey="id"
          columns={[
            { title: 'Claim ID', dataIndex: 'id', key: 'id' },
            { title: 'Student', dataIndex: 'studentName', key: 'studentName' },
            { title: 'Institution', dataIndex: 'institutionName', key: 'institutionName' },
            { title: 'Status', dataIndex: 'status', key: 'status', render: (value: ClaimStatus) => <Tag color={value === 'Blocked' ? 'red' : 'gold'}>{value}</Tag> },
            { title: 'Issue summary', dataIndex: 'findings', key: 'findings', render: (value: Finding[]) => value[0]?.message },
          ]}
        />
      </Card>
    </>
  );

  const renderInstitutionOverview = () => (
    <>
      <Card className="dashboard-intro">
        <div>
          <p className="small-label">Institution workspace · Synthetic demo records</p>
          <h2>{activeInstitution?.name}</h2>
          <p>Track your approved intake, resolve claim reviews, and confirm student admission locks.</p>
        </div>
        <Button type="primary" onClick={() => setSection('new-claim')}>Create admission claim</Button>
      </Card>
      <Row gutter={[16, 16]} className="mt-16">
        <Col xs={24} md={12} xl={6}><Card><Statistic title="Approved intake" value={institutionSeatTotal} /></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Statistic title="Seats occupied" value={institutionSeatsOccupied} /></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Statistic title="Seats available" value={institutionSeatTotal - institutionSeatsOccupied} valueStyle={{ color: '#16a34a' }} /></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Statistic title="Claims awaiting action" value={institutionPending} valueStyle={{ color: institutionPending ? '#d97706' : '#16a34a' }} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]} className="mt-16">
        <Col xs={24} xl={10}>
          <Card title="Your seat ledger">
            <div className="bucket-list">
              {activeInstitution && Object.entries(activeInstitution.buckets).map(([bucket, seats]) => (
                <div className="bucket-summary" key={bucket}>
                  <div><strong>{bucket}</strong><span>{seats.occupied} of {seats.capacity} seats filled</span></div>
                  <Tag color={seats.occupied / seats.capacity >= 0.9 ? 'gold' : 'green'}>{Math.round((seats.occupied / seats.capacity) * 100)}%</Tag>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title="Recent admission claims" extra={<Button type="link" onClick={() => setSection('claims')}>View all claims</Button>}>
            <Table
              dataSource={activeInstitutionClaims.slice(0, 5)}
              pagination={false}
              rowKey="id"
              columns={[
                { title: 'Student', dataIndex: 'studentName', key: 'studentName' },
                { title: 'Programme', dataIndex: 'programme', key: 'programme' },
                { title: 'Status', dataIndex: 'status', key: 'status', render: (value: ClaimStatus) => <Tag color={value === 'Blocked' ? 'red' : value === 'Pending' ? 'gold' : 'green'}>{value}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderStudentOverview = () => (
    <>
      <Card className="dashboard-intro">
        <div>
          <p className="small-label">Student record · Synthetic demo profile</p>
          <h2>Welcome, {seedStudent.name}</h2>
          <p>Review your admission record and see which confirmations are complete.</p>
        </div>
        <Button type="primary" onClick={() => setSection('student-wallet')}>Open student wallet</Button>
      </Card>
      <Row gutter={[16, 16]} className="mt-16">
        <Col xs={24} md={12} xl={6}><Card><Statistic title="Admission records" value={studentClaims.length} /></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Statistic title="Accepted" value={studentClaims.filter((claim) => claim.status === 'Accepted').length} valueStyle={{ color: '#16a34a' }} /></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Statistic title="Awaiting review" value={studentClaims.filter((claim) => claim.status === 'Pending').length} valueStyle={{ color: '#d97706' }} /></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Statistic title="Verification locks" value={`${Object.values(seedStudent.locks).filter((lock) => lock === 'Verified').length}/3`} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]} className="mt-16">
        <Col xs={24} xl={10}>
          <Card title="Your verification locks">
            <div className="lock-grid">
              {Object.entries(seedStudent.locks).map(([lock, value]) => (
                <div key={lock} className="lock-box">
                  <span>{lock}</span>
                  <Tag color={value === 'Verified' ? 'green' : value === 'Pending' ? 'gold' : 'red'}>{value}</Tag>
                </div>
              ))}
            </div>
            <p className="dashboard-note">Your institution and registry details are shown only for this synthetic demo profile.</p>
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title="Your admission activity">
            <Table
              dataSource={studentClaims}
              pagination={false}
              rowKey="id"
              columns={[
                { title: 'Institution', dataIndex: 'institutionName', key: 'institutionName' },
                { title: 'Programme', dataIndex: 'programme', key: 'programme' },
                { title: 'Status', dataIndex: 'status', key: 'status', render: (value: ClaimStatus) => <Tag color={value === 'Blocked' ? 'red' : value === 'Pending' ? 'gold' : 'green'}>{value}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderVerifierOverview = () => (
    <>
      <Card className="dashboard-intro">
        <div>
          <p className="small-label">Purpose-bound access · Synthetic credentials</p>
          <h2>Verify only what you need</h2>
          <p>Run a minimal credential check for an approved purpose. Student records and internal review details remain private.</p>
        </div>
        <Button type="primary" onClick={() => setSection('verifier')}>Start a verification</Button>
      </Card>
      <Row gutter={[16, 16]} className="mt-16">
        <Col xs={24} md={12} xl={8}><Card><Statistic title="Permitted purposes" value={2} /></Card></Col>
        <Col xs={24} md={12} xl={8}><Card><Statistic title="Demo credential" value="A-10982" /></Card></Col>
        <Col xs={24} md={12} xl={8}><Card><Statistic title="Response fields" value={3} /></Card></Col>
      </Row>
      <Card title="Verification safeguards" className="mt-16">
        <ul className="list-block">
          <li>Checks are limited to admission verification and eligibility confirmation.</li>
          <li>Only a minimal status response is returned for a valid synthetic credential.</li>
          <li>Research queries and unknown credentials are not verified.</li>
        </ul>
      </Card>
    </>
  );

  const renderOverview = () => {
    if (role === 'Institution') return renderInstitutionOverview();
    if (role === 'Student') return renderStudentOverview();
    if (role === 'Verifier') return renderVerifierOverview();
    return renderAictOverview();
  };

  const renderClaims = () => (
    <Card title="Claim register">
      <Table
        dataSource={claims}
        pagination={{ pageSize: 6 }}
        rowKey="id"
        columns={[
          { title: 'Claim ID', dataIndex: 'id', key: 'id' },
          { title: 'Student', dataIndex: 'studentName', key: 'studentName' },
          { title: 'Institution', dataIndex: 'institutionName', key: 'institutionName' },
          { title: 'Programme', dataIndex: 'programme', key: 'programme' },
          { title: 'Bucket', dataIndex: 'bucket', key: 'bucket' },
          { title: 'Status', dataIndex: 'status', key: 'status', render: (value: ClaimStatus) => <Tag color={value === 'Blocked' ? 'red' : value === 'Pending' ? 'gold' : 'green'}>{value}</Tag> },
          { title: 'Findings', dataIndex: 'findings', key: 'findings', render: (value: Finding[]) => value.map((item) => item.code).join(', ') },
        ]}
      />
    </Card>
  );

  const renderNewClaim = () => (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Card title="Admission claim form">
          <div className="claim-form">
            <Input value={claimForm.studentRef} onChange={(event) => handleClaimChange('studentRef', event.target.value)} placeholder="Student reference" />
            <Input value={claimForm.studentName} onChange={(event) => handleClaimChange('studentName', event.target.value)} placeholder="Student name" />
            <Select value={claimForm.institutionId} onChange={(value) => handleClaimChange('institutionId', value)} options={institutions.map((institution) => ({ label: institution.name, value: institution.id }))} />
            <Input value={claimForm.programme} onChange={(event) => handleClaimChange('programme', event.target.value)} placeholder="Programme" />
            <Input value={claimForm.cycle} onChange={(event) => handleClaimChange('cycle', event.target.value)} placeholder="Academic cycle" />
            <Select value={claimForm.bucket} onChange={(value) => handleClaimChange('bucket', value as BucketKey)} options={Object.keys(seedInstitutions[0].buckets).map((bucket) => ({ label: bucket, value: bucket }))} />
            <Select value={claimForm.apaarStatus} onChange={(value) => handleClaimChange('apaarStatus', value as ClaimForm['apaarStatus'])} options={[{ label: 'Verified', value: 'Verified' }, { label: 'Pending', value: 'Pending' }, { label: 'Missing', value: 'Missing' }]} />
            <Select value={claimForm.matchStatus} onChange={(value) => handleClaimChange('matchStatus', value as ClaimForm['matchStatus'])} options={[{ label: 'Match', value: 'Match' }, { label: 'Mismatch', value: 'Mismatch' }, { label: 'Pending', value: 'Pending' }]} />
            <Select value={claimForm.consent} onChange={(value) => handleClaimChange('consent', value as ClaimForm['consent'])} options={[{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }]} />
            <Button type="primary" onClick={handleClaimSubmit}>Submit claim</Button>
          </div>
        </Card>
      </Col>
      <Col span={12}>
        <Card title="Current outcome">
          {lastResult ? <Alert message={lastResult.title} description={lastResult.message} type={lastResult.type} showIcon /> : <Alert message="Awaiting submission" description="Submit a claim to trigger the validation engine and update the seat ledger." type="info" showIcon />}
        </Card>
      </Col>
    </Row>
  );

  const renderSeatLedger = () => (
    <Card title="Seat ledger and intake allocation">
      <div className="ledger-list">
        {instituteSummary.map((institution) => (
          <div key={institution.id} className="ledger-item">
            <div>
              <strong>{institution.name}</strong>
              <span>{institution.state}</span>
            </div>
            <div className="ledger-buckets">
              {Object.entries(institution.buckets).map(([bucket, bucketInfo]) => (
                <div key={bucket} className="bucket-row"><span>{bucket}</span><span>{bucketInfo.occupied}/{bucketInfo.capacity}</span></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderBulkUpload = () => (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Card title="CSV preview">
          <Input.TextArea rows={10} value={bulkCsvText} onChange={(event) => setBulkCsvText(event.target.value)} />
          <Button type="primary" onClick={handleBulkPreview} style={{ marginTop: 12 }}>Preview upload</Button>
        </Card>
      </Col>
      <Col span={12}>
        <Card title="Bulk classification results">
          <Table
            pagination={false}
            dataSource={bulkPreview}
            rowKey="studentRef"
            columns={[
              { title: 'Student', dataIndex: 'name', key: 'name' },
              { title: 'Institution', dataIndex: 'institution', key: 'institution' },
              { title: 'Programme', dataIndex: 'programme', key: 'programme' },
              { title: 'Status', dataIndex: 'status', key: 'status', render: (value: BulkRow['status']) => <Tag color={value === 'Blocked' ? 'red' : value === 'Review' ? 'gold' : 'green'}>{value}</Tag> },
              { title: 'Notes', dataIndex: 'notes', key: 'notes' },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );

  const renderRules = () => (
    <Card title="Rules and validation engine">
      <Table dataSource={rules} rowKey="code" pagination={false} columns={[
        { title: 'Code', dataIndex: 'code', key: 'code' },
        { title: 'Rule name', dataIndex: 'name', key: 'name' },
        { title: 'Severity', dataIndex: 'severity', key: 'severity', render: (value: string) => <Tag color={value === 'Blocker' ? 'red' : value === 'Warning' ? 'gold' : value === 'Error' ? 'volcano' : 'blue'}>{value}</Tag> },
        { title: 'Summary', dataIndex: 'summary', key: 'summary' },
        { title: 'Version', dataIndex: 'version', key: 'version' },
        { title: 'State', dataIndex: 'enabled', key: 'enabled', render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? 'Enabled' : 'Disabled'}</Tag> },
      ]} />
    </Card>
  );

  const renderCases = () => (
    <Card title="Case management">
      <Table dataSource={cases} rowKey="id" pagination={false} columns={[
        { title: 'Case ID', dataIndex: 'id', key: 'id' },
        { title: 'Title', dataIndex: 'title', key: 'title' },
        { title: 'Severity', dataIndex: 'severity', key: 'severity', render: (value: string) => <Tag color={value === 'High' ? 'red' : value === 'Medium' ? 'gold' : 'green'}>{value}</Tag> },
        { title: 'Owner', dataIndex: 'owner', key: 'owner' },
        { title: 'Status', dataIndex: 'status', key: 'status' },
        { title: 'Trust score', dataIndex: 'score', key: 'score' },
        { title: 'Evidence', dataIndex: 'evidence', key: 'evidence' },
      ]} />
    </Card>
  );

  const renderStudentWallet = () => (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Card title="Student wallet">
          <div className="student-card">
            <h3>{seedStudent.name}</h3>
            <p>Reference: {seedStudent.ref}</p>
            <p>Institution: {seedStudent.institution}</p>
            <p>Academic cycle: {seedStudent.cycle}</p>
          </div>
          <div className="lock-grid">
            {Object.entries(seedStudent.locks).map(([lock, value]) => (
              <div key={lock} className="lock-box">
                <span>{lock}</span>
                <Tag color={value === 'Verified' ? 'green' : value === 'Pending' ? 'gold' : 'red'}>{value}</Tag>
              </div>
            ))}
          </div>
        </Card>
      </Col>
      <Col span={12}>
        <Card title="Access and correction log">
          <ul className="list-block compact">{seedStudent.accessLog.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </Card>
      </Col>
    </Row>
  );

  const renderVerifier = () => (
    <Row gutter={[16, 16]}>
      <Col span={12}><Card title="Credential verification request"><div className="verification-panel"><Input value={verifierForm.ref} onChange={(event) => setVerifierForm((current) => ({ ...current, ref: event.target.value }))} placeholder="Credential reference e.g. A-10982" /><Select value={verifierForm.purpose} onChange={(value) => setVerifierForm((current) => ({ ...current, purpose: value }))} options={[{ label: 'Admission verification', value: 'Admission verification' }, { label: 'Eligibility check', value: 'Eligibility check' }, { label: 'Research query', value: 'Research query' }]} /><Button type="primary" onClick={handleVerifierCheck}>Run verification</Button></div></Card></Col>
      <Col span={12}><Card title="Verification result">{verifierResult ? <Alert message={verifierResult.status} description={verifierResult.message} type={verifierResult.status === 'Verified' ? 'success' : verifierResult.status === 'Not Verified' ? 'warning' : 'error'} showIcon /> : <Alert message="No checks executed" description="Enter a credential reference and purpose to check the minimal verification response." type="info" showIcon />}</Card></Col>
    </Row>
  );

  const renderCredentials = () => (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Card title="Credential snapshot">
          <div className="credential-card">
            <div className="credential-header">
              <div>
                <p className="small-label">{credential.kind} · Synthetic demo credential</p>
                <h3>{credential.title}</h3>
              </div>
              <Tag color="green">Valid</Tag>
            </div>
            <div className="qr-box">QR</div>
            <p>Credential reference: {credential.reference}</p>
            <p>Issued: {credential.issued}</p>
            <p>Valid until: {credential.expires}</p>
          </div>
        </Card>
      </Col>
      <Col span={12}>
        <Card title={`${role} credential details`}>
          <ul className="list-block compact">
            <li>Credential subject: {credential.subject}</li>
            <li>Authorized scope: {credential.scope}</li>
            {role === 'Verifier' ? (
              <>
                <li>Use student credential A-10982 to test a valid synthetic admission check.</li>
                <li>Only the minimum response allowed by the selected purpose is returned.</li>
              </>
            ) : role === 'Student' ? (
              <>
                <li>This credential can be checked by an authorized verifier for admission or eligibility.</li>
                <li>Full student details and internal review notes are not shared with verifiers.</li>
              </>
            ) : (
              <>
                <li>Credential scope is limited to the selected demo role.</li>
                <li>Verifier responses disclose only purpose-approved status fields.</li>
              </>
            )}
            <li>Demo credential only; no live government registry is connected.</li>
          </ul>
        </Card>
      </Col>
    </Row>
  );

  const renderIntegrations = () => (
    <Card title="Integration health">
      <div className="integration-grid">
        {[
          ['APAAR registry', 'Connected', 'Registry sync is operating normally across all active intake windows'],
          ['AICTE intake master', 'Connected', 'Approved intake and cycle data is synced and current'],
          ['ERP / SIS', 'Connected', 'Institution data is mapped for the admissions and seat allocation flow'],
          ['OTP / DigiLocker', 'Piloting', 'Verification checks are currently in the controlled rollout stage'],
          ['ABC / NAD', 'Integrated', 'Data exchange remains in the active operational queue'],
          ['SMS / email', 'Connected', 'Notifications are routed to the current government communication channels'],
        ].map(([name, status, description]) => (
          <div key={name} className="integration-card">
            <div className="integration-header">
              <strong>{name}</strong>
              <Tag color={status === 'Connected' ? 'green' : status === 'Integrated' ? 'blue' : status === 'Piloting' ? 'gold' : 'default'}>{status}</Tag>
            </div>
            <p>{description}</p>
          </div>
        ))}      </div>
    </Card>
  );

  const renderArchitecture = () => (
    <Card title="System architecture overview">
      <div className="architecture-grid">
        <div className="arch-box">Institution portal</div>
        <div className="arch-box">AICTE dashboard</div>
        <div className="arch-box">Student wallet</div>
        <div className="arch-box">Verifier portal</div>
        <div className="arch-box wide">Core API</div>
        <div className="arch-box wide">Admission gate + rules engine</div>
        <div className="arch-box wide">Seat ledger + audit stream</div>
        <div className="arch-box">APAAR adapter</div>
        <div className="arch-box">ERP / SIS</div>
        <div className="arch-box">Data projection</div>
      </div>
    </Card>
  );

  const renderAudit = () => (
    <Card title={`${role} audit trail`}>
      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        message={role === 'AICTE'
          ? 'National view: synthetic activity across all demo institutions and roles.'
          : role === 'Institution'
            ? 'Institution view: activity related to Northgate Institute of Technology only.'
            : role === 'Student'
              ? 'Personal view: activity related to Aarav Mehta’s synthetic admission record only.'
              : 'Verifier view: only credential verification requests made by this demo verifier.'}
      />
      <Table dataSource={visibleAuditEvents} rowKey="id" pagination={{ pageSize: 8 }} columns={[
        { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp' },
        { title: 'Actor', dataIndex: 'actor', key: 'actor' },
        { title: 'Action', dataIndex: 'action', key: 'action' },
        { title: 'Record', dataIndex: 'record', key: 'record' },
        { title: 'Reason', dataIndex: 'reason', key: 'reason' },
      ]} />
    </Card>
  );

  const renderLanding = () => (
    <div className="landing-page">
      <div className="portal-strip">
        <div className="landing-container portal-strip-inner">
          <span>AICTE · Education technology prototype</span>
          <span className="portal-utility">Demonstration environment</span>
        </div>
      </div>

      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <a className="landing-brand" href="#home" aria-label="APAAR ShikshaSetu home">
            <img src="/All_India_Council_for_Technical_Education_logo.png" alt="AICTE logo" />
            <span className="brand-divider" aria-hidden="true" />
            <span className="landing-brand-copy">
              <span className="landing-ministry">AICTE · APAAR</span>
              <strong>ShikshaSetu</strong>
            </span>
          </a>
          <nav className="landing-nav" aria-label="Main navigation">
            <a href="#platform">Platform</a>
            <a href="#how-it-works">How it works</a>
            <a href="#roles">Portals</a>
            <a className="landing-nav-cta" href="#roles">Enter demo <span aria-hidden="true">↗</span></a>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero" id="home" aria-labelledby="landing-title">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow"><span className="eyebrow-line" /> TRUST LAYER FOR TECHNICAL ADMISSIONS</p>
              <h1 id="landing-title">Every admission.<br /><span>Accountable by design.</span></h1>
              <p className="landing-lede">APAAR ShikshaSetu connects admission claims, approved intake, and student verification in one explainable journey—from the first seat check to a verifiable credential.</p>
              <div className="landing-hero-actions">
                <a className="primary-link" href="#roles">Explore the portals <span aria-hidden="true">→</span></a>
                <a className="secondary-link" href="#platform">Discover the platform <span aria-hidden="true">↓</span></a>
              </div>
              <div className="landing-assurance"><span className="assurance-dot" /> Synthetic records · No live registry connection</div>
            </div>

            <div className="hero-visual" aria-label="Admission verification flow from institution through APAAR and student confirmation to a verified credential">
              <div className="visual-orbit orbit-one" />
              <div className="visual-orbit orbit-two" />
              <div className="visual-seal"><img src="/All_India_Council_for_Technical_Education_logo.png" alt="" /></div>
              <div className="visual-caption">A connected trust layer</div>
              <div className="flow-card flow-institution">
                <span className="flow-icon institution-icon">I</span>
                <span><strong>Institution</strong><small>Admission claim</small></span>
                <span className="flow-check" aria-label="Connected">✓</span>
              </div>
              <div className="flow-card flow-registry">
                <span className="flow-icon registry-icon">A</span>
                <span><strong>APAAR</strong><small>Identity validation</small></span>
                <span className="flow-check" aria-label="Connected">✓</span>
              </div>
              <div className="flow-card flow-student">
                <span className="flow-icon student-icon">S</span>
                <span><strong>Student</strong><small>Consent & confirmation</small></span>
                <span className="flow-check" aria-label="Connected">✓</span>
              </div>
              <div className="flow-card flow-credential">
                <span className="credential-glyph" aria-hidden="true">✓</span>
                <span><strong>Verified record</strong><small>Purpose-bound credential</small></span>
              </div>
              <div className="hero-visual-note"><span className="note-pulse" /> Triple-Lock verification</div>
            </div>
          </div>
          <div className="hero-bottom-rule" />
        </section>

        <section className="landing-section landing-platform" id="platform" aria-labelledby="platform-title">
          <div className="landing-container">
            <div className="section-heading">
              <div>
                <p className="landing-eyebrow"><span className="eyebrow-line" /> THE SHIKSHASETU TRUST LAYER</p>
                <h2 id="platform-title">A more accountable path<br />from claim to credential.</h2>
              </div>
              <p>Built around the admission gate and the evidence behind every decision. Designed to support oversight—not replace human judgment.</p>
            </div>
            <div className="feature-grid">
              {platformFeatures.map((feature) => (
                <article className="feature-card" key={feature.number}>
                  <span className="feature-number">{feature.number}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <span className="feature-accent" aria-hidden="true" />
                </article>
              ))}
            </div>
            <p className="simulation-note"><span aria-hidden="true">i</span> Some capabilities shown are architecture demonstrations. Registry, signing-key, and cross-institution integrations are simulated in this prototype.</p>
          </div>
        </section>

        <section className="landing-process" id="how-it-works" aria-labelledby="process-title">
          <div className="landing-container process-inner">
            <div className="process-heading">
              <p className="landing-eyebrow"><span className="eyebrow-line" /> ONE SHARED ADMISSION JOURNEY</p>
              <h2 id="process-title">A clear path. Evidence at every step.</h2>
              <p>Every entry point follows the same review flow. When data needs attention, it stays visible and explainable.</p>
            </div>
            <ol className="process-steps">
              <li><span className="step-index">01</span><span className="step-marker">↗</span><strong>Submit a claim</strong><p>Portal, bulk upload, or institution system</p></li>
              <li><span className="step-index">02</span><span className="step-marker">⌕</span><strong>Check the gate</strong><p>Intake rules, seat availability, and duplicate signals</p></li>
              <li><span className="step-index">03</span><span className="step-marker">◎</span><strong>Confirm three locks</strong><p>Institution, registry, and student confirmation</p></li>
              <li><span className="step-index">04</span><span className="step-marker">✓</span><strong>Issue & verify</strong><p>Signed credential and minimal disclosure</p></li>
            </ol>
          </div>
        </section>

        <section className="landing-section portal-section" id="roles" aria-labelledby="roles-title">
          <div className="landing-container">
            <div className="section-heading portal-heading">
              <div>
                <p className="landing-eyebrow"><span className="eyebrow-line" /> CHOOSE YOUR WORKSPACE</p>
                <h2 id="roles-title">One platform. Four perspectives.</h2>
              </div>
              <p>Select a demo role to enter its workspace. Each portal is tailored to the information and actions relevant to that user.</p>
            </div>
            <div className="role-card-grid">
              {landingRoles.map((item) => (
                <button className={`landing-role-card role-${item.tone}`} type="button" key={item.role} onClick={() => enterWorkspace(item.role)}>
                  <span className="role-card-top"><span className="role-card-number">{item.number}</span><span className="role-card-arrow" aria-hidden="true">↗</span></span>
                  <span className="role-card-title">{item.title}</span>
                  <span className="role-card-description">{item.description}</span>
                  <span className="role-card-action">{item.action} <span aria-hidden="true">→</span></span>
                </button>
              ))}
            </div>
            <p className="role-footnote">Role selection is a demonstration convenience, not production authentication.</p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <a className="landing-brand footer-brand" href="#home">
            <img src="/All_India_Council_for_Technical_Education_logo.png" alt="" />
            <span className="landing-brand-copy"><span className="landing-ministry">AICTE · APAAR</span><strong>ShikshaSetu</strong></span>
          </a>
          <p>APAAR ShikshaSetu <span>·</span> Education technology prototype</p>
          <a className="back-to-top" href="#home">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );

  const renderCurrentSection = () => {
    switch (section) {
      case 'claims': return renderClaims();
      case 'new-claim': return renderNewClaim();
      case 'seat-ledger': return renderSeatLedger();
      case 'bulk-upload': return renderBulkUpload();
      case 'rules': return renderRules();
      case 'cases': return renderCases();
      case 'student-wallet': return renderStudentWallet();
      case 'verifier': return renderVerifier();
      case 'credentials': return renderCredentials();
      case 'integrations': return renderIntegrations();
      case 'architecture': return renderArchitecture();
      case 'audit': return renderAudit();
      default: return renderOverview();
    }
  };

  if (showLanding) return renderLanding();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <img className="brand-mark" src="/All_India_Council_for_Technical_Education_logo.png" alt="AICTE logo" />
          <div>
            <p className="brand-label">AICTE</p>
            <h2>APAAR ShikshaSetu</h2>
          </div>
        </div>

        <div className="role-box">
          {roleOptions.map((option) => (
            <button type="button" key={option} className={role === option ? 'nav-button active' : 'nav-button'} onClick={() => { setRole(option); const firstVisible = sectionNav.find((item) => item.roles.includes(option)); if (firstVisible) setSection(firstVisible.key); }}>
              {option}
            </button>
          ))}
        </div>

        <nav className="nav-list">
          {visibleSections.map((item) => (<button key={item.key} type="button" className={section === item.key ? 'menu-item active' : 'menu-item'} onClick={() => setSection(item.key)}>{item.label}</button>))}
        </nav>
      </aside>

      <main className="content-pane">
        <header className="topbar">
          <div>
            <p className="eyebrow">Trust and admissions control</p>
            <h1>{role === 'AICTE' ? 'AICTE admissions control centre' : role === 'Institution' ? 'Institution admission management' : role === 'Student' ? 'Student record centre' : 'Verifier services portal'}</h1>
          </div>
          <div className="header-actions">
            <Button type="text" onClick={() => setShowLanding(true)}>Home</Button>
            <Tag color="blue">Operations status: live intake view</Tag>
            <Button danger onClick={handleReset}>Reset data</Button>
          </div>
        </header>
        {renderCurrentSection()}
      </main>
    </div>
  );
}

export default App;
