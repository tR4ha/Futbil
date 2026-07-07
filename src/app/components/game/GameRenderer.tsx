import WaitingScreen from "./WaitingScreen";
import CountdownScreen from "./CountdownScreen";
import TeamPick from "./TeamPick";
import TeamReveal from "./TeamReveal";
import PlayerPick from "./PlayerPick";
import RoundResult from "./RoundResult";
import MatchResult from "./MatchResult";
type Player = {
  id: string;
  nickname: string;
  is_host: boolean;
};

type Room = {
  game_state: string;
  room_players: Player[];
  countdown: number | null;
};

type Props = {
  room: Room;
};

export default function GameRenderer({ room }: Props) {
  switch (room.game_state) {
    case "waiting":
      return <WaitingScreen players={room.room_players} />;

    case "countdown":
      return <CountdownScreen countdown={room.countdown} />;

    case "team_pick":
      return <TeamPick room={room as any} />;

    case "reveal_teams":
      return <TeamReveal room={room as any} />;

    case "answering":
      return <PlayerPick room={room as any} />;
    
    case "round_result":
      return <RoundResult room={room as any} />;

    case "match_result":
      return <MatchResult room={room as any} />;
   
      default:
      return <WaitingScreen players={room.room_players} />;
  }
}