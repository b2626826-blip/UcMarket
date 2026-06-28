import { useParams } from 'react-router-dom';
import { resolveMarket } from '../../../api/marketApi';
import { useState } from 'react';

export default function MarketResolutionPage() {
  const { id } = useParams();
  const [result, setResult] = useState('');
  const [msg, setMsg] = useState('');

  async function handleResolve() {
    if (!result || (result.toUpperCase() !== 'YES' && result.toUpperCase() !== 'NO')) {
      setMsg('請輸入 YES 或 NO');
      return;
    }
    try {
      await resolveMarket(id, result.toUpperCase());
      setMsg('已結算');
    } catch (err) {
      setMsg('結算失敗：' + err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>市場結算</h1>
        <p>執行市場結算 — ID: {id}</p>
      </div>
      <div className="block-card" style={{ maxWidth: 600 }}>
        <div className="block-card-header">結算操作</div>
        <div className="block-card-body" style={{ padding: 24 }}>
          <p style={{ marginBottom: 16, color: 'var(--text-dim)' }}>請選擇此市場的結算結果：</p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button className={`btn ${result === 'YES' ? 'btn-primary' : ''}`} onClick={() => setResult('YES')}>YES</button>
            <button className={`btn ${result === 'NO' ? 'btn-primary' : ''}`} onClick={() => setResult('NO')}>NO</button>
          </div>
          <button className="btn btn-primary" onClick={handleResolve}>執行結算</button>
          {msg && <p style={{ marginTop: 12, color: msg.includes('失敗') ? 'var(--red)' : 'var(--green)' }}>{msg}</p>}
        </div>
      </div>
    </div>
  );
}
