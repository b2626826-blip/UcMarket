document.addEventListener("DOMContentLoaded", () => {

    /* ==========================
       CHART
    ========================== */

    const chartData = {
        7: [119000,121000,122300,123100,124200,124800,125430],

        30: [
            87800,
            92500,
            98000,
            103000,
            110500,
            114800,
            118000,
            122300,
            120400,
            123600,
            124700,
            125430
        ],

        90: [
            70000,
            76000,
            81000,
            89000,
            97000,
            103000,
            109000,
            114000,
            120000,
            125430
        ],

        365: [
            42000,
            51000,
            60000,
            69000,
            76000,
            84000,
            92000,
            102000,
            111000,
            118000,
            122000,
            125430
        ],

        all: [
            18000,
            26000,
            34000,
            47000,
            62000,
            76000,
            91000,
            108000,
            125430
        ]
    };

    const chartCanvas = document.getElementById("walletChart");

    let walletChart = null;

    function renderChart(range = "30") {

        const ctx = chartCanvas.getContext("2d");

        const values = chartData[range];

        if (walletChart) {
            walletChart.destroy();
        }

        const gradient = ctx.createLinearGradient(
            0,
            0,
            0,
            450
        );

        gradient.addColorStop(
            0,
            "rgba(0,214,79,.35)"
        );

        gradient.addColorStop(
            1,
            "rgba(0,214,79,0)"
        );

        walletChart = new Chart(ctx, {

            type: "line",

            data: {

                labels: values.map((_, i) => i + 1),

                datasets: [{
                    data: values,
                    borderColor: "#00d64f",
                    backgroundColor: gradient,
                    fill: true,
                    borderWidth: 3,
                    tension: .35,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: "#00d64f"
                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: false
                    },

                    tooltip: {

                        backgroundColor: "#0b0b0b",

                        borderColor: "#222",

                        borderWidth: 1,

                        callbacks: {
                            label: (ctx) =>
                                "$" + ctx.raw.toLocaleString()
                        }
                    }
                },

                scales: {

                    x: {
                        display: false
                    },

                    y: {

                        border: {
                            display: false
                        },

                        grid: {
                            color: "rgba(255,255,255,.05)"
                        },

                        ticks: {
                            color: "#777",
                            callback: value =>
                                "$" +
                                value.toLocaleString()
                        }
                    }
                }
            }
        });
    }

    renderChart();

    /* ==========================
       RANGE BUTTONS
    ========================== */

    document
        .querySelectorAll(".range-tabs button")
        .forEach(btn => {

            btn.addEventListener("click", () => {

                document
                    .querySelectorAll(".range-tabs button")
                    .forEach(item =>
                        item.classList.remove("active")
                    );

                btn.classList.add("active");

                renderChart(btn.dataset.range);
            });

        });

    /* ==========================
       MODAL
    ========================== */

    const modal =
        document.getElementById("walletModal");

    const modalTitle =
        document.getElementById("modalTitle");

    const modalDesc =
        document.getElementById("modalDesc");

    const modalAmount =
        document.getElementById("modalAmount");

    let modalType = "";

    function openModal(type) {

        modalType = type;

        modal.classList.add("active");

        modalTitle.textContent = type;

        if (type === "充值") {
            modalDesc.textContent =
                "輸入要充值至錢包的金額";
        }

        if (type === "提現") {
            modalDesc.textContent =
                "輸入要提現至銀行帳戶的金額";
        }

        if (type === "交易") {
            modalDesc.textContent =
                "輸入本次交易投入金額";
        }

        modalAmount.value = "";
    }

    function closeModal() {
        modal.classList.remove("active");
    }

const depositBtn =
document.getElementById("depositBtn");

if (depositBtn) {

    depositBtn.addEventListener("click", () => {
        openModal("充值");
    });

}

    document
        .getElementById("withdrawBtn")
        .addEventListener("click", () => {
            openModal("提現");
        });

    document
        .getElementById("tradeBtn")
        .addEventListener("click", () => {
            openModal("交易");
        });

    document
        .getElementById("modalClose")
        .addEventListener("click", closeModal);

    document
        .getElementById("modalCancel")
        .addEventListener("click", closeModal);

    modal.addEventListener("click", e => {

        if (e.target === modal) {
            closeModal();
        }

    });

    document
        .getElementById("modalConfirm")
        .addEventListener("click", () => {

            const amount =
                Number(modalAmount.value);

            if (!amount || amount <= 0) {

                alert("請輸入有效金額");

                return;
            }

            alert(
                `${modalType}成功\n\n金額：$${amount.toLocaleString()}`
            );

            closeModal();
        });

    /* ==========================
       TRANSACTION FILTER
    ========================== */

    const filterButtons =
        document.querySelectorAll(
            ".transaction-tabs button"
        );

    const rows =
        document.querySelectorAll(
            ".transaction-table tbody tr"
        );

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            filterButtons.forEach(btn =>
                btn.classList.remove("active")
            );

            button.classList.add("active");

            const filter =
                button.dataset.filter;

            rows.forEach(row => {

                if (
                    filter === "all"
                ) {
                    row.style.display =
                        "";
                    return;
                }

                if (
                    row.dataset.type === filter
                ) {
                    row.style.display =
                        "";
                } else {
                    row.style.display =
                        "none";
                }
            });

        });

    });

    /* ==========================
       NAV REGISTER
    ========================== */

    const registerBtn =
        document.getElementById("registerBtn");

    if (registerBtn) {

        registerBtn.addEventListener(
            "click",
            () => {

                alert(
                    "註冊功能之後可串接會員系統"
                );

            }
        );
    }

});
// ==========================
// WALLET CARD 滑鼠光暈
// ==========================

