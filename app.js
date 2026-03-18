/* ============================================================
   KF-MemoryCards — Spaced Repetition Flashcard App
   SM-2 based scheduling, all data in LocalStorage
   ============================================================ */

// --- i18n ---
const I18N = {
  ja: {
    app_name: "暗記カード",
    app_tagline: "忘却曲線に基づくスマート暗記カード",
    tab_review: "今日の復習",
    tab_manage: "カード管理",
    tab_io: "インポート/エクスポート",
    no_review: "今日復習するカードはありません",
    flip_hint: "カードをクリックして裏面を見る",
    forgot: "忘れた",
    fuzzy: "あいまい",
    knew: "覚えた",
    total_cards: "総カード数",
    due_today: "今日の復習",
    mastered: "習得済み",
    add_card: "カードを追加",
    front_label: "表面（質問）",
    back_label: "裏面（答え）",
    front_placeholder: "質問を入力",
    back_placeholder: "答えを入力",
    add_btn: "追加",
    card_list: "カード一覧",
    export_title: "エクスポート",
    export_desc: "全カードをJSON形式でダウンロードします。",
    export_btn: "エクスポート",
    import_title: "インポート",
    import_desc: "JSONファイルからカードを読み込みます。既存カードとマージされます。",
    import_btn: "インポート",
    about_title: "このアプリについて",
    about_description: "暗記が苦手な人のための、忘却曲線に基づくスマート暗記カードアプリです。SM-2アルゴリズムを簡易実装し、最適なタイミングで復習を促します。",
    tech_title: "使用技術",
    delete_confirm: "このカードを削除しますか？",
    next_review: "次の復習",
    today: "今日",
    days_later: "日後",
    import_success: "件のカードをインポートしました",
    import_error: "インポートに失敗しました。正しいJSONファイルを選択してください。",
    no_cards: "カードがまだありません。「カード管理」タブから追加してください。",
    review_complete: "今日の復習が完了しました！",
    review_progress: "/ {total} 枚目",
  },
  en: {
    app_name: "Memory Cards",
    app_tagline: "Smart flashcards based on the forgetting curve",
    tab_review: "Today's Review",
    tab_manage: "Manage Cards",
    tab_io: "Import/Export",
    no_review: "No cards to review today",
    flip_hint: "Click the card to see the back",
    forgot: "Forgot",
    fuzzy: "Fuzzy",
    knew: "Knew it",
    total_cards: "Total Cards",
    due_today: "Due Today",
    mastered: "Mastered",
    add_card: "Add Card",
    front_label: "Front (Question)",
    back_label: "Back (Answer)",
    front_placeholder: "Enter question",
    back_placeholder: "Enter answer",
    add_btn: "Add",
    card_list: "Card List",
    export_title: "Export",
    export_desc: "Download all cards as a JSON file.",
    export_btn: "Export",
    import_title: "Import",
    import_desc: "Load cards from a JSON file. They will be merged with existing cards.",
    import_btn: "Import",
    about_title: "About This App",
    about_description: "A smart flashcard app for people who struggle with memorization. Uses a simplified SM-2 algorithm to schedule reviews at optimal intervals.",
    tech_title: "Technologies Used",
    delete_confirm: "Delete this card?",
    next_review: "Next review",
    today: "today",
    days_later: "days later",
    import_success: "cards imported",
    import_error: "Import failed. Please select a valid JSON file.",
    no_cards: "No cards yet. Add some from the Manage Cards tab.",
    review_complete: "Today's review is complete!",
    review_progress: "/ {total}",
  }
};

let currentLang = localStorage.getItem("kf-mc-lang") || "ja";

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem("kf-mc-lang", lang);
  document.getElementById("lang-select").value = lang;
  document.documentElement.lang = lang;
  applyI18n();
  renderCardList();
  startReview();
  updateStats();
}

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || key;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

