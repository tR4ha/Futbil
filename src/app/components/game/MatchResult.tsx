"use client";

import { supabase } from "@/lib/supabase";

export default function MatchResult({ room }: { room: any }) {
  const host = room.room_players?.find((p: any) => p.is_host);
  const guest = room.room_players?.find((p: any) => !p.is_host);

  const localPlayerId =
    typeof window !== "undefined"
      ? window.localStorage.getItem("futbil_player_id")
      : null;

  const isHost = host?.player_uuid === localPlayerId;

  const hostWon = room.host_score >= 2;
  const winner = hostWon ? host : guest;

  async function restartMatch() {
    const { error } = await supabase
      .from("rooms")
      .update({
        game_state: "team_pick",
        round_number: 1,
        host_score: 0,
        guest_score: 0,
        round_ends_at: null,
      })
      .eq("id", room.id);

    if (error) {
      console.error(error.message);
      return;
    }

    await supabase.from("rounds").insert({
      room_id: room.id,
      round_number: 1,
      status: "active",
    });
  }

  return (
    <div className="mt-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Maç Bitti
      </p>

      <h2 className="mt-4 text-4xl font-bold">
        🏆 {winner?.nickname} Kazandı
      </h2>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/30 px-4 py-5">
          <p className="text-xs text-slate-400">{host?.nickname || "Host"}</p>
          <p className="mt-2 text-4xl font-bold text-emerald-400">
            {room.host_score}
          </p>
        </div>

        <div className="rounded-xl bg-black/30 px-4 py-5">
          <p className="text-xs text-slate-400">{guest?.nickname || "Guest"}</p>
          <p className="mt-2 text-4xl font-bold text-blue-400">
            {room.guest_score}
          </p>
        </div>
      </div>

      {isHost ? (
        <button
          onClick={restartMatch}
          className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400"
        >
          Yeniden Başla
        </button>
      ) : (
        <p className="mt-6 rounded-xl bg-black/30 px-4 py-3 text-sm text-slate-300">
          Hostun yeniden başlatması bekleniyor...
        </p>
      )}
    </div>
  );
}