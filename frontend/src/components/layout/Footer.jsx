/**
 * ⚠️ 孤兒元件（ORPHAN，2026-07-08 盤點）— 全專案零引用，未被任何頁面 import。
 * 保留待日後接回使用或移除；若已重新啟用請刪除本註解。
 */
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <h2 className="footer__logo">UCMARKET</h2>
          <p className="footer__desc">
            © 2024 UCMARKET. 高額預測情報平台。
          </p>
        </div>

        <div className="footer__col">
          <h4>平台</h4>
          <a href="#">所有盤口</a>
          <a href="#">如何運作</a>
          <a href="#">排行榜</a>
        </div>

        <div className="footer__col">
          <h4>資源</h4>
          <a href="#">幫助中心</a>
          <a href="#">API 文檔</a>
          <a href="#">風險披露</a>
        </div>

        <div className="footer__col">
          <h4>公司</h4>
          <a href="#">關於我們</a>
          <a href="#">服務條款</a>
          <a href="#">隱私政策</a>
        </div>
      </div>
    </footer>
  );
}