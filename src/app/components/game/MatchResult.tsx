export default function MatchResult({ room }: { room: any }) {
  const host = room.room_players?.find((p: any) => p.is_host);
  const guest = room.room_players?.find((p: any) => !p.is_host);

  const hostWon = room.host_score >= 2;
  const winner = hostWon ? host : guest;

  return (
    <div className="mt-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Maç Bitti
      </p>

      <h2 className="mt-4 text-4xl font-bold">🏆 {winner?.nickname} Kazandı</h2>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/30 px-4 py-5">
          <p className="text-xs text-slate-400">{host?.nickname || "Host"}</p>
          <p className="mt-2 text-4xl font-bold text-emerald-400">
            {room.host_score}
          </p>
        </div>

        <div className="rounded-xl bg-black/30 px-4 py-5">
          <p className="text-xs text-slate-400">{guest?.nickname || "Guest"}</p>
          <p className="mt-2 text-4xl font-bold text-blue-400">
            {room.guest_score}
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Best of 3 tamamlandı.
      </p>
    </div>
  );
}