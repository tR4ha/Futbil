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
    display_name: string | null;
    logo_url: string | null;
  };
};

export default function TeamReveal({ room }: { room: any }) {
  const [picks, setPicks] = useState<Pick[]>([]);

  const hostPlayer = room.room_players?.find(
    (player: any) => player.is_host === true
  );

  const localPlayerId =
    typeof window !== "undefined"
      ? window.localStorage.getItem("futbil_player_id")
      : null;

  const isHost = hostPlayer?.player_uuid === localPlayerId;

  useEffect(() => {
    async function fetchPicks() {
      const { data, error } = await supabase
        .from("team_picks")
        .select(`
          id,
          team_id,
          room_players (
            nickname,
            is_host
          ),
          teams (
            name,
            display_name,
            logo_url
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

      const formattedPicks: Pick[] = (data || []).map((pick: any) => ({
  id: pick.id,
  team_id: pick.team_id,

  room_players: Array.isArray(pick.room_players)
    ? pick.room_players[0]
    : pick.room_players,

  teams: Array.isArray(pick.teams)
    ? pick.teams[0]
    : pick.teams,
}));

setPicks(formattedPicks);
    }

    fetchPicks();
  }, [room.id, room.round_number]);

  useEffect(() => {
    if (!isHost) return;

    const timer = window.setTimeout(async () => {
      const { error } = await supabase
        .from("rooms")
        .update({
          game_state: "answering",
          round_ends_at: new Date(
            Date.now() + 20_000
          ).toISOString(),
        })
        .eq("id", room.id)
        .eq("game_state", "reveal_teams");

      if (error) {
        console.error(
          "Game state update error:",
          error.message
        );
      }
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [isHost, room.id]);

  return (
    <div className="mt-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Round {room.round_number}
      </p>

      <h2 className="mt-3 text-2xl font-bold">
        Takımlar Açıklandı
      </h2>

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

              <div className="mt-3 flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                  {pick.teams.logo_url ? (
                    <img
                      src={pick.teams.logo_url}
                      alt={teamName}
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <span className="text-2xl">
                      ⚽
                    </span>
                  )}
                </div>

                <p className="text-base font-bold leading-tight text-emerald-400">
                  {teamName}
                </p>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                {pick.room_players.nickname}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Ortak futbolcu ekranına geçiliyor...
      </p>
    </div>
  );
}