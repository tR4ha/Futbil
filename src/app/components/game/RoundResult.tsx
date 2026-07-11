"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type WinnerPlayer = {
  id: string;
  name: string;
  image_url: string | null;
};

type WinnerRoomPlayer = {
  nickname: string;
};

type RoundData = {
  id: string;
  status: string;
  winner_room_player_id: string | null;
  winner_nickname: string | null;
  winning_player_id: string | null;
  winning_answer: string | null;
  winner_player: WinnerPlayer | null;
  winner_room_player: WinnerRoomPlayer | null;
};

export default function RoundResult({
  room,
}: {
  room: any;
}) {
  const [round, setRound] =
    useState<RoundData | null>(null);

  const hostPlayer = room.room_players?.find(
    (player: any) => player.is_host === true
  );

  const localPlayerId =
    typeof window !== "undefined"
      ? window.localStorage.getItem(
          "futbil_player_id"
        )
      : null;

  const isHost =
    hostPlayer?.player_uuid === localPlayerId;

  useEffect(() => {
    async function fetchRound() {
      const { data, error } = await supabase
        .from("rounds")
        .select(`
          id,
          status,
          winner_room_player_id,
          winner_nickname,
          winning_player_id,
          winning_answer,
          winner_player:players!winning_player_id (
            id,
            name,
            image_url
          ),
          winner_room_player:room_players!winner_room_player_id (
            nickname
          )
        `)
        .eq("room_id", room.id)
        .eq(
          "round_number",
          room.round_number
        )
        .single();

      if (error) {
        console.error(
          "Round result fetch error:",
          error.message
        );
        return;
      }

      const winnerPlayer = Array.isArray(
        data.winner_player
      )
        ? data.winner_player[0] ?? null
        : data.winner_player;

      const winnerRoomPlayer = Array.isArray(
        data.winner_room_player
      )
        ? data.winner_room_player[0] ?? null
        : data.winner_room_player;

      setRound({
        ...data,
        winner_player: winnerPlayer,
        winner_room_player: winnerRoomPlayer,
      } as RoundData);
    }

    fetchRound();
  }, [room.id, room.round_number]);

  useEffect(() => {
    if (!isHost) return;

    const timer = window.setTimeout(
      async () => {
        const winsNeeded =
          room.best_of ?? 3;

        const matchFinished =
          room.host_score >= winsNeeded ||
          room.guest_score >= winsNeeded;

        if (matchFinished) {
          const { error } = await supabase
            .from("rooms")
            .update({
              game_state: "match_result",
              round_ends_at: null,
            })
            .eq("id", room.id)
            .eq(
              "game_state",
              "round_result"
            );

          if (error) {
            console.error(
              "Match result state error:",
              error.message
            );
          }

          return;
        }

        const nextRound =
          room.round_number + 1;

        const { error: roundError } =
          await supabase
            .from("rounds")
            .upsert(
              {
                room_id: room.id,
                round_number: nextRound,
                status: "active",
                winner_room_player_id: null,
                winning_player_id: null,
                winner_nickname: null,
                winning_answer: null,
              },
              {
                onConflict:
                  "room_id,round_number",
              }
            );

        if (roundError) {
          console.error(
            "Next round create error:",
            roundError.message
          );
          return;
        }

        const { error: roomError } =
          await supabase
            .from("rooms")
            .update({
              round_number: nextRound,
              game_state: "team_pick",
              round_ends_at: null,
            })
            .eq("id", room.id)
            .eq(
              "game_state",
              "round_result"
            );

        if (roomError) {
          console.error(
            "Room update error:",
            roomError.message
          );
        }
      },
      3000
    );

    return () =>
      window.clearTimeout(timer);
  }, [
    isHost,
    room.id,
    room.round_number,
    room.host_score,
    room.guest_score,
    room.best_of,
  ]);

  const winnerNickname =
    round?.winner_room_player?.nickname ||
    round?.winner_nickname;

  const isDraw =
    !round?.winner_room_player_id;

  return (
    <div className="mt-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Round Bitti
      </p>

      <h2 className="mt-3 text-3xl font-bold">
        {isDraw
          ? "🤝 Berabere"
          : `🏆 ${
              winnerNickname || "Kazanan"
            }`}
      </h2>

      {round?.winning_answer && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-left">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
            {round.winner_player
              ?.image_url ? (
              <img
                src={
                  round.winner_player
                    .image_url
                }
                alt={
                  round.winner_player.name ||
                  round.winning_answer
                }
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl">
                👤
              </span>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Doğru Cevap
            </p>

            <p className="mt-1 break-words text-2xl font-bold text-emerald-400">
              {round.winning_answer}
            </p>

            {winnerNickname && (
              <p className="mt-1 text-sm text-slate-400">
                {winnerNickname} bildi
              </p>
            )}
          </div>
        </div>
      )}

      {!round && (
        <p className="mt-6 text-sm text-slate-400">
          Round sonucu yükleniyor...
        </p>
      )}

      <p className="mt-6 text-sm text-slate-400">
        {isHost
          ? "3 saniye sonra devam ediliyor..."
          : "Hostun devam etmesi bekleniyor..."}
      </p>
    </div>
  );
}