const classMap = {
  PENDING: 'status-pending', ACTIVE: 'status-active', APPROVED: 'status-approved',
  CLOSED: 'status-closed', RESOLVED: 'status-approved', REJECTED: 'status-rejected',
  DRAFT: 'status-closed', CANCELED: 'status-closed', BANNED: 'status-rejected',
  DISABLED: 'status-closed',
  YES: 'status-active', NO: 'status-closed',
  BUY: 'status-approved', SELL: 'status-closed',
  ADMIN: 'status-active', USER: 'status-closed',
};

export default function StatusBadge({ status, label }) {
  const cls = classMap[status] || 'status-closed';
  return (
    <span className={`status-badge ${cls}`}>
      <span className="status-dot"></span>
      {label || status}
    </span>
  );
}
