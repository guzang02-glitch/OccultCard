// 저장소 어댑터: 지금은 localStorage로 동작합니다.
// TODO(Firebase): 내일 Firestore 연결 시 아래 세 함수의 구현만 교체하면 됩니다.
//   - saveDraw(card): Firestore에 뽑기 기록 추가
//   - getHistory(): Firestore에서 기록 목록 조회
//   - clearHistory(): Firestore 기록 삭제
// 다른 파일(app.js)은 이 함수들만 호출하므로 내부 구현이 바뀌어도 수정할 필요가 없습니다.

const HISTORY_KEY = "occultcard_history";

const Storage = {
  saveDraw(card) {
    const history = this.getHistory();
    history.unshift({ ...card, drawnAt: new Date().toISOString() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  },

  getHistory() {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
  },
};
