type Player = {
  id: string;
  nickname: string;
  is_host: boolean;
};

export default function ScoreBoard({ players }: { players: Player[] }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      {players.map((player) => (
        <div
          key={player.id}
          className="rounded-xl bg-black/30 px-4 py-3 text-center"
        >
          <p className="text-xs text-slate-400">
            {player.is_host ? "Host" : "Guest"}
          </p>
          <p className="font-semibold">{player.nickname}</p>
        </div>
      ))}
    </div>
  );
}