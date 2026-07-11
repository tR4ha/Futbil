"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPlayerId } from "@/services/session.service";
import ScoreBoard from "./ScoreBoard";

type Team = {
  id: number;
  name: string;
  search_name: string;
  type: string;
};

export default function TeamPick({ room }: { room: any }) {
  const [query, setQuery] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const currentPlayerId = getPlayerId();

  const currentRoomPlayer = room.room_players?.find(
    (player: any) => player.player_uuid === currentPlayerId
  );

  async function searchTeams(value: string) {
    setQuery(value);
    setMessage("");

    const cleanValue = value.trim().toLowerCase();

    if (cleanValue.length < 1) {
      setTeams([]);
      return;
    }

    const { data, error } = await supabase
      .from("teams")
      .select("id, name, search_name, type")
      .ilike("search_name", `%${cleanValue}%`)
      .order("name")
      .limit(10);

    if (error) {
      console.error("Team search error:", error.message);
      setMessage("Takımlar aranamadı.");
      return;
    }

    setTeams(data || []);
  }

  async function pickTeam(team: Team) {
    if (!currentRoomPlayer) {
      setMessage("Oyuncu bilgisi bulunamadı.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data: round, error: roundError } = await supabase
        .from("rounds")
        .select("*")
        .eq("room_id", room.id)
        .eq("round_number", room.round_number)
        .eq("status", "active")
        .single();

      if (roundError || !round) {
        setMessage("Aktif round bulunamadı.");
        return;
      }

      const { error: pickError } = await supabase
        .from("team_picks")
        .upsert(
          {
            round_id: round.id,
            room_player_id: currentRoomPlayer.id,
            team_id: team.id,
          },
          {
            onConflict: "round_id,room_player_id",
          }
        );

      if (pickError) {
        setMessage(pickError.message);
        return;
      }

      setSelectedTeam(team);
      setTeams([]);

      const { data: roundPicks, error: picksError } = await supabase
        .from("team_picks")
        .select("id, team_id")
        .eq("round_id", round.id);

      if (picksError) {
        console.error("Round picks error:", picksError.message);
        return;
      }

      if ((roundPicks?.length ?? 0) < 2) {
        return;
      }

      const sameTeam =
        roundPicks?.[0]?.team_id === roundPicks?.[1]?.team_id;

      if (sameTeam) {
        const { error: finishError } = await supabase
          .from("rounds")
          .update({
            status: "finished",
            winner_room_player_id: null,
            winner_nickname: null,
            winning_answer: null,
          })
          .eq("id", round.id)
          .eq("status", "active");

        if (finishError) {
          console.error("Same-team round finish error:", finishError.message);
          return;
        }

        const { error: roomError } = await supabase
          .from("rooms")
          .update({
            game_state: "round_result",
            round_ends_at: null,
          })
          .eq("id", room.id);

        if (roomError) {
          console.error("Same-team room update error:", roomError.message);
        }

        return;
      }

      const { error: roomError } = await supabase
        .from("rooms")
        .update({
          game_state: "reveal_teams",
          round_ends_at: null,
        })
        .eq("id", room.id);

      if (roomError) {
        console.error("Reveal state error:", roomError.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 text-center">
      <ScoreBoard players={room.room_players || []} />

      <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Round {room.round_number}
      </p>

      <h2 className="mt-3 text-3xl font-bold">Takımını Seç</h2>

      {message && (
        <div className="mt-4 rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300">
          {message}
        </div>
      )}

      {selectedTeam ? (
        <div className="mt-6 rounded-xl bg-black/30 px-4 py-4">
          <p className="text-slate-400">Seçimin</p>

          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {selectedTeam.name}
          </p>

          <p className="mt-3 text-sm text-slate-400">
            Rakip bekleniyor...
          </p>
        </div>
      ) : (
        <>
          <input
            className="mt-6 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-emerald-400"
            placeholder="Takım ara..."
            value={query}
            onChange={(e) => searchTeams(e.target.value)}
            autoComplete="off"
          />

          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                disabled={loading}
                onClick={() => pickTeam(team)}
                className="w-full rounded-xl bg-black/30 px-4 py-3 text-left transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {team.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}