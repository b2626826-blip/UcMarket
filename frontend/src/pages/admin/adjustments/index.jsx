import { useState, useEffect, useCallback } from 'react';
import { getAdminUsers, adjustWallet, getUserWallet } from '../../../api/adminApi';
import useUiStore from '../../../store/uiStore';
import { formatBalance } from '../../../utils/format';
import Pagination from '../../../components/admin/Pagination';
import UserLedger from './UserLedger';

const PAGE_SIZE = 20;

export default function AdjustmentsPage() {
  const [users, setUsers] = useState([]);
  const [keyword, setKeyword] = useState('');   // 草稿（輸入框即時值）
  const [applied, setApplied] = useState('');   // 已送出（真正打到後端的關鍵字）
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [wallet, setWallet] = useState(null);          // { balance, transactions }
  const [walletLoading, setWalletLoading] = useState(false);
  const [direction, setDirection] = useState('CREDIT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const showToast = useUiStore((s) => s.showToast);

  // 關鍵字丟後端搜（LIKE code/username/email，跟原本前端過濾同三欄）；role=USER 讓後端直接不回管理員
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers({ keyword: applied, role: 'USER', page, size: PAGE_SIZE });
      const list = data?.content || [];
      setUsers(list);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
      // TODO(Harry) 選取策略二選一，目前先走方案1：
      //   方案1「選取跟著可見清單走」＝下面這行：翻頁/重搜後選定用戶不在畫面上就自動取消選取，
      //         面板收起、不留殭屍狀態(zombie state)。
      //   方案2「面板釘住」＝選取時改存整個 user 物件而不是 id（setSelected(u)），翻頁搜尋都不掉面板；
      //         要改的話：刪這行、selectedId 換成 selected 物件、selectedUser 直接用 selected，約 8 行。
      setSelectedId((prev) => (prev && !list.some((u) => u.id === prev) ? null : prev));
    } catch {
      setUsers([]); setTotalPages(0); setTotalElements(0);
    }
    setLoading(false);
  }, [applied, page]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // 選定用戶 → 抓他的餘額 + 流水（用戶清單端點不含餘額，得單獨查）
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

  function search(e) {
    e?.preventDefault();
    setPage(0);
    setApplied(keyword.trim());
  }

  function clearFilters() {
    setKeyword('');
    setApplied('');
    setPage(0);
  }

  // 後端 role=USER 已擋管理員，這行是第二道防呆（調整端點本身也會拒絕 ADMIN 目標）
  const visible = users.filter((u) => u.role !== 'ADMIN');

  const selectedUser = users.find((u) => u.id === selectedId) || null;
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

      <form className="admin-filter-bar mb-3" onSubmit={search}>
        <div>
          <label className="form-label">關鍵字</label>
          <input className="form-control" type="search" placeholder="搜尋編號、名稱、Email" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div className="d-flex gap-2 align-items-end">
          <button type="submit" className="btn btn-primary">搜尋</button>
          <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>清除</button>
        </div>
      </form>

      <section className="block-card mb-3">
        <div className="block-card-header">用戶資料 ({loading ? '…' : totalElements})</div>
        <div className="block-card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0 admin-data-table">
              <thead>
                <tr><th>用戶編號</th><th>用戶名稱</th><th>Email</th><th>操作</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="text-center text-secondary py-4">載入中...</td></tr>
                ) : !visible.length ? (
                  <tr><td colSpan="4" className="text-center text-secondary py-4">找不到符合條件的用戶。</td></tr>
                ) : visible.map((u) => (
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
          <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onChange={setPage} disabled={loading} />
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

            {/* 該用戶流水（格式抄錢包頁、顏色用 admin） */}
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
