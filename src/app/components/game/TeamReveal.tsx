"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Pick = {
  id: string;
  team_id: number;
  room_players: {
    nickname: string;
    is_host: boolean;
  };
  teams: {
    name: string;
  };
};

export default function TeamReveal({ room }: { room: any }) {
  const [picks, setPicks] = useState<Pick[]>([]);

  useEffect(() => {
    async function fetchPicks() {
      const { data, error } = await supabase
        .from("team_picks")
        .select(`
          *,
          room_players (
            nickname,
            is_host
          ),
          teams (
            name
          ),
          rounds!inner (
            room_id,
            round_number
          )
        `)
        .eq("rounds.room_id", room.id)
        .eq("rounds.round_number", room.round_number);

      if (error) {
        console.error("Team picks fetch error:", error.message);
        return;
      }

      setPicks(data || []);
    }

    fetchPicks();
  }, [room.id, room.round_number]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const { error } = await supabase
        .from("rooms")
        .update({
            game_state: "answering",
            round_ends_at: new Date(Date.now() + 20_000).toISOString(),
            })
        .eq("id", room.id);

      if (error) {
        console.error("Game state update error:", error.message);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [room.id]);

  return (
    <div className="mt-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Round {room.round_number}
      </p>

      <h2 className="mt-3 text-2xl font-bold">Takımlar Açıklandı</h2>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {picks.map((pick) => (
          <div key={pick.id} className="rounded-xl bg-black/30 px-4 py-5">
            <p className="text-xs text-slate-400">
              {pick.room_players.is_host ? "Host" : "Guest"}
            </p>

            <p className="mt-2 text-lg font-bold text-emerald-400">
              {pick.teams.name}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {pick.room_players.nickname}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Ortak futbolcu ekranına geçiliyor...
      </p>
    </div>
  );
}