export default function LoadingState({ text = '載入中...' }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
      <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: 'var(--gold)', marginBottom: 16 }}></i>
      <p>{text}</p>
    </div>
  );
}
