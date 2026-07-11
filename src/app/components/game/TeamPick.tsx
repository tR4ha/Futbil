"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPlayerId } from "@/services/session.service";

type Team = {
  id: number;
  name: string;
  display_name: string | null;
  search_name: string;
  type: string;
  logo_url: string | null;
};

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}



export default function TeamPick({ room }: { room: any }) {
  const [query, setQuery] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] =
    useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  const currentPlayerId = getPlayerId();

  const currentRoomPlayer = room.room_players?.find(
    (player: any) =>
      player.player_uuid === currentPlayerId
  );

  async function searchTeams(value: string) {
    setQuery(value);
    setMessage("");

    const cleanValue = normalizeSearch(value);

    if (!cleanValue) {
      setTeams([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    const { data, error } = await supabase
      .from("teams")
      .select(`
        id,
        name,
        display_name,
        search_name,
        type,
        logo_url
      `)
      .ilike("search_name", `%${cleanValue}%`)
      .order("display_name", {
        ascending: true,
        nullsFirst: false,
      })
      .order("name", {
        ascending: true,
      })
      .limit(10);

    setSearching(false);

    if (error) {
      console.error(
        "Team search error:",
        error.message
      );

      setMessage("Takımlar aranamadı.");
      setTeams([]);
      return;
    }

    setTeams((data || []) as Team[]);
  }

  

  async function pickTeam(team: Team) {
    if (!currentRoomPlayer) {
      setMessage("Oyuncu bilgisi bulunamadı.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const { data: round, error: roundError } =
        await supabase
          .from("rounds")
          .select("id, status")
          .eq("room_id", room.id)
          .eq(
            "round_number",
            room.round_number
          )
          .eq("status", "active")
          .single();

      if (roundError || !round) {
        console.error(
          "Round fetch error:",
          roundError?.message
        );

        setMessage("Aktif round bulunamadı.");
        return;
      }

      const { error: pickError } =
        await supabase
          .from("team_picks")
          .upsert(
            {
              round_id: round.id,
              room_player_id:
                currentRoomPlayer.id,
              team_id: team.id,
            },
            {
              onConflict:
                "round_id,room_player_id",
            }
          );

      if (pickError) {
        console.error(
          "Team pick error:",
          pickError.message
        );

        setMessage(pickError.message);
        return;
      }

      setSelectedTeam(team);
      setTeams([]);
      setQuery("");

      
    } catch (error) {
      console.error(
        "Team selection error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Takım seçilemedi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 text-center">
      <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Round {room.round_number}
      </p>

      <h2 className="mt-3 text-3xl font-bold">
        Takımını Seç
      </h2>

      {message && (
        <div className="mt-4 rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300">
          {message}
        </div>
      )}

      {selectedTeam ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 px-4 py-5">
          <p className="text-slate-400">
            Seçimin
          </p>

          <div className="mt-3 flex items-center justify-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10">
              {selectedTeam.logo_url ? (
                <img
                  src={selectedTeam.logo_url}
                  alt={
                    selectedTeam.display_name ||
                    selectedTeam.name
                  }
                  className="h-12 w-12 object-contain"
                />
              ) : (
                <span className="text-2xl">
                  ⚽
                </span>
              )}
            </div>

            <p className="text-2xl font-bold text-emerald-400">
              {selectedTeam.display_name ||
                selectedTeam.name}
            </p>
          </div>

          <p className="mt-4 text-sm text-slate-400">
            Rakip bekleniyor...
          </p>
        </div>
      ) : (
        <>
          <input
            className="mt-6 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-emerald-400"
            placeholder="Takım ara..."
            value={query}
            onChange={(event) =>
              searchTeams(event.target.value)
            }
            autoComplete="off"
          />

          {searching && (
            <p className="mt-4 text-sm text-slate-400">
              Takımlar aranıyor...
            </p>
          )}

          {!searching && teams.length > 0 && (
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    pickTeam(team)
                  }
                  className="flex w-full items-center gap-3 rounded-xl bg-black/30 px-4 py-3 text-left transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={
                          team.display_name ||
                          team.name
                        }
                        className="h-8 w-8 object-contain"
                      />
                    ) : (
                      <span>⚽</span>
                    )}
                  </div>

                  <span className="font-semibold">
                    {team.display_name ||
                      team.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!searching &&
            query.trim() &&
            teams.length === 0 && (
              <p className="mt-4 text-sm text-slate-400">
                Takım bulunamadı.
              </p>
            )}
        </>
      )}
    </div>
  );
}