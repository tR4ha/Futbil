import PlayerList from "../room/PlayerList";

type Props = {
  players: any[];
};

export default function WaitingScreen({ players }: Props) {
  return (
    <>
      <PlayerList players={players} />

      <p className="mt-8 text-center text-sm text-slate-400">
        İkinci oyuncu katılınca oyun başlayacak.
      </p>
    </>
  );
}