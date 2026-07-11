import { supabase } from "@/lib/supabase";

export async function getCurrentRound(
  roomId: string,
  roundNumber: number
) {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber)
    .single();

  if (error) throw error;

  return data;
}

export async function getRoundPicks(roundId: string) {
  const { data, error } = await supabase
    .from("team_picks")
    .select(`
      *,
      teams (
        name,

        display_name,

        logo_url
      ),
      room_players (
        id,
        nickname,
        is_host
      )
    `)
    .eq("round_id", roundId);

  if (error) throw error;

  return data ?? [];
}
export async function findPlayer(name: string) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .ilike("name", name)
    .single();

  if (error) return null;

  return data;
}

export async function validatePlayer(
  playerId: string,
  teamIds: number[]
) {
  const { data, error } = await supabase
    .from("player_teams")
    .select("*")
    .eq("player_id", playerId)
    .in("team_id", teamIds);

  if (error) throw error;

  return (data?.length ?? 0) === teamIds.length;
}
export async function saveAnswer({
  roundId,
  roomPlayerId,
  nickname,
  answer,
}: {
  roundId: string;
  roomPlayerId: string;
  nickname: string;
  answer: string;
}) {
  const { error } = await supabase
    .from("answers")
    .insert({
      round_id: roundId,
      room_player_id: roomPlayerId,
      nickname,
      answer,
    });

  if (error) throw error;
}
export async function finishRound({
  roundId,
  roomPlayerId,
  nickname,
  answer,
}: {
  roundId: string;
  roomPlayerId: string;
  nickname: string;
  answer: string;
}) {
  const { error } = await supabase
    .from("rounds")
    .update({
      status: "finished",
      winner_room_player_id: roomPlayerId,
      winner_nickname: nickname,
      winning_answer: answer,
    })
    .eq("id", roundId)
    .eq("status", "active");

  if (error) throw error;
}
export async function increaseScore({
  roomId,
  isHost,
}: {
  roomId: string;
  isHost: boolean;
}) {
  const column = isHost ? "host_score" : "guest_score";

  const { data: room, error: roomError } = await supabase
  .from("rooms")
  .select("host_score, guest_score")
  .eq("id", roomId)
  .single();

if (roomError) throw roomError;

const currentScore = isHost
  ? room.host_score
  : room.guest_score;

const { error } = await supabase
  .from("rooms")
  .update({
    [column]: currentScore + 1,
    game_state: "round_result",
  })
  .eq("id", roomId);

if (error) throw error;
}
export async function searchPlayers(query: string) {
  const cleanQuery = query.trim().toLowerCase();

  if (cleanQuery.length < 2) return [];

  const { data, error } = await supabase
    .from("players")
    .select("id, name")
    .ilike("search_name", `%${cleanQuery}%`)
    .order("is_active", { ascending: false })
    .order("name")
    .limit(8);

  if (error) throw error;

  return data ?? [];
}