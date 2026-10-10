import { Cpu, Flame, MapPin, MemoryStick, Monitor, Wifi } from "lucide-react";
import { RentButton, type Prepaid } from "./RentButton";
import { formatPlaytime, useBalance } from "@/lib/playtime";

type Computer = { id: string; name: string; cpu: string; gpu: string; ram_gb: number; city: string; price: number; available: boolean };

function stats(id: string, price: number) {
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const speed = 100 + (h % 10) * 100;
  return { speed, bars: Math.min(5, Math.max(1, Math.round(speed / 200))), hot: h % 3 === 0 || price <= 20 };
}

export function ComputerList({ computers, prepaid }: { computers: Computer[]; prepaid?: Prepaid }) {
  const balance = useBalance();
  if (!computers.length) return null;
  const free = computers.filter((c) => c.available).length;
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-2"><h2 className="text-2xl font-bold">Доступные компьютеры</h2><p className="text-sm text-muted-foreground">Свободно {free} из {computers.length}</p></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {computers.map((c) => (
          <article key={c.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-semibold"><Monitor size={18} className="text-brand-blue" />{c.name}</h3>{stats(c.id, c.price).hot && <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive"><Flame size={12} />Высокий спрос</span>}<span className={c.available ? "rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary" : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"}>{c.available ? "Свободен" : "Занят"}</span></div>
            <ul className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Monitor size={14} />{c.gpu}</li>
              <li className="flex items-center gap-2"><Cpu size={14} />{c.cpu}</li>
              <li className="flex items-center gap-2"><MemoryStick size={14} />{c.ram_gb} ГБ</li>
              <li className="flex items-center gap-2"><MapPin size={14} />{c.city}</li>
              <li className="flex items-center gap-2"><Wifi size={14} />{stats(c.id, c.price).speed} Мбит/с<span className="ml-1 flex items-end gap-0.5" aria-label={`Качество ${stats(c.id, c.price).bars} из 5`}>{[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= stats(c.id, c.price).bars ? "w-1 rounded-sm bg-primary" : "w-1 rounded-sm bg-muted"} style={{ height: 3 + i * 2 }} />)}</span></li>
            </ul>
            {!prepaid && <><p className="mt-3 text-lg font-semibold">{c.price} ₽/час</p>
            {formatPlaytime(balance, c.price) && <p className="text-xs text-primary">{formatPlaytime(balance, c.price)}</p>}</>}
            <RentButton id={c.id} name={c.name} disabled={!c.available} prepaid={prepaid} />
          </article>
        ))}
      </div>
    </section>
  );
}
