/**
 * ⚠️ 孤兒元件（ORPHAN，2026-07-08 盤點）— 全專案零引用，未被任何頁面 import。
 * 保留待日後接回使用或移除；若已重新啟用請刪除本註解。
 */
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function PublicLayout() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: "64px" }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}