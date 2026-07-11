"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function MatchResult({
  room,
}: {
  room: any;
}) {
  const [restarting, setRestarting] =
    useState(false);
  const [message, setMessage] =
    useState("");

  const host = room.room_players?.find(
    (player: any) => player.is_host
  );

  const guest = room.room_players?.find(
    (player: any) => !player.is_host
  );

  const localPlayerId =
    typeof window !== "undefined"
      ? window.localStorage.getItem(
          "futbil_player_id"
        )
      : null;

  const isHost =
    host?.player_uuid === localPlayerId;

  const winsNeeded =
    room.best_of ?? 3;

  const hostWon =
    room.host_score >= winsNeeded;

  const guestWon =
    room.guest_score >= winsNeeded;

  const winner = hostWon
    ? host
    : guestWon
      ? guest
      : null;

  async function restartMatch() {
    if (
      !isHost ||
      !localPlayerId ||
      restarting
    ) {
      return;
    }

    setRestarting(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "restart_match",
      {
        p_room_id: room.id,
        p_player_uuid: localPlayerId,
      }
    );

    if (error) {
      console.error(
        "Restart match error:",
        error.message
      );

      setMessage(
        "Maç yeniden başlatılamadı."
      );

      setRestarting(false);
    }
  }

  return (
    <div className="mt-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Maç Bitti
      </p>

      <h2 className="mt-4 text-4xl font-bold">
        🏆{" "}
        {winner?.nickname || "Kazanan"}{" "}
        Kazandı
      </h2>

      <p className="mt-2 text-sm text-slate-400">
        {winsNeeded} galibiyete ulaşan
        maçı kazandı
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/30 px-4 py-5">
          <p className="text-xs text-slate-400">
            {host?.nickname || "Host"}
          </p>

          <p className="mt-2 text-4xl font-bold text-emerald-400">
            {room.host_score}
          </p>
        </div>

        <div className="rounded-xl bg-black/30 px-4 py-5">
          <p className="text-xs text-slate-400">
            {guest?.nickname || "Guest"}
          </p>

          <p className="mt-2 text-4xl font-bold text-blue-400">
            {room.guest_score}
          </p>
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300">
          {message}
        </div>
      )}

      {isHost ? (
        <button
          type="button"
          onClick={restartMatch}
          disabled={restarting}
          className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {restarting
            ? "Başlatılıyor..."
            : "Yeniden Başla"}
        </button>
      ) : (
        <p className="mt-6 rounded-xl bg-black/30 px-4 py-3 text-sm text-slate-300">
          Hostun yeniden başlatması
          bekleniyor...
        </p>
      )}
    </div>
  );
}