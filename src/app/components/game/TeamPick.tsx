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

  const currentPlayerId = getPlayerId();

  const currentRoomPlayer = room.room_players.find(
    (player: any) => player.player_uuid === currentPlayerId
  );

  async function searchTeams(value: string) {
    setQuery(value);

    if (value.length < 1) {
      setTeams([]);
      return;
    }

    const { data } = await supabase
      .from("teams")
      .select("*")
      .ilike("search_name", `${value.toLowerCase()}%`)
      .limit(10);

    setTeams(data || []);
  }

  async function pickTeam(team: Team) {
    if (!currentRoomPlayer) {
      alert("Oyuncu bilgisi bulunamadı.");
      return;
    }

    setLoading(true);

    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .select("*")
      .eq("room_id", room.id)
      .eq("round_number", room.round_number)
      .single();

    if (roundError || !round) {
      alert("Round bulunamadı.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("team_picks").upsert(
      {
        round_id: round.id,
        room_player_id: currentRoomPlayer.id,
        team_id: team.id,
      },
      {
        onConflict: "round_id,room_player_id",
      }
    );

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setSelectedTeam(team);

    const { count } = await supabase
      .from("team_picks")
      .select("*", { count: "exact", head: true })
      .eq("round_id", round.id);

    if ((count ?? 0) >= 2) {
      await supabase
        .from("rooms")
        .update({ game_state: "reveal_teams" })
        .eq("id", room.id);
    }

    setLoading(false);
  }

  return (
    
    <div className="mt-8 text-center">
      <ScoreBoard players={room.room_players || []} />
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Round {room.round_number}
      </p>

      <h2 className="mt-3 text-3xl font-bold">Takımını Seç</h2>

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
            placeholder="Real Madrid..."
            value={query}
            onChange={(e) => searchTeams(e.target.value)}
          />

          <div className="mt-4 space-y-2">
            {teams.map((team) => (
              <button
                key={team.id}
                disabled={loading}
                onClick={() => pickTeam(team)}
                className="w-full rounded-xl bg-black/30 px-4 py-3 text-left transition hover:bg-emerald-500/20"
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