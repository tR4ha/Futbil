"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import useRoom from "@/hooks/useRoom";
import GameRenderer from "@/app/components/game/GameRenderer";
import ScoreBoard from "@/app/components/game/ScoreBoard";

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
  best_of: number;
  round_ends_at: string | null;
  room_players: Player[];
};

type Props = {
  initialRoom: Room;
};

export default function RoomClient({ initialRoom }: Props) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startingGameRef = useRef(false);

  const localPlayerUuid =
    typeof window !== "undefined"
      ? window.localStorage.getItem("futbil_player_id")
      : null;

  const hostPlayer = room.room_players?.find(
    (player) => player.is_host
  );

  const isHost =
    Boolean(localPlayerUuid) &&
    hostPlayer?.player_uuid === localPlayerUuid;

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
      console.error(
        "Room refresh error:",
        error.message
      );
      return;
    }

    if (data) {
      setRoom(data as Room);
    }
  }, [room.id]);

  useRoom(room.id, refreshRoom);

  useEffect(() => {
    const hasTwoPlayers =
      room.room_players?.length >= 2;

    if (
      hasTwoPlayers &&
      room.game_state === "waiting" &&
      countdown === null
    ) {
      setCountdown(3);
    }

    if (room.game_state !== "waiting") {
      setCountdown(null);
      startingGameRef.current = false;
    }
  }, [
    room.room_players?.length,
    room.game_state,
    countdown,
  ]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      if (!isHost) return;
      if (startingGameRef.current) return;

      startingGameRef.current = true;

      async function startGame() {
        const { error: roundError } = await supabase
          .from("rounds")
          .upsert(
            {
              room_id: room.id,
              round_number: room.round_number,
              status: "active",
            },
            {
              onConflict: "room_id,round_number",
            }
          );

        if (roundError) {
          console.error(
            "Round create error:",
            roundError.message
          );
          startingGameRef.current = false;
          return;
        }

        const { error: roomError } = await supabase
          .from("rooms")
          .update({
            game_state: "team_pick",
            round_ends_at: null,
          })
          .eq("id", room.id)
          .eq("game_state", "waiting");

        if (roomError) {
          console.error(
            "Game state update error:",
            roomError.message
          );
          startingGameRef.current = false;
        }
      }

      startGame();
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((previous) => {
        if (previous === null) return null;
        return Math.max(0, previous - 1);
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [
    countdown,
    isHost,
    room.id,
    room.round_number,
  ]);

  const rendererState =
    room.game_state === "waiting" &&
    countdown !== null
      ? "countdown"
      : room.game_state;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <div className="text-center">
          <h1 className="text-4xl font-bold">
            ⚽ FutBil
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            Oda kodunu arkadaşınla paylaş
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5 text-center">
          <p className="text-sm text-slate-400">
            Oda Kodu
          </p>

          <h2 className="mt-2 text-4xl font-bold tracking-widest text-emerald-400">
            {room.code}
          </h2>
        </div>

        <div className="mt-6">
          <ScoreBoard
  players={room.room_players || []}
  hostScore={room.host_score ?? 0}
  guestScore={room.guest_score ?? 0}
/>
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