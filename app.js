const cardDisplay = document.getElementById("card-display");
const drawBtn = document.getElementById("draw-btn");
const clearBtn = document.getElementById("clear-btn");
const historyList = document.getElementById("history-list");

function drawCard() {
  const card = OCCULT_CARDS[Math.floor(Math.random() * OCCULT_CARDS.length)];
  renderCard(card);
  Storage.saveDraw(card);
  renderHistory();
}

function renderCard(card) {
  cardDisplay.innerHTML = `
    <div class="symbol">${card.symbol}</div>
    <div class="name">${card.name}</div>
    <div class="meaning">${card.meaning}</div>
  `;
  cardDisplay.classList.remove("flip");
  requestAnimationFrame(() => cardDisplay.classList.add("flip"));
}

function renderHistory() {
  const history = Storage.getHistory();
  historyList.innerHTML = history
    .map(
      (h) =>
        `<li><span>${h.symbol} ${h.name}</span><time>${new Date(h.drawnAt).toLocaleString()}</time></li>`
    )
    .join("");
}

drawBtn.addEventListener("click", drawCard);
clearBtn.addEventListener("click", () => {
  Storage.clearHistory();
  renderHistory();
});

renderHistory();
