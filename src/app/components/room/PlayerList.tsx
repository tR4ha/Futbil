type Player = {
  id: string;
  nickname: string;
  is_host: boolean;
};

type Props = {
  players: Player[];
};

export default function PlayerList({ players }: Props) {
  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Oyuncular
      </h3>

      <div className="mt-4 space-y-3">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between rounded-xl bg-black/30 px-4 py-3"
          >
            <span>🟢 {player.nickname}</span>
            <span className="text-xs text-slate-400">
              {player.is_host ? "Host" : "Joined"}
            </span>
          </div>
        ))}

        {players.length < 2 && (
          <div className="flex items-center justify-between rounded-xl bg-black/30 px-4 py-3">
            <span>⚪ Oyuncu bekleniyor...</span>
            <span className="text-xs text-slate-400">Waiting</span>
          </div>
        )}
      </div>
    </div>
  );
}