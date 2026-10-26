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
  { key: 'credentials', label: 'Credentials', roles: ['Verifier', 'Student'] },
  { key: 'integrations', label: 'Integrations', roles: ['AICTE', 'Institution'] },
  { key: 'architecture', label: 'Architecture', roles: ['AICTE', 'Institution', 'Verifier'] },
  { key: 'audit', label: 'Audit Trail', roles: ['AICTE', 'Institution', 'Student', 'Verifier'] },
];

const seedInstitutions: Institution[] = [
  { id: 'INST-01', name: 'Northgate Institute of Technology', state: 'Delhi', buckets: { General: { capacity: 120, occupied: 108 }, Lateral: { capacity: 30, occupied: 24 }, Supernumerary: { capacity: 15, occupied: 12 } } },
  { id: 'INST-02', name: 'Riverside School of Engineering', state: 'Maharashtra', buckets: { General: { capacity: 100, occupied: 82 }, Lateral: { capacity: 20, occupied: 17 }, Supernumerary: { capacity: 10, occupied: 4 } } },
  { id: 'INST-03', name: 'Greenfield Institute of Management', state: 'Tamil Nadu', buckets: { General: { capacity: 90, occupied: 70 }, Lateral: { capacity: 15, occupied: 12 }, Supernumerary: { capacity: 8, occupied: 3 } } },
];

const seedClaims: Claim[] = [
  { id: 'CLAIM-1024', studentRef: 'STU-24091', studentName: 'Aarav Mehta', institutionId: 'INST-01', institutionName: 'Northgate Institute of Technology', programme: 'B.Tech Computer Science', cycle: '2026-27', bucket: 'General', apaarStatus: 'Verified', matchStatus: 'Match', consent: 'Yes', status: 'Accepted', createdAt: '22 Oct 2026, 08:30', findings: [{ code: 'LOCKS_COMPLETE', severity: 'Info', message: 'All required verification locks are confirmed.', suggestedFix: 'Proceed to final approval.' }] },
  { id: 'CLAIM-1031', studentRef: 'STU-88022', studentName: 'Nisha Verma', institutionId: 'INST-02', institutionName: 'Riverside School of Engineering', programme: 'B.E. Mechanical', cycle: '2026-27', bucket: 'Lateral', apaarStatus: 'Pending', matchStatus: 'Pending', consent: 'Yes', status: 'Pending', createdAt: '23 Oct 2026, 11:10', findings: [{ code: 'APAAR_PENDING', severity: 'Warning', message: 'APAAR validation is pending and the claim remains provisional.', suggestedFix: 'Keep the claim in manual review until registry confirmation is received.' }] },
  { id: 'CLAIM-1038', studentRef: 'STU-24091', studentName: 'Aarav Mehta', institutionId: 'INST-03', institutionName: 'Greenfield Institute of Management', programme: 'BBA Digital Marketing', cycle: '2026-27', bucket: 'General', apaarStatus: 'Verified', matchStatus: 'Match', consent: 'Yes', status: 'Blocked', createdAt: '24 Oct 2026, 14:45', findings: [{ code: 'DUPLICATE_EXCLUSIVE_CLAIM', severity: 'Blocker', message: 'This student already has an exclusive claim in the active cycle.', suggestedFix: 'Reject the second claim and escalate for human review.' }] },
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
  { id: 'AUD-1001', actor: 'Institution admin', action: 'Claim created', record: 'CLAIM-1024', reason: 'Admission submitted for Aarav Mehta', timestamp: '22 Oct 2026, 08:31' },
  { id: 'AUD-1002', actor: 'AICTE reviewer', action: 'Rule check', record: 'CLAIM-1031', reason: 'Parent record flagged for APAAR pending review', timestamp: '23 Oct 2026, 11:13' },
  { id: 'AUD-1003', actor: 'Institution admin', action: 'Claim blocked', record: 'CLAIM-1038', reason: 'Duplicate exclusive claim detected', timestamp: '24 Oct 2026, 14:47' },
];

