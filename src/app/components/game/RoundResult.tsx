"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RoundResult({ room }: { room: any }) {
  const [round, setRound] = useState<any>(null);

  const hostPlayer = room.room_players?.find(
    (player: any) => player.is_host === true
  );

  const localPlayerId =
    typeof window !== "undefined"
      ? window.localStorage.getItem("futbil_player_id")
      : null;

  const isHost = hostPlayer?.player_uuid === localPlayerId;

  useEffect(() => {
    async function fetchRound() {
      const { data, error } = await supabase
        .from("rounds")
        .select(`
          *,
          room_players (
            nickname
          )
        `)
        .eq("room_id", room.id)
        .eq("round_number", room.round_number)
        .single();

      if (error) {
        console.error(error.message);
        return;
      }

      setRound(data);
    }

    fetchRound();
  }, [room.id, room.round_number]);

  useEffect(() => {
    if (!isHost) return;

    const timer = setTimeout(async () => {
      if (room.host_score >= 2 || room.guest_score >= 2) {
        await supabase
          .from("rooms")
          .update({ game_state: "match_result" })
          .eq("id", room.id);

        return;
      }

      const nextRound = room.round_number + 1;

      const { error: roundError } = await supabase.from("rounds").upsert(
        {
          room_id: room.id,
          round_number: nextRound,
          status: "active",
        },
        {
          onConflict: "room_id,round_number",
        }
      );

      if (roundError) {
        console.error("Next round create error:", roundError.message);
        return;
      }

      const { error: roomError } = await supabase
        .from("rooms")
        .update({
          round_number: nextRound,
          game_state: "team_pick",
        })
        .eq("id", room.id);

      if (roomError) {
        console.error("Room update error:", roomError.message);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isHost, room.id, room.round_number, room.host_score, room.guest_score]);

  return (
    <div className="mt-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Round Bitti
      </p>

      <h2 className="mt-3 text-3xl font-bold">
        {round?.winner_room_player_id
          ? `🏆 ${round.room_players?.nickname}`
          : "🤝 Berabere"}
      </h2>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/30 px-4 py-5">
          <p className="text-xs text-slate-400">Host</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {room.host_score}
          </p>
        </div>

        <div className="rounded-xl bg-black/30 px-4 py-5">
          <p className="text-xs text-slate-400">Guest</p>
          <p className="mt-2 text-3xl font-bold text-blue-400">
            {room.guest_score}
          </p>
        </div>
      </div>

      {round?.winning_answer && (
        <div className="mt-6 rounded-xl bg-black/30 p-4">
          <p className="text-xs text-slate-400">Doğru Cevap</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {round.winning_answer}
          </p>
        </div>
      )}

      <p className="mt-6 text-sm text-slate-400">
        {isHost
          ? "3 saniye sonra yeni round başlatılıyor..."
          : "Host yeni round'u başlatıyor..."}
      </p>
    </div>
  );
}