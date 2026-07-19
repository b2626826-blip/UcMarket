/**
 * 站內智能客服 FAQ（規則／關鍵字匹配）
 * links.authRequired：未登入點擊時先導向登入頁，成功後回目標 path。
 */
export const SUPPORT_FAQ = [
  {
    id: 'register-login',
    category: 'platform',
    keywords: ['註冊', '登入', '帳號', '密碼', 'oauth', 'google', 'firebase', '會員', 'register', 'login'],
    question: '如何註冊與登入？',
    answer:
      '可在右上角點「註冊」建立帳號，或用「登入」進入。支援 Email／密碼，以及 Firebase OAuth（如 Google）。忘記密碼請走「忘記密碼」流程收取重設信。',
    links: [
      { label: '前往登入', path: '/auth/login' },
      { label: '前往註冊', path: '/auth/register' },
    ],
  },
  {
    id: 'virtual-points',
    category: 'platform',
    keywords: ['點數', '虛擬', '錢包', '餘額', '金流', '儲值', '錢', 'wallet', 'points'],
    question: '虛擬點數與錢包是什麼？',
    answer:
      'UcMarket 只使用虛擬點數，不做真實金流或下注。錢包可查看餘額與異動紀錄；交易、結算都會反映在錢包與持倉。',
    links: [{ label: '我的錢包', path: '/wallet', authRequired: true }],
  },
  {
    id: 'buy-yes-no',
    category: 'market',
    keywords: ['買', '交易', 'yes', 'no', '下單', '份額', '賠率', '價格', 'trade', 'buy'],
    question: '如何買入 Yes / No？',
    answer:
      '進入市場詳情頁後，在交易面板選擇 Yes 或 No、輸入金額，系統會試算賠率與可得份額。確認後送出即完成 BUY（SELL 尚未實作）。價格會隨市場 pool 變動。',
    links: [{ label: '瀏覽市場', path: '/home' }],
  },
  {
    id: 'create-market',
    category: 'market',
    keywords: ['開盤', '建立市場', '提交', '審核', 'pending', '上架', 'create', 'market'],
    question: '如何建立預測盤？',
    answer:
      '登入後到「建立市場」，填寫標題、截止時間、資料來源與結算規則。題目須可客觀驗證。送出後進入 pending，管理員審核通過才會成為 active 市場。',
    links: [{ label: '建立市場', path: '/markets/new', authRequired: true }],
  },
  {
    id: 'settlement',
    category: 'market',
    keywords: ['結算', '結果', '派彩', 'resolved', '截止', '盈虧', 'settle', 'result'],
    question: '市場如何結算？',
    answer:
      '市場到期關閉後，由管理員依資料來源設定 Yes／No 結果。系統會依持倉派發虛擬點數盈虧，並更新錢包、持倉與排行榜。結算具防重機制，不會重複派彩。',
  },
  {
    id: 'positions',
    category: 'platform',
    keywords: ['持倉', '部位', '我的預測', 'position', 'portfolio'],
    question: '持倉在哪裡看？',
    answer:
      '登入後可到「持倉」查看各市場 Yes／No 份額與狀態；個人總覽也可從投資組合／個人資料相關頁面進入。',
    links: [{ label: '我的持倉', path: '/positions', authRequired: true }],
  },
  {
    id: 'rankings',
    category: 'platform',
    keywords: ['排行', '排行榜', '獲利', '勝率', '資產', 'ranking', 'leaderboard'],
    question: '排行榜怎麼算？',
    answer:
      '排行榜提供獲利、勝率、資產等面向的排名（依後端統計）。結算與交易完成後資料會更新，可用來比較模擬績效。',
    links: [{ label: '查看排行榜', path: '/rankings' }],
  },
  {
    id: 'binary-market',
    category: 'market',
    keywords: ['二元', '規則', '預測市場', '是非', '選項', 'binary', '規則說明'],
    question: '什麼是二元預測市場？',
    answer:
      'MVP 每個市場只有 Yes 與 No 兩個結果。價格大致依兩側 pool 比例變動；交易試算會計算賠率並限制在合理區間。次數型／多選項市場屬後續規劃，目前未開放。',
  },
  {
    id: 'market-rules',
    category: 'market',
    keywords: ['客觀', '資料來源', '結算規則', '主觀', '題目', '驗證', 'rule'],
    question: '什麼題目可以上架？',
    answer:
      '題目必須能客觀驗證，並寫明截止時間、資料來源與結算規則。避免「很紅」「成功」「受歡迎」等主觀字眼，否則審核可能退回或要求修改。',
  },
  {
    id: 'risk',
    category: 'platform',
    keywords: ['風險', '賭博', '真實金錢', '免責', '聲明', 'risk', 'legal'],
    question: '這是賭博或真實下注嗎？',
    answer:
      '不是。本平台為課程／作品集用的模擬預測市場，僅虛擬點數、無真實金流與加密貨幣入金。請以學習與體驗為目的使用。',
  },
  {
    id: 'weather-market',
    category: 'market',
    keywords: ['天氣', 'weather', '降雨', '氣象'],
    question: '天氣市場是什麼？',
    answer:
      '天氣主題市場可依地區與條件（如是否降雨）進行 Yes／No 預測。部分天氣市場由系統排程建立或輔助結算，詳見天氣列表與詳情頁說明。',
    links: [{ label: '天氣市場', path: '/markets/weather' }],
  },
  {
    id: 'admin',
    category: 'platform',
    keywords: ['管理員', '後台', 'admin', '審核市場'],
    question: '管理員可以做什麼？',
    answer:
      '管理員可審核待上架市場、設定結算結果、管理會員與查看後台報表／紀錄。一般使用者看不到後台；具備 ADMIN 角色者導覽列會出現「管理員」入口。',
  },
];

export const SUPPORT_QUICK_QUESTIONS = [
  '如何註冊與登入？',
  '如何買入 Yes / No？',
  '虛擬點數與錢包是什麼？',
  '如何建立預測盤？',
  '市場如何結算？',
];

export const SUPPORT_WELCOME =
  '你好，我是 UcMarket 小幫手。可點下方快捷問題，或輸入關鍵字查平台用法與市場規則。';

export const SUPPORT_FALLBACK =
  '目前找不到完全相符的說明。你可以改點快捷問題，或試試：註冊、錢包、Yes/No、開盤、結算、排行榜。';
