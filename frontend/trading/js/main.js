// ======================================
// BUY / SELL TAB
// ======================================

const tradeTabs =
document.querySelectorAll(
".trade-tabs button"
);

tradeTabs.forEach(btn => {

    btn.addEventListener("click", () => {

        tradeTabs.forEach(tab => {
            tab.classList.remove("active");
        });

        btn.classList.add("active");

    });

});

// ======================================
// YES / NO / OPTION
// ======================================

const choiceBtns =
document.querySelectorAll(
".trade-choice button"
);

const currentPrice =
document.getElementById(
"currentPrice"
);

choiceBtns.forEach(btn => {

    btn.addEventListener("click", () => {

        choiceBtns.forEach(item => {
            item.classList.remove("active");
        });

        btn.classList.add("active");

        const type =
        btn.dataset.choice;

        switch(type){

            case "YES":

                currentPrice.textContent =
                "$0.62";

                break;

            case "NO":

                currentPrice.textContent =
                "$0.38";

                break;

            case "OPTION":

                currentPrice.textContent =
                "42%";

                break;
        }

        calculateTrade();

    });

});

// ======================================
// MARKET OPTION
// ======================================

const optionCards =
document.querySelectorAll(
".option-card"
);

optionCards.forEach(card => {

    card.addEventListener("click", () => {

        optionCards.forEach(item => {
            item.classList.remove("active");
        });

        card.classList.add("active");

    });

});

// ======================================
// PRICE CALCULATOR
// ======================================

const amountInput =
document.getElementById(
"tradeAmount"
);

const estimatedShares =
document.getElementById(
"estimatedShares"
);

const estimatedReturn =
document.getElementById(
"estimatedReturn"
);

function calculateTrade(){

    const amount =
    Number(amountInput.value) || 0;

    let price = 0.62;

    const activeChoice =
    document.querySelector(
        ".trade-choice .active"
    );

    const type =
    activeChoice.dataset.choice;

    if(type === "YES"){
        price = 0.62;
    }

    if(type === "NO"){
        price = 0.38;
    }

    if(type === "OPTION"){
        price = 0.42;
    }

    const shares =
    amount / price;

    const payout =
    shares * 1;

    estimatedShares.textContent =
    shares.toFixed(2) + " shares";

    estimatedReturn.textContent =
    "$" + payout.toFixed(2);

}

amountInput.addEventListener(
    "input",
    calculateTrade
);

// ======================================
// TRADE SUBMIT
// ======================================

const submitTradeBtn =
document.getElementById(
"submitTradeBtn"
);

submitTradeBtn.addEventListener(
"click",
() => {

    const amount =
    Number(amountInput.value);

    if(!amount){

        showTradeError(
            "請輸入下注金額"
        );

        return;
    }

    if(amount < 10){

        showTradeError(
            "最低下注金額為 $10"
        );

        return;
    }

    if(amount > 50000){

        showTradeError(
            "餘額不足，交易失敗"
        );

        return;
    }

    showTradeSuccess();

});

// ======================================
// SUCCESS
// ======================================

function showTradeSuccess(){

    submitTradeBtn.innerHTML =
    '<i class="fa-solid fa-check"></i> 交易成功';

    submitTradeBtn.style.background =
    "#00d66f";

    setTimeout(() => {

        submitTradeBtn.innerHTML =
        "送出交易";

        submitTradeBtn.style.background =
        "";

    },2000);

}

// ======================================
// ERROR
// ======================================

function showTradeError(msg){

    submitTradeBtn.innerHTML =
    '<i class="fa-solid fa-xmark"></i> ' +
    msg;

    submitTradeBtn.style.background =
    "#ff476d";

    setTimeout(() => {

        submitTradeBtn.innerHTML =
        "送出交易";

        submitTradeBtn.style.background =
        "";

    },2500);

}

// ======================================
// HISTORY FILTER
// ======================================

const filterBtns =
document.querySelectorAll(
".trade-filter-tabs button"
);

const historyRows =
document.querySelectorAll(
"#tradeHistoryBody tr"
);

filterBtns.forEach(btn => {

    btn.addEventListener("click", () => {

        filterBtns.forEach(item => {
            item.classList.remove("active");
        });

        btn.classList.add("active");

        const filter =
        btn.dataset.filter;

        historyRows.forEach(row => {

            if(filter === "all"){

                row.style.display = "";

                return;
            }

            if(
                row.dataset.status === filter
            ){
                row.style.display = "";
            }else{
                row.style.display = "none";
            }

        });

    });

});

// ======================================
// GLOW EFFECT
// ======================================

document.addEventListener(
"mousemove",
event => {

    const card =
    event.target.closest(
        ".trade-market-card, .trade-panel, .trade-status-card, .trade-history-section"
    );

    if(!card) return;

    const rect =
    card.getBoundingClientRect();

    const x =
    event.clientX - rect.left;

    const y =
    event.clientY - rect.top;

    card.style.setProperty(
        "--mouse-x",
        `${x}px`
    );

    card.style.setProperty(
        "--mouse-y",
        `${y}px`
    );

});

// ======================================
// MOCK PRICE UPDATE
// ======================================

setInterval(() => {

    const activeChoice =
    document.querySelector(
        ".trade-choice .active"
    );

    if(!activeChoice) return;

    const type =
    activeChoice.dataset.choice;

    if(type === "YES"){

        const value =
        (0.55 + Math.random()*0.15)
        .toFixed(2);

        currentPrice.textContent =
        "$" + value;
    }

    if(type === "NO"){

        const value =
        (0.30 + Math.random()*0.15)
        .toFixed(2);

        currentPrice.textContent =
        "$" + value;
    }

},5000);

// ======================================
// INIT
// ======================================

calculateTrade();