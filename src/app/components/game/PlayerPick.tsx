"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getCurrentRound,
  getRoundPicks,
  findPlayer,
  validatePlayer,
  saveAnswer,
  finishRound,
  increaseScore,
  searchPlayers,
} from "@/services/answer.service";


type Pick = {
  id: string;
  teams: {
    name: string;
  };
  room_players: {
    nickname: string;
    is_host: boolean;
  };
};

export default function PlayerPick({ room }: { room: any }) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [answer, setAnswer] = useState("");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [roomPlayerId, setRoomPlayerId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(20);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const currentPlayer = room.room_players.find(
    (player: any) => player.id === roomPlayerId
  );

const isHost = currentPlayer?.is_host === true;

  useEffect(() => {
  async function fetchRoundAndPicks() {
    const nickname = window.localStorage.getItem("futbil_nickname") || "";

    const { data: currentRoomPlayer, error: roomPlayerError } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_id", room.id)
      .eq("nickname", nickname)
      .single();

    if (roomPlayerError || !currentRoomPlayer) {
      console.error("Room player fetch error:", roomPlayerError?.message);
      alert("Oyuncu bilgisi bulunamadı.");
      return;
    }

    setRoomPlayerId(currentRoomPlayer.id);

   const round = await getCurrentRound(
    room.id,
    room.round_number
    );

    setRoundId(round.id);

    const data = await getRoundPicks(round.id);

    setPicks(data || []);
  }

  fetchRoundAndPicks();
}, [room.id, room.round_number]);

useEffect(() => {
  if (!room.round_ends_at) return;

  const interval = setInterval(() => {
    const diff = Math.ceil(
      (new Date(room.round_ends_at).getTime() - Date.now()) / 1000
    );

    if (diff <= 0) {
      setTimeLeft(0);
      clearInterval(interval);
    } else {
      setTimeLeft(diff);
    }
  }, 250);

  return () => clearInterval(interval);
}, [room.round_ends_at]);

useEffect(() => {
  if (timeLeft !== 0) return;
  if (!isHost) return;
  if (!roundId) return;

  async function finishDrawRound() {
    const { error: roundError } = await supabase
      .from("rounds")
      .update({
        status: "finished",
      })
      .eq("id", roundId)
      .eq("status", "active");

    if (roundError) {
      console.error(roundError.message);
      return;
    }

    const { error: roomError } = await supabase
      .from("rooms")
      .update({
        game_state: "round_result",
      })
      .eq("id", room.id);

    if (roomError) {
      console.error(roomError.message);
    }
  }

  finishDrawRound();
}, [timeLeft, isHost, roundId, room.id]);

    
useEffect(() => {
  async function loadSuggestions() {
    if (selectedPlayerId) {
      setSuggestions([]);
      return;
    }

    if (answer.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const players = await searchPlayers(answer);
    setSuggestions(players);
  }

  loadSuggestions();
}, [answer, selectedPlayerId]);

  async function handleSubmitAnswer() {
  setMessage("");

  if (!answer.trim()) {
    setMessage("Cevap yaz.");
    setMessageType("error");
    return;
  }

  if (!roundId) {
    setMessage("Round bulunamadı.");
    setMessageType("error");
    return;
  }

  if (!roomPlayerId) {
    setMessage("Oyuncu bilgisi bulunamadı.");
    setMessageType("error");
    return;
  }

  const normalizedAnswer = answer.trim();
  const nickname = window.localStorage.getItem("futbil_nickname") || "Unknown";

  const { data: currentRound, error: currentRoundError } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (currentRoundError || !currentRound) {
    setMessage("Round bulunamadı.");
    setMessageType("error");
    return;
  }

  if (currentRound.status === "finished") {
    setMessage(
      currentRound.winner_nickname
        ? `Round bitti. Kazanan: ${currentRound.winner_nickname}`
        : "Round bitti. Berabere."
    );
    setMessageType("info");
    return;
  }

  const player = await findPlayer(normalizedAnswer);

  if (!player) {
    setMessage("Bu futbolcu veritabanında yok.");
    setMessageType("error");
    return;
  }

  const teamIds = picks.map((pick: any) => pick.team_id);

  if (teamIds.length < 2) {
    setMessage("Takımlar bulunamadı.");
    setMessageType("error");
    return;
  }

  const isCorrect = await validatePlayer(player.id, teamIds);

  await saveAnswer({
    roundId,
    roomPlayerId,
    nickname,
    answer: normalizedAnswer,
  });

  if (!isCorrect) {
    setMessage("Yanlış cevap.");
    setMessageType("error");
    setSubmitted(true);
    return;
  }

  await finishRound({
    roundId,
    roomPlayerId,
    nickname,
    answer: normalizedAnswer,
  });

  const currentPlayer = room.room_players.find(
    (player: any) => player.id === roomPlayerId
  );

  await increaseScore({
    roomId: room.id,
    isHost: currentPlayer?.is_host === true,
  });

  setMessage("Doğru cevap! Round kazandın.");
  setMessageType("success");
  setSubmitted(true);
}

  return (
  <div className="mt-8 text-center">
    <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
      Round {room.round_number}
    </p>

    <h2 className="mt-3 text-2xl font-bold">Ortak Futbolcuyu Bul</h2>

    <div className="mt-4 text-center">
      <p className="text-sm text-slate-400">Kalan Süre</p>

      <p
        className={`text-5xl font-bold ${
          timeLeft <= 5 ? "text-red-500" : "text-emerald-400"
        }`}
      >
        {timeLeft}
      </p>
    </div>

    <div className="mt-6 grid grid-cols-2 gap-3">
      {picks.map((pick) => (
        <div key={pick.id} className="rounded-xl bg-black/30 px-4 py-5">
          <p className="text-xs text-slate-400">
            {pick.room_players.is_host ? "Host" : "Guest"}
          </p>
          <p className="mt-2 text-lg font-bold text-emerald-400">
            {pick.teams.name}
          </p>
        </div>
      ))}
    </div>

    {message && (
      <div
        className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
          messageType === "success"
            ? "bg-emerald-500/20 text-emerald-300"
            : messageType === "error"
            ? "bg-red-500/20 text-red-300"
            : "bg-blue-500/20 text-blue-300"
        }`}
      >
        {message}
      </div>
    )}

    {submitted ? (
      <div className="mt-6 rounded-xl bg-black/30 px-4 py-4">
        <p className="text-slate-300 font-semibold">
          Cevap gönderildi.
        </p>
      </div>
    ) : (
      <>
        <input
          className="mt-6 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-emerald-400"
          placeholder="Futbolcu adı yaz..."
          value={answer}
          onChange={(event) => {
  setAnswer(event.target.value);
  setSelectedPlayerId(null);
}}
        />

        {suggestions.length > 0 && (
          <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-black/80">
            {suggestions.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => {
                  setSelectedPlayerId(player.id);
                  setAnswer(player.name);
                  setSuggestions([]);
                }}
                className="block w-full border-b border-white/5 px-4 py-3 text-left hover:bg-white/10"
              >
                {player.name}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleSubmitAnswer}
          className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400"
        >
          Cevapla
        </button>
      </>
    )}
  </div>
);
}