const seedCases: CaseItem[] = [
  { id: 'CASE-104', title: 'Duplicate exclusive claim lead', severity: 'High', owner: 'AICTE review', status: 'In review', score: 78, evidence: 'The same student record was matched across two institutions in the same cycle' },
  { id: 'CASE-105', title: 'APAAR status unresolved', severity: 'Medium', owner: 'Institution admin', status: 'Open', score: 62, evidence: 'Registry status remains pending while student consent is already captured' },
  { id: 'CASE-107', title: 'Seat utilisation breach risk', severity: 'Low', owner: 'Policy desk', status: 'Resolved', score: 41, evidence: 'General bucket at 90% with approved waiver available' },
];

const seedBulkRows: BulkRow[] = [
  { studentRef: 'STU-44011', name: 'Priya Iyer', institution: 'Northgate Institute of Technology', programme: 'B.Tech Electronics', status: 'Clean', notes: 'Matches institution and seat bucket' },
  { studentRef: 'STU-44012', name: 'Rohan Shah', institution: 'Riverside School of Engineering', programme: 'B.E. Civil', status: 'Review', notes: 'APAAR pending; provisional status applied' },
  { studentRef: 'STU-24091', name: 'Aarav Mehta', institution: 'Greenfield Institute of Management', programme: 'BBA Digital Marketing', status: 'Blocked', notes: 'Exclusive claim duplicate detected' },
];

const seedStudent = {
  name: 'Aarav Mehta',
  ref: 'STU-24091',
  institution: 'Northgate Institute of Technology',
  cycle: '2026-27',
  locks: { institution: 'Verified', registry: 'Pending', student: 'Verified' },
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

function App() {
  const [role, setRole] = useState<Role>('AICTE');
  const [section, setSection] = useState<Section>('overview');
  const [institutions, setInstitutions] = useState<Institution[]>(() => {
    const value = localStorage.getItem(storageKey);
    if (!value) return seedInstitutions;
    try {
      return JSON.parse(value).institutions ?? seedInstitutions;
    } catch {
      return seedInstitutions;
    }
  });
  const [claims, setClaims] = useState<Claim[]>(() => {
    const value = localStorage.getItem(storageKey);
    if (!value) return seedClaims;
    try {
      return JSON.parse(value).claims ?? seedClaims;
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
      return JSON.parse(value).auditEvents ?? seedAuditEvents;
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

  const addAuditEvent = (actor: string, action: string, record: string, reason: string) => {
    setAuditEvents((current) => [{ id: `AUD-${Date.now()}`, actor, action, record, reason, timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) }, ...current]);
  };

  const handleClaimChange = <K extends keyof ClaimForm>(field: K, value: ClaimForm[K]) => {
    setClaimForm((current) => ({ ...current, [field]: value }));
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
    const validRef = ref.toUpperCase().startsWith('A-') || ref.toUpperCase().startsWith('V-');
    const permitted = purpose === 'Admission verification' || purpose === 'Eligibility check';

    if (!validRef && ref !== '') {
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

  const renderOverview = () => (
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
                <p className="small-label">Institution credential</p>
                <h3>Admission verification certificate</h3>
              </div>
              <Tag color="green">Valid</Tag>
            </div>
            <div className="qr-box">QR</div>
            <p>Credential reference: A-10982</p>
            <p>Issued: 05 Jul 2026</p>
            <p>Valid until: 31 Dec 2027</p>
          </div>
        </Card>
      </Col>
      <Col span={12}>
        <Card title="Verification metadata">
          <ul className="list-block compact">
            <li>Purpose-bound access: Admission verification</li>
            <li>Minimal response returned: Name, institution, status</li>
            <li>QR preview is generated for authorized verification events only</li>
            <li>Verification destination: public verifier portal</li>
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
    <Card title="Audit trail">
      <Table dataSource={auditEvents} rowKey="id" pagination={false} columns={[
        { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp' },
        { title: 'Actor', dataIndex: 'actor', key: 'actor' },
        { title: 'Action', dataIndex: 'action', key: 'action' },
        { title: 'Record', dataIndex: 'record', key: 'record' },
        { title: 'Reason', dataIndex: 'reason', key: 'reason' },
      ]} />
    </Card>
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

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">A</div>
          <div>
            <p className="brand-label">AICTE</p>
            <h2>APAAR Sentinel</h2>
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
