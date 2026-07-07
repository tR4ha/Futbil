const PLAYER_KEY = "futbil_player_id";
const NICKNAME_KEY = "futbil_nickname";

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function generateFallbackUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generatePlayerId() {
  if (
    typeof window !== "undefined" &&
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return generateFallbackUuid();
}

export function getPlayerId() {
  if (typeof window === "undefined") return "";

  let playerId = window.localStorage.getItem(PLAYER_KEY);

  if (!playerId || !isValidUuid(playerId)) {
    playerId = generatePlayerId();
    window.localStorage.setItem(PLAYER_KEY, playerId);
  }

  return playerId;
}

export function setNickname(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NICKNAME_KEY, name);
}

export function getNickname() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(NICKNAME_KEY);
}