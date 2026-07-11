"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getCurrentRound,
  getRoundPicks,
  validatePlayer,
  saveAnswer,
  finishRound,
  increaseScore,
  searchPlayers,
} from "@/services/answer.service";

type Pick = {
  id: string;
  team_id: number;
  teams: {
    name: string;
    display_name: string | null;
    logo_url: string | null;
  };
  room_players: {
    nickname: string;
    is_host: boolean;
  };
};

type PlayerSuggestion = {
  id: string;
  name: string;
  image_url: string | null;
};

type MessageType = "success" | "error" | "info";

export default function PlayerPick({ room }: { room: any }) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [answer, setAnswer] = useState("");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [roomPlayerId, setRoomPlayerId] = useState("");
  const [timeLeft, setTimeLeft] = useState(20);
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<MessageType>("info");
  const [submitting, setSubmitting] = useState(false);

  const currentPlayer = room.room_players?.find(
    (player: any) => player.id === roomPlayerId
  );

  const isHost = currentPlayer?.is_host === true;

  useEffect(() => {
    async function fetchRoundAndPicks() {
      const playerUuid =
        window.localStorage.getItem("futbil_player_id") || "";

      if (!playerUuid) {
        setMessage("Oyuncu kimliği bulunamadı.");
        setMessageType("error");
        return;
      }

      const { data: currentRoomPlayer, error: roomPlayerError } =
        await supabase
          .from("room_players")
          .select("id, nickname, is_host, player_uuid")
          .eq("room_id", room.id)
          .eq("player_uuid", playerUuid)
          .single();

      if (roomPlayerError || !currentRoomPlayer) {
        console.error(
          "Room player fetch error:",
          roomPlayerError?.message
        );

        setMessage("Oyuncu bilgisi bulunamadı.");
        setMessageType("error");
        return;
      }

      setRoomPlayerId(currentRoomPlayer.id);

      try {
        const round = await getCurrentRound(
          room.id,
          room.round_number
        );

        setRoundId(round.id);

        const data = await getRoundPicks(round.id);
        const formattedPicks: Pick[] = (data || []).map((pick: any) => ({
  id: pick.id,
  team_id: pick.team_id,
  teams: Array.isArray(pick.teams)
    ? pick.teams[0]
    : pick.teams,
  room_players: Array.isArray(pick.room_players)
    ? pick.room_players[0]
    : pick.room_players,
}));

setPicks(formattedPicks);
      } catch (error) {
        console.error("Round data fetch error:", error);
        setMessage("Round bilgileri yüklenemedi.");
        setMessageType("error");
      }
    }

    fetchRoundAndPicks();
  }, [room.id, room.round_number]);

  useEffect(() => {
    if (!room.round_ends_at) return;

    function updateTimer() {
      const endTime = new Date(room.round_ends_at).getTime();
      const difference = Math.ceil((endTime - Date.now()) / 1000);

      setTimeLeft(Math.max(0, difference));
    }

    updateTimer();

    const interval = window.setInterval(updateTimer, 250);

    return () => window.clearInterval(interval);
  }, [room.round_ends_at]);

  useEffect(() => {
    if (timeLeft !== 0) return;
    if (!isHost) return;
    if (!roundId) return;

    async function finishDrawRound() {
      const { data: finishedRound, error: roundError } = await supabase
        .from("rounds")
        .update({
          status: "finished",
          winner_room_player_id: null,
          winner_nickname: null,
          winning_answer: null,
        })
        .eq("id", roundId)
        .eq("status", "active")
        .select("id")
        .maybeSingle();

      if (roundError) {
        console.error(
          "Draw round finish error:",
          roundError.message
        );
        return;
      }

      if (!finishedRound) return;

      const { error: roomError } = await supabase
        .from("rooms")
        .update({
          game_state: "round_result",
          round_ends_at: null,
        })
        .eq("id", room.id)
        .eq("game_state", "answering");

      if (roomError) {
        console.error(
          "Draw room update error:",
          roomError.message
        );
      }
    }

    finishDrawRound();
  }, [timeLeft, isHost, roundId, room.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      if (selectedPlayerId) {
        setSuggestions([]);
        return;
      }

      const cleanAnswer = answer.trim();

      if (cleanAnswer.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const players = await searchPlayers(cleanAnswer);

        if (!cancelled) {
          setSuggestions(players);
        }
      } catch (error) {
        console.error("Player search error:", error);

        if (!cancelled) {
          setSuggestions([]);
        }
      }
    }

    const timer = window.setTimeout(loadSuggestions, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [answer, selectedPlayerId]);

  async function submitAnswer(
  playerId: string,
  playerName: string
) {
  if (submitting || submitted) return;

  setMessage("");

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

  if (timeLeft <= 0) {
    setMessage("Süre doldu.");
    setMessageType("info");
    return;
  }

  setSubmitting(true);

  try {
    const normalizedAnswer = playerName.trim();

    const nickname =
      window.localStorage.getItem("futbil_nickname") ||
      "Unknown";

    const { data: currentRound, error: currentRoundError } =
      await supabase
        .from("rounds")
        .select(
          "id, status, winner_nickname, winner_room_player_id"
        )
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
      setSubmitted(true);
      return;
    }

    const teamIds = [
      ...new Set(picks.map((pick) => pick.team_id)),
    ];

    if (teamIds.length < 2) {
      setMessage("Takımlar bulunamadı.");
      setMessageType("error");
      return;
    }

    const isCorrect = await validatePlayer(
      playerId,
      teamIds
    );

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

    const finishedRound = await finishRound({
      roundId,
      roomPlayerId,
      playerId,
      nickname,
      answer: normalizedAnswer,
    });

    if (!finishedRound) {
      setMessage("Rakibin senden önce doğru cevap verdi.");
      setMessageType("info");
      setSubmitted(true);
      return;
    }

    await increaseScore({
      roomId: room.id,
      isHost: currentPlayer?.is_host === true,
    });

    setMessage("Doğru cevap! Round kazandın.");
    setMessageType("success");
    setSubmitted(true);
  } catch (error) {
    console.error("Answer submit error:", error);

    setMessage(
      error instanceof Error
        ? error.message
        : "Cevap gönderilemedi."
    );
    setMessageType("error");
  } finally {
    setSubmitting(false);
  }
}

