type Player = {
  id: string;
  nickname: string;
  is_host: boolean;
};

type Props = {
  players: Player[];
  hostScore: number;
  guestScore: number;
};

export default function ScoreBoard({
  players,
  hostScore,
  guestScore,
}: Props) {
  const host = players.find((player) => player.is_host);
  const guest = players.find((player) => !player.is_host);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-center">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Host
        </p>

        <p className="mt-1 truncate text-base font-semibold text-white">
          {host?.nickname || "Bekleniyor"}
        </p>

        <p className="mt-2 text-4xl font-bold text-emerald-400">
          {hostScore}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-center">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Guest
        </p>

        <p className="mt-1 truncate text-base font-semibold text-white">
          {guest?.nickname || "Bekleniyor"}
        </p>

        <p className="mt-2 text-4xl font-bold text-blue-400">
          {guestScore}
        </p>
      </div>
    </div>
  );
}