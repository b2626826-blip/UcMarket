const classMap = {
  PENDING: 'status-pending', ACTIVE: 'status-active', APPROVED: 'status-approved',
  CLOSED: 'status-closed', RESOLVED: 'status-approved', REJECTED: 'status-rejected',
  DRAFT: 'status-closed', CANCELED: 'status-closed', BANNED: 'status-rejected',
  YES: 'status-active', NO: 'status-closed',
};

export default function StatusBadge({ status, label }) {
  const cls = classMap[status] || 'status-closed';
  return <span className={`status-badge ${cls}`}>{label || status}</span>;
}
