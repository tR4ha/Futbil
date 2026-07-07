"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom, joinRoom } from "@/services/room.service";

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const router = useRouter();

  async function handleCreateRoom() {
    if (!nickname.trim()) {
      alert("Nickname gir.");
      return;
    }

    const room = await createRoom(nickname.trim());
    router.push(`/room/${room.code}`);
  }
  async function handleJoinRoom() {
  if (!nickname.trim()) {
    alert("Nickname gir.");
    return;
  }

  if (!roomCode.trim()) {
    alert("Oda kodu gir.");
    return;
  }

  try {
    const room = await joinRoom(roomCode, nickname.trim());
    router.push(`/room/${room.code}`);
  } catch (err) {
    console.error(err);
    alert(err instanceof Error ? err.message : "Odaya katılınamadı.");
  }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">⚽ FutBil</h1>
          <p className="mt-2 text-sm text-slate-300">
            Find the common football player
          </p>
        </div>

        <label className="text-sm text-slate-300">Nickname</label>
        <input
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-emerald-400"
          placeholder="Furkan"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />

        <button
          onClick={handleCreateRoom}
          className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400"
        >
          Oda Oluştur
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-white/10" />
          VEYA
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <label className="text-sm text-slate-300">Oda Kodu</label>
        <input
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 uppercase outline-none focus:border-blue-400"
          placeholder="A27KYU"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />

        <button
          onClick={handleJoinRoom}
          className="mt-5 w-full rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400"
        >
          Odaya Katıl
        </button>
      </section>
    </main>
  );
}