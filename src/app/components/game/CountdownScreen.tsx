type Props = {
  countdown: number | null;
};

export default function CountdownScreen({ countdown }: Props) {
  return (
    <div className="mt-8 text-center">
      <p className="text-sm text-slate-300">
        Oyun başlıyor...
      </p>

      <div className="mt-4 text-7xl font-bold text-emerald-400">
        {countdown === 0 ? "GO!" : countdown}
      </div>
    </div>
  );
}