const heroSlides = [
    {
        badge: "熱門市場",
        title: "預測未來",
        text: "透過市場價格反映真實世界機率",
        primary: "開始交易",
        secondary: "查看市場"
    },
    {
        badge: "加密市場",
        title: "BTC 200K",
        text: "預測比特幣是否突破歷史新高",
        primary: "立即參與",
        secondary: "查看走勢"
    },
    {
        badge: "交易系統",
        title: "UCMARKET",
        text: "買入、賣出、持倉、結算一次完成",
        primary: "進入交易",
        secondary: "查看排行榜"
    }
];

const slide = document.querySelector(".slide");

let slideIndex = 0;

function renderHeroSlide() {
    if (!slide) return;

    const item = heroSlides[slideIndex];

    slide.innerHTML = `
        <span class="badge">${item.badge}</span>

        <h1>${item.title}</h1>

        <p>${item.text}</p>

<div class="hero-buttons">
    <a href="#" class="primary-btn">${item.primary}</a>
    <a href="#"  class="secondary-btn">${item.secondary}</a>
</div>
    `;
}

renderHeroSlide();

setInterval(() => {
    slideIndex++;

    if (slideIndex >= heroSlides.length) {
        slideIndex = 0;
    }

    slide.style.opacity = 0;

    setTimeout(() => {
        renderHeroSlide();
        slide.style.opacity = 1;
    }, 400);

}, 4000);