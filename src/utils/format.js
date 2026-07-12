// 共用格式化工具

// 將 ISO 時間字串轉為易讀格式；len 保留各頁原本的截斷長度（19 = 到秒，16 = 到分）
export function formatTime(val, len = 19) {
  if (!val) return '';
  return val.replace('T', ' ').substring(0, len);
}

// 數字千分位；null/undefined 回傳 '-'
export function formatBalance(n) {
  if (n == null) return '-';
  return Number(n).toLocaleString();
}