document.addEventListener("mousemove", event => {
    const target = event.target.closest(
        ".wallet-balance-section, .asset-chart-card, .asset-allocation-card, .transaction-section, .profit-card, .asset-item"
    );

    if (!target) return;

    const rect = target.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    target.style.setProperty("--mouse-x", `${x}px`);
    target.style.setProperty("--mouse-y", `${y}px`);
});


// ==========================
// 充值 / 提現 / 交易 按鈕選取變色
// ==========================

const walletActionButtons = document.querySelectorAll(".balance-actions button");

walletActionButtons.forEach(button => {
    button.addEventListener("click", () => {
        walletActionButtons.forEach(btn => {
            btn.classList.remove("selected");
        });

        button.classList.add("selected");
    });
});
const rangeBtns = document.querySelectorAll(".range-tabs button");

rangeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        rangeBtns.forEach(item => item.classList.remove("active"));
        btn.classList.add("active");
    });
});
const transactionBtns = document.querySelectorAll(".transaction-tabs button");
const transactionRows = document.querySelectorAll(".transaction-table tbody tr");

transactionBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        transactionBtns.forEach(item => item.classList.remove("active"));
        btn.classList.add("active");

        const filter = btn.dataset.filter;

        transactionRows.forEach(row => {
            if (filter === "all" || row.dataset.type === filter) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    });
});
const actionBtns = document.querySelectorAll(".balance-actions button");

actionBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        actionBtns.forEach(item => item.classList.remove("selected"));
        btn.classList.add("selected");
    });
});
document.addEventListener("DOMContentLoaded", function () {

    // 充值 / 提現 / 交易
    document.querySelectorAll(".balance-actions button").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".balance-actions button").forEach(function (item) {
                item.classList.remove("selected");
            });

            btn.classList.add("selected");
        });
    });

    // 7天 / 30天 / 90天 / 1年 / 全部
    document.querySelectorAll(".range-tabs button").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".range-tabs button").forEach(function (item) {
                item.classList.remove("active");
            });

            btn.classList.add("active");
        });
    });

    // 全部 / 充值 / 提現 / 交易
    document.querySelectorAll(".transaction-tabs button").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".transaction-tabs button").forEach(function (item) {
                item.classList.remove("active");
            });

            btn.classList.add("active");
        });
    });

});
// ======================
// DRAW TREND LINE
// ======================

const drawCanvas = document.getElementById("drawCanvas");

if(drawCanvas){

    const ctx = drawCanvas.getContext("2d");

    let drawing = false;

    let startX = 0;
    let startY = 0;

    const lines = [];

    function resizeCanvas(){

        drawCanvas.width =
        drawCanvas.offsetWidth;

        drawCanvas.height =
        drawCanvas.offsetHeight;

        redraw();
    }

    window.addEventListener(
        "resize",
        resizeCanvas
    );

    resizeCanvas();

    function redraw(){

        ctx.clearRect(
            0,
            0,
            drawCanvas.width,
            drawCanvas.height
        );

        ctx.strokeStyle = "#d9aa43";
        ctx.lineWidth = 2;

        lines.forEach(line => {

            ctx.beginPath();

            ctx.moveTo(
                line.x1,
                line.y1
            );

            ctx.lineTo(
                line.x2,
                line.y2
            );

            ctx.stroke();

            drawPoint(
                line.x1,
                line.y1
            );

            drawPoint(
                line.x2,
                line.y2
            );

        });

    }

    function drawPoint(x,y){

        ctx.fillStyle="#d9aa43";

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            4,
            0,
            Math.PI*2
        );

        ctx.fill();
    }

    drawCanvas.addEventListener(
        "mousedown",
        e => {

            drawing = true;

            startX = e.offsetX;
            startY = e.offsetY;

        }
    );

    drawCanvas.addEventListener(
        "mouseup",
        e => {

            if(!drawing) return;

            drawing = false;

            lines.push({
                x1:startX,
                y1:startY,
                x2:e.offsetX,
                y2:e.offsetY
            });

            redraw();

        }
    );

}