async function handleSubmitAnswer() {
  if (!answer.trim()) {
    setMessage("Cevap yaz.");
    setMessageType("error");
    return;
  }

  if (!selectedPlayerId) {
    setMessage("Futbolcuyu öneri listesinden seç.");
    setMessageType("error");
    return;
  }

  await submitAnswer(selectedPlayerId, answer);
}

  return (
    <div className="mt-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Round {room.round_number}
      </p>

      <h2 className="mt-3 text-2xl font-bold">
        Ortak Futbolcuyu Bul
      </h2>

      <div className="mt-4">
        <p className="text-sm text-slate-400">
          Kalan Süre
        </p>

        <p
          className={`text-5xl font-bold ${
            timeLeft <= 5
              ? "text-red-500"
              : "text-emerald-400"
          }`}
        >
          {timeLeft}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {picks.map((pick) => {
          const teamName =
            pick.teams.display_name ||
            pick.teams.name;

          return (
            <div
              key={pick.id}
              className="rounded-2xl border border-white/10 bg-black/30 px-3 py-5"
            >
              <p className="text-xs text-slate-400">
                {pick.room_players.is_host
                  ? "Host"
                  : "Guest"}
              </p>

              <div className="mt-3 flex flex-col items-center gap-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                  {pick.teams.logo_url ? (
                    <img
                      src={pick.teams.logo_url}
                      alt={teamName}
                      className="h-11 w-11 object-contain"
                    />
                  ) : (
                    <span className="text-2xl">⚽</span>
                  )}
                </div>

                <p className="text-base font-bold leading-tight text-emerald-400">
                  {teamName}
                </p>
              </div>
            </div>
          );
        })}
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
          <p className="font-semibold text-slate-300">
            Cevap gönderildi.
          </p>
        </div>
      ) : (
        <>
          <input
            className="mt-6 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Futbolcu ara..."
            value={answer}
            disabled={submitting || timeLeft <= 0}
            autoComplete="off"
            onChange={(event) => {
              setAnswer(event.target.value);
              setSelectedPlayerId(null);
              setMessage("");
            }}
          />

          {suggestions.length > 0 && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-black/90">
              {suggestions.map((player) => (
                <button
  key={player.id}
  type="button"
  onClick={() => {
  setSelectedPlayerId(player.id);
  setAnswer(player.name);
  setSuggestions([]);
  setMessage("");

  void submitAnswer(player.id, player.name);
}}
  className="block w-full border-b border-white/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-white/10"
>
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
      {player.image_url ? (
        <img
          src={player.image_url}
          alt={player.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>👤</span>
      )}
    </div>

    <span className="font-semibold">
      {player.name}
    </span>
  </div>
</button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmitAnswer}
            disabled={
              submitting ||
              timeLeft <= 0 ||
              !selectedPlayerId
            }
            className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Kontrol ediliyor..."
              : "Cevapla"}
          </button>
        </>
      )}
    </div>
  );
}