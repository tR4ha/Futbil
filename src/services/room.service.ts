import { supabase } from "@/lib/supabase";
import { getPlayerId, setNickname } from "@/services/session.service";

function generateRoomCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

export async function createRoom(
  nickname: string,
  bestOf: 3 | 5 | 7 = 3
) {
  const code = generateRoomCode();
  const playerId = getPlayerId();

  setNickname(nickname);

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      code,
      status: "waiting",
      game_state: "waiting",
      round_number: 1,
      host_score: 0,
      guest_score: 0,
      round_ends_at: null,
      best_of: bestOf,
    })
    .select()
    .single();

  if (roomError) {
    console.error("Room create error:", roomError.message);
    throw roomError;
  }

  const { error: playerError } = await supabase
    .from("room_players")
    .insert({
      room_id: room.id,
      nickname,
      is_host: true,
      player_uuid: playerId,
    });

  if (playerError) {
    console.error("Room player create error:", playerError.message);
    throw playerError;
  }

  return room;
}

export async function joinRoom(code: string, nickname: string) {
  const cleanCode = code.trim().toUpperCase();
  const playerId = getPlayerId();

  setNickname(nickname);

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", cleanCode)
    .single();

  if (roomError || !room) {
    throw new Error("Oda bulunamadı.");
  }

  const { count } = await supabase
    .from("room_players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", room.id);

  if ((count ?? 0) >= 2) {
    throw new Error("Oda dolu.");
  }

  const { error: playerError } = await supabase
    .from("room_players")
    .insert({
      room_id: room.id,
      nickname,
      is_host: false,
      player_uuid: playerId,
    });

  if (playerError) {
    console.error("Join player error:", playerError.message);
    throw playerError;
  }

  const { error: readyError } = await supabase
    .from("rooms")
    .update({ status: "ready" })
    .eq("id", room.id);

  if (readyError) {
    console.error("Room ready error:", readyError.message);
  }

  return room;
}