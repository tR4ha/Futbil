"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom, joinRoom } from "@/services/room.service";

type BestOf = 3 | 5 | 7;

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [bestOf, setBestOf] = useState<BestOf>(3);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleCreateRoom() {
    if (!nickname.trim()) {
      setMessage("Nickname gir.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const room = await createRoom(nickname.trim(), bestOf);
      router.push(`/room/${room.code}`);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Oda oluşturulamadı."
      );
      setLoading(false);
    }
  }

  async function handleJoinRoom() {
    if (!nickname.trim()) {
      setMessage("Nickname gir.");
      return;
    }

    if (!roomCode.trim()) {
      setMessage("Oda kodu gir.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const room = await joinRoom(roomCode, nickname.trim());
      router.push(`/room/${room.code}`);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Odaya katılınamadı."
      );
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">⚽ FutBil</h1>

          <p className="mt-2 text-sm text-slate-300">
            Find the common football player
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300">
            {message}
          </div>
        )}

        <label className="text-sm text-slate-300">
          Nickname
        </label>

        <input
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-emerald-400"
          placeholder="Nickname..."
          value={nickname}
          onChange={(event) => {
            setNickname(event.target.value);
            setMessage("");
          }}
          autoComplete="off"
        />

        <label className="mt-5 block text-sm text-slate-300">
          Maç Formatı
        </label>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {[3, 5, 7].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setBestOf(value as BestOf)}
              className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                bestOf === value
                  ? "bg-emerald-500 text-black"
                  : "bg-black/30 text-slate-300 hover:bg-white/10"
              }`}
            >
              Best of {value}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCreateRoom}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "İşleniyor..." : "Oda Oluştur"}
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-white/10" />
          VEYA
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <label className="text-sm text-slate-300">
          Oda Kodu
        </label>

        <input
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 uppercase outline-none focus:border-blue-400"
          placeholder="Room code..."
          value={roomCode}
          onChange={(event) => {
            setRoomCode(event.target.value.toUpperCase());
            setMessage("");
          }}
          autoComplete="off"
        />

        <button
          type="button"
          onClick={handleJoinRoom}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "İşleniyor..." : "Odaya Katıl"}
        </button>
      </section>
    </main>
  );
}