// --- SM-2 Spaced Repetition ---
function createCard(front, back) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    front,
    back,
    interval: 0,      // days until next review
    repetition: 0,     // successful reviews in a row
    easeFactor: 2.5,   // ease factor (SM-2)
    dueDate: todayStr(), // next review date (YYYY-MM-DD)
    createdAt: todayStr(),
  };
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function dateDiffDays(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / 86400000);
}

/**
 * SM-2 scheduling.
 * rating: 1 = forgot, 2 = fuzzy, 3 = knew
 */
function scheduleCard(card, rating) {
  // Map our 1-3 rating to SM-2 quality (0-5)
  const qualityMap = { 1: 1, 2: 3, 3: 5 };
  const q = qualityMap[rating];

  if (q < 3) {
    // Failed: reset repetition
    card.repetition = 0;
    card.interval = 1;
  } else {
    if (card.repetition === 0) {
      card.interval = 1;
    } else if (card.repetition === 1) {
      card.interval = 6;
    } else {
      card.interval = Math.round(card.interval * card.easeFactor);
    }
    card.repetition++;
  }

  // Update ease factor (SM-2 formula)
  card.easeFactor = card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (card.easeFactor < 1.3) card.easeFactor = 1.3;

  // Set next due date
  const next = new Date();
  next.setDate(next.getDate() + card.interval);
  card.dueDate = next.getFullYear() + "-" + String(next.getMonth() + 1).padStart(2, "0") + "-" + String(next.getDate()).padStart(2, "0");

  return card;
}

// --- Data Layer (LocalStorage) ---
const STORAGE_KEY = "kf-memory-cards-data";

function loadCards() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

// --- Review Logic ---
let reviewQueue = [];
let reviewIndex = 0;
let isFlipped = false;

function getDueCards() {
  const today = todayStr();
  return loadCards().filter(c => c.dueDate <= today);
}

function startReview() {
  reviewQueue = getDueCards();
  reviewIndex = 0;
  isFlipped = false;
  showCurrentCard();
}

function showCurrentCard() {
  const noReview = document.getElementById("no-review");
  const container = document.getElementById("card-container");
  const inner = document.getElementById("flip-card-inner");
  const ratingBtns = document.getElementById("rating-buttons");
  const flipHint = document.getElementById("flip-hint");

  inner.classList.remove("flipped");
  isFlipped = false;
  ratingBtns.style.display = "none";
  flipHint.style.display = "";

  if (reviewQueue.length === 0) {
    noReview.style.display = "";
    container.style.display = "none";
    const cards = loadCards();
    if (cards.length === 0) {
      noReview.querySelector("p").textContent = t("no_cards");
    } else {
      noReview.querySelector("p").textContent = t("no_review");
    }
    return;
  }

  if (reviewIndex >= reviewQueue.length) {
    noReview.style.display = "";
    container.style.display = "none";
    noReview.querySelector("p").textContent = t("review_complete");
    updateStats();
    return;
  }

  noReview.style.display = "none";
  container.style.display = "";

  const card = reviewQueue[reviewIndex];
  document.getElementById("card-front-text").textContent = card.front;
  document.getElementById("card-back-text").textContent = card.back;
  document.getElementById("review-progress-text").textContent =
    (reviewIndex + 1) + " " + t("review_progress").replace("{total}", reviewQueue.length);
}

function flipCard() {
  const inner = document.getElementById("flip-card-inner");
  isFlipped = !isFlipped;
  inner.classList.toggle("flipped", isFlipped);
  if (isFlipped) {
    document.getElementById("rating-buttons").style.display = "flex";
    document.getElementById("flip-hint").style.display = "none";
  } else {
    document.getElementById("rating-buttons").style.display = "none";
    document.getElementById("flip-hint").style.display = "";
  }
}

function rateCard(rating) {
  const card = reviewQueue[reviewIndex];
  const cards = loadCards();
  const idx = cards.findIndex(c => c.id === card.id);
  if (idx !== -1) {
    scheduleCard(cards[idx], rating);
    saveCards(cards);
  }
  reviewIndex++;
  showCurrentCard();
  updateStats();
}

