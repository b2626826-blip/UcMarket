import { useState, useEffect } from 'react';
import { getAdminUsers, adjustWallet, getUserWallet } from '../../../api/adminApi';
import useUiStore from '../../../store/uiStore';
import { formatBalance } from '../../../utils/format';
import UserLedger from './UserLedger';

export default function AdjustmentsPage() {
  const [allUsers, setAllUsers] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [wallet, setWallet] = useState(null);          // { balance, transactions }
  const [walletLoading, setWalletLoading] = useState(false);
  const [direction, setDirection] = useState('CREDIT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const showToast = useUiStore((s) => s.showToast);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      const list = Array.isArray(data) ? data : (data?.users || []);
      setAllUsers(list);
    } catch { setAllUsers([]); }
    setLoading(false);
  }

  // 選定用戶 → 抓他的餘額 + 流水(用戶清單端點不含餘額,得單獨查)
  useEffect(() => {
    if (!selectedId) { setWallet(null); return; }
    let active = true;
    setWalletLoading(true);
    getUserWallet(selectedId)
      .then((d) => { if (active) setWallet(d); })
      .catch(() => { if (active) setWallet(null); })
      .finally(() => { if (active) setWalletLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  async function reloadWallet() {
    if (!selectedId) return;
    try { setWallet(await getUserWallet(selectedId)); } catch { /* 忽略 */ }
  }

  const filtered = allUsers.filter((u) => {
    if (u.role === 'ADMIN') return false;   // 只能調一般用戶;管理員帳號不列出(後端也會擋)
    const kw = keyword.toLowerCase();
    return !kw || ((u.code || '') + ' ' + (u.username || '') + ' ' + (u.email || '')).toLowerCase().includes(kw);
  });

  const selectedUser = allUsers.find((u) => u.id === selectedId) || null;
  const balance = wallet ? Number(wallet.balance) : null;
  const amt = Number(amount) || 0;
  const preview = balance != null ? balance + (direction === 'CREDIT' ? amt : -amt) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedUser) return;
    if (!(amt > 0)) { showToast('warning', '金額不正確', '請輸入大於 0 的金額。'); return; }
    if (!reason.trim()) { showToast('warning', '缺少原因', '請填寫調整原因。'); return; }
    if (direction === 'DEBIT' && balance != null && amt > balance) {
      showToast('warning', '餘額不足', '扣除金額不可超過用戶目前餘額。'); return;
    }
    setSubmitting(true);
    try {
      await adjustWallet(selectedUser.id, { direction, amount: amt, reason: reason.trim() });
      showToast('success', '調整完成', `已${direction === 'CREDIT' ? '加值' : '扣除'} ${amt} 點給 ${selectedUser.username || selectedUser.email}。`);
      setAmount(''); setReason('');
      await reloadWallet();
    } catch (err) {
      showToast('danger', '調整失敗', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-header mb-3">
        <h1 className="h3 mb-1">錢包調整</h1>
        <p className="text-secondary mb-0">查詢用戶並調整錢包點數（加值 / 扣除），需填寫原因；用戶的交易明細會看到這筆調整。僅列出一般用戶，管理員帳號不可調整。</p>
      </div>

      <form className="admin-filter-bar mb-3" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="form-label">關鍵字</label>
          <input className="form-control" type="search" placeholder="搜尋編號、名稱、Email" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div className="d-flex gap-2 align-items-end">
          <button type="button" className="btn btn-outline-secondary" onClick={() => setKeyword('')}>清除</button>
        </div>
      </form>

      <section className="block-card mb-3">
        <div className="block-card-header">用戶資料 ({filtered.length})</div>
        <div className="block-card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0 admin-data-table">
              <thead>
                <tr><th>用戶編號</th><th>用戶名稱</th><th>Email</th><th>操作</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="text-center text-secondary py-4">載入中...</td></tr>
                ) : !filtered.length ? (
                  <tr><td colSpan="4" className="text-center text-secondary py-4">找不到符合條件的用戶。</td></tr>
                ) : filtered.map((u) => (
                  <tr key={u.id} className={u.id === selectedId ? 'table-active' : ''}>
                    <td className="fw-semibold small">{u.code || (u.id || '').substring(0, 8)}</td>
                    <td>{u.username || ''}</td>
                    <td>{u.email || ''}</td>
                    <td>
                      {u.id === selectedId ? (
                        <span className="text-primary small"><i className="bi bi-check-lg"></i> 已選</span>
                      ) : (
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedId(u.id)}>選擇</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {selectedUser && (
        <section className="block-card">
          <div className="block-card-header"><i className="bi bi-wallet2 me-2"></i>調整面板</div>
          <div className="block-card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 border rounded p-3 mb-3">
              <div>
                <div className="fw-semibold">{selectedUser.username || '—'} <span className="text-secondary small">· {selectedUser.code || (selectedUser.id || '').substring(0, 8)}</span></div>
                <div className="text-secondary small">{selectedUser.email || ''}</div>
              </div>
              <div className="text-end">
                <div className="text-secondary small">目前餘額</div>
                <div className="h5 mb-0">{walletLoading ? '...' : (balance != null ? formatBalance(balance) : '—')}</div>
              </div>
            </div>

            {/* 該用戶流水(格式抄錢包頁、顏色用 admin) */}
            <div className="mb-3">
              <div className="text-secondary small mb-2">用戶流水</div>
              {walletLoading
                ? <p className="text-secondary small mb-0">流水載入中...</p>
                : <UserLedger transactions={wallet?.transactions || []} />}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">調整方向</label>
                <div className="d-flex gap-2">
                  <button type="button"
                    className={`btn fw-semibold ${direction === 'CREDIT' ? '' : 'btn-outline-secondary'}`}
                    style={direction === 'CREDIT' ? { background: '#198754', color: '#fff', borderColor: '#198754' } : undefined}
                    onClick={() => setDirection('CREDIT')}>
                    {direction === 'CREDIT' && <i className="bi bi-check-lg me-1"></i>}<i className="bi bi-plus-lg"></i> 加值
                  </button>
                  <button type="button"
                    className={`btn fw-semibold ${direction === 'DEBIT' ? '' : 'btn-outline-secondary'}`}
                    style={direction === 'DEBIT' ? { background: '#dc3545', color: '#fff', borderColor: '#dc3545' } : undefined}
                    onClick={() => setDirection('DEBIT')}>
                    {direction === 'DEBIT' && <i className="bi bi-check-lg me-1"></i>}<i className="bi bi-dash-lg"></i> 扣除
                  </button>
                </div>
              </div>

              <div className="d-flex gap-3 flex-wrap mb-3">
                <div style={{ flex: '1 1 140px' }}>
                  <label className="form-label">金額</label>
                  <input className="form-control" type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
                </div>
                <div style={{ flex: '2 1 260px' }}>
                  <label className="form-label">原因（用戶看得到）</label>
                  <input className="form-control" type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例：活動獎勵補發" maxLength={255} />
                </div>
              </div>

              {amt > 0 && balance != null && (
                <div className="d-flex align-items-center gap-2 border rounded p-2 mb-3 small">
                  <span className="text-secondary">調整後餘額</span>
                  <span className="text-secondary">{formatBalance(balance)}</span>
                  <i className="bi bi-arrow-right text-secondary"></i>
                  <span className={`fw-semibold ${direction === 'CREDIT' ? 'text-success' : 'text-danger'}`}>{formatBalance(preview)}</span>
                  <span className={`ms-auto fw-semibold ${direction === 'CREDIT' ? 'text-success' : 'text-danger'}`}>{direction === 'CREDIT' ? '+' : '−'}{amt}</span>
                </div>
              )}

              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setSelectedId(null)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '送出中...' : <><i className="bi bi-check-lg"></i> 送出調整</>}
                </button>
              </div>

              <div className="text-secondary small mt-3">
                送出後會在該用戶交易明細產生一筆「系統調整」（型別 ADJUSTMENT），含金額與原因，用戶看得到。餘額走 credit/debit，鏈不斷。
              </div>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
