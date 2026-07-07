export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import RoomClient from "@/app/components/room/RoomClient";

type Props = {
  params: Promise<{
    code: string;
  }>;
};

export default async function RoomPage({ params }: Props) {
  const { code } = await params;

  const { data: room, error } = await supabase
    .from("rooms")
    .select(`
      *,
      room_players (*)
    `)
    .eq("code", code)
    .single();

  if (error || !room) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <section className="rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl backdrop-blur">
          <h1 className="text-3xl font-bold">Oda bulunamadı</h1>
        </section>
      </main>
    );
  }

  return <RoomClient initialRoom={room} />;
}