// --- Card Management ---
function addCard() {
  const frontEl = document.getElementById("input-front");
  const backEl = document.getElementById("input-back");
  const front = frontEl.value.trim();
  const back = backEl.value.trim();
  if (!front || !back) return;

  const cards = loadCards();
  cards.push(createCard(front, back));
  saveCards(cards);
  frontEl.value = "";
  backEl.value = "";
  renderCardList();
  updateStats();
  startReview();
}

function deleteCard(id) {
  if (!confirm(t("delete_confirm"))) return;
  let cards = loadCards();
  cards = cards.filter(c => c.id !== id);
  saveCards(cards);
  renderCardList();
  updateStats();
  startReview();
}

function renderCardList() {
  const list = document.getElementById("card-list");
  const cards = loadCards();
  if (cards.length === 0) {
    list.innerHTML = `<p class="empty-state" style="padding:20px">${t("no_cards")}</p>`;
    return;
  }
  list.innerHTML = cards.map(c => {
    const diff = dateDiffDays(c.dueDate);
    let dueText;
    if (diff <= 0) dueText = t("today");
    else dueText = diff + " " + t("days_later");
    return `<div class="card-item">
      <div class="card-item-text">
        <div class="card-item-front">${escHtml(c.front)}</div>
        <div class="card-item-back">${escHtml(c.back)}</div>
        <div class="card-item-meta">${t("next_review")}: ${dueText}</div>
      </div>
      <div class="card-item-actions">
        <button class="btn btn-sm btn-danger-outline" onclick="deleteCard('${c.id}')">&times;</button>
      </div>
    </div>`;
  }).join("");
}

function escHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// --- Stats ---
function updateStats() {
  const cards = loadCards();
  const due = getDueCards().length;
  const mastered = cards.filter(c => c.repetition >= 5 && c.interval >= 21).length;
  document.getElementById("stat-total").textContent = cards.length;
  document.getElementById("stat-due").textContent = due;
  document.getElementById("stat-mastered").textContent = mastered;
}

// --- Import / Export ---
function exportCards() {
  const cards = loadCards();
  const blob = new Blob([JSON.stringify(cards, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kf-memory-cards-" + todayStr() + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

function importCards() {
  const fileInput = document.getElementById("import-file");
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error();
      const existing = loadCards();
      const existingIds = new Set(existing.map(c => c.id));
      let addedCount = 0;
      for (const card of imported) {
        if (card.front && card.back) {
          if (!existingIds.has(card.id)) {
            existing.push(card);
            addedCount++;
          }
        }
      }
      saveCards(existing);
      renderCardList();
      updateStats();
      startReview();
      alert(addedCount + " " + t("import_success"));
    } catch {
      alert(t("import_error"));
    }
  };
  reader.readAsText(file);
}

// --- Swipe Detection ---
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  const deltaX = e.changedTouches[0].screenX - touchStartX;
  const deltaY = e.changedTouches[0].screenY - touchStartY;
  const minSwipe = 50;

  // Only process swipe during review mode when cards are shown and flipped
  const reviewTab = document.getElementById('tab-review');
  if (!reviewTab || !reviewTab.classList.contains('active')) return;
  if (reviewQueue.length === 0 || reviewIndex >= reviewQueue.length) return;
  if (!isFlipped) return;

  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipe) {
    if (deltaX > 0) {
      // Right swipe = knew it
      rateCard(3);
    } else {
      // Left swipe = forgot
      rateCard(1);
    }
  } else if (deltaY < -minSwipe && Math.abs(deltaY) > Math.abs(deltaX)) {
    // Up swipe = fuzzy
    rateCard(2);
  }
}, { passive: true });

// --- Tab Navigation ---
function showTab(tabName) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(el => el.classList.remove("active"));
  document.getElementById("tab-" + tabName).classList.add("active");
  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add("active");
  if (tabName === "review") startReview();
  if (tabName === "manage") renderCardList();
}

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("lang-select").value = currentLang;
  document.documentElement.lang = currentLang;
  applyI18n();
  updateStats();
  startReview();
  renderCardList();
});
