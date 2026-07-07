"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: number;
  name: string;
  search_name: string;
  type: string;
};

export default function TeamSearch() {
  const [query, setQuery] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);

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

  return (
    <div style={{ maxWidth: 400 }}>
      <input
        value={query}
        onChange={(e) => searchTeams(e.target.value)}
        placeholder="Takım ara..."
        style={{ width: "100%", padding: 12 }}
      />

      <ul>
        {teams.map((team) => (
          <li key={team.id}>{team.name}</li>
        ))}
      </ul>
    </div>
  );
}