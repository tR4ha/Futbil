"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import useRoom from "@/hooks/useRoom";
import GameRenderer from "@/app/components/game/GameRenderer";

type Player = {
  id: string;
  nickname: string;
  is_host: boolean;
  player_uuid: string;
};

type Room = {
  id: string;
  code: string;
  status: string;
  game_state: string;
  round_number: number;
  host_score: number;
  guest_score: number;
  room_players: Player[];
};

type Props = {
  initialRoom: Room;
};

export default function RoomClient({ initialRoom }: Props) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [countdown, setCountdown] = useState<number | null>(null);

  const refreshRoom = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select(`
        *,
        room_players (*)
      `)
      .eq("id", room.id)
      .single();

    if (error) {
      console.error("Room refresh error:", error.message);
      return;
    }

    if (data) {
      setRoom(data as Room);
    }
  }, [room.id]);

  useRoom(room.id, refreshRoom);

  useEffect(() => {
    if (room.room_players.length >= 2 && room.game_state === "waiting" && countdown === null) {
      setCountdown(3);
    }
  }, [room.room_players.length, room.game_state, countdown]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      async function startGame() {
        const { error: roundError } = await supabase.from("rounds").upsert(
          {
            room_id: room.id,
            round_number: room.round_number,
          },
          {
            onConflict: "room_id,round_number",
          }
        );

        if (roundError) {
          console.error("Round create error:", roundError.message);
          alert(roundError.message);
          return;
        }

        const { error: roomError } = await supabase
          .from("rooms")
          .update({ game_state: "team_pick" })
          .eq("id", room.id);

        if (roomError) {
          console.error("Game state update error:", roomError.message);
          alert(roomError.message);
          return;
        }

        console.log("Game state updated to team_pick");
      }

      startGame();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev === null ? null : prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, room.id, room.round_number]);

  const rendererState =
    room.game_state === "waiting" && countdown !== null
      ? "countdown"
      : room.game_state;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <div className="text-center">
          <h1 className="text-4xl font-bold">⚽ FutBil</h1>
          <p className="mt-2 text-sm text-slate-300">
            Share this room code with your friend
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5 text-center">
          <p className="text-sm text-slate-400">Oda Kodu</p>
          <h2 className="mt-2 text-4xl font-bold tracking-widest text-emerald-400">
            {room.code}
          </h2>
        </div>

        <GameRenderer
          room={{
            ...room,
            game_state: rendererState,
            countdown,
          }}
        />
      </section>
    </main>
  );
}