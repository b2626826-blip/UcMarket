/**
 * ?? 摮文??辣嚗RPHAN嚗?026-07-08 ?日?嚗??典?獢撘嚗鋡思遙雿???import??
 * 靽?敺敺?蝙?冽?蝘駁嚗撌脤??啣??刻??芷?祈酉閫??
 */
import "./Footer.css";
import logoImg from "../../assets/logos/ucmarket-logo.png";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <div className="footer__brand">
            <img className="footer__logo-image" src={logoImg} alt="UCMARKET" />
            <h2 className="footer__logo">UCMARKET</h2>
          </div>
          <p className="footer__desc">
            穢 2024 UCMARKET. 擃??葫?撟喳??
          </p>
        </div>

        <div className="footer__col">
          <h4>撟喳</h4>
          <a href="#">????/a>
          <a href="#">憒???</a>
          <a href="#">??璁?/a>
        </div>

        <div className="footer__col">
          <h4>鞈?</h4>
          <a href="#">撟怠銝剖?</a>
          <a href="#">API ??</a>
          <a href="#">憸券?恍</a>
        </div>

        <div className="footer__col">
          <h4>?砍</h4>
          <a href="#">???/a>
          <a href="#">??璇狡</a>
          <a href="#">?梁??輻?</a>
        </div>
      </div>
    </footer>
  );
}
