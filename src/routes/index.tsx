import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, Cloud, Clock3, ShieldCheck, Monitor, Smartphone, Tv, Gamepad2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromoDialog } from "@/components/PromoDialog";
import { catalogQuery, coverOf } from "@/lib/catalog";
import { useActivePromo } from "@/lib/promo";
import background from "@/assets/landing/background.webp.asset.json";
import devices from "@/assets/landing/devices.webp.asset.json";
import wide from "@/assets/landing/wide.woff2.asset.json";
import compact from "@/assets/landing/compact.woff2.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "МТС Fog Play — облачный гейминг от 24 ₽/час" }, { name: "description", content: "Запускай ПК-игры в облаке на разных устройствах. Выбери игру и активируй промокод на игровые часы." }, { property: "og:title", content: "МТС Fog Play — облачный гейминг" }, { property: "og:description", content: "Игры на максимальных настройках в облаке, без подписки." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }], links: [{ rel: "preload", href: wide.url, as: "font", type: "font/woff2", crossOrigin: "anonymous" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  errorComponent: () => <main className="p-10 text-center">Не удалось загрузить игры</main>,
  component: Home,
});
function Logo() { return <Link to="/" className="fog-logo" aria-label="МТС Fog Play"><span className="fog-logo-mark">⌁</span><span>МТС<br />FOG PLAY</span><sup>β</sup></Link>; }
function Home() {
  const { data } = useSuspenseQuery(catalogQuery);
  const [promo, setPromo] = useState(false); const [menu, setMenu] = useState(false); const [cookie, setCookie] = useState(true);
  const active = useActivePromo();
  const preferred = ["God of War", "Cyberpunk 2077", "ELDEN RING", "Hogwarts Legacy", "Red Dead Redemption 2", "Forza Horizon 5"];
  const popular = preferred.flatMap((title) => data.games.filter((g) => g.title.toLowerCase() === title.toLowerCase()));
  const games = [...popular, ...data.games.filter((g) => !popular.some((p) => p.id === g.id))].slice(0, 12);
  return <main className="fog-landing" style={{ backgroundImage: `url(${background.url})` }}>
    <style>{`@font-face{font-family:FogWide;src:url('${wide.url}') format('woff2');font-weight:700;font-display:swap}@font-face{font-family:FogCompact;src:url('${compact.url}') format('woff2');font-weight:400;font-display:swap}`}</style>
    <header className="fog-header"><Logo /><nav className="hidden items-center gap-5 text-sm md:flex"><Link to="/servers">Серверы</Link><Link to="/computer">Игры</Link><a href="#faq">FAQ</a><Link to="/support">Поддержка</Link><Button asChild variant="icon" className="h-9"><Link to="/profile">Профиль</Link></Button></nav><Button variant="ghost" aria-label="Меню" className="md:hidden" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</Button></header>
    {menu && <nav className="fog-mobile-nav"><Link to="/servers">Серверы</Link><Link to="/computer">Игры</Link><a href="#faq">FAQ</a><Link to="/profile">Профиль</Link></nav>}
    <section className="fog-home-hero"><h1>Облачный гейминг<br /><span>от 24 ₽/час</span></h1><p>Запускай любые игры на максималках в облаке со старенького ноутбука и других устройств за 3 минуты. Играй в браузере или приложениях</p><div className="fog-actions"><Button asChild className="fog-gradient-button"><Link to="/computer">Выбрать игру</Link></Button><Button className="fog-secondary-button" onClick={() => setPromo(true)}>Есть промокод</Button></div>{active.data && <p className="fog-active-discount">{active.data.code} · −{active.data.discount_percent}% на часы следующей игры</p>}</section>
    <section aria-label="Популярные игры" className="fog-game-strips">{[games.slice(0,6), games.slice(6,12)].map((row, i) => <div key={i} className={`fog-game-track fog-game-track-${i}`}>{[...row, ...row].map((g,j) => <Link key={`${g.id}-${j}`} to="/computer/$slug" params={{slug:g.slug}} className="fog-game-tile" aria-label={g.title}><img src={coverOf(g)} alt={g.title} loading="lazy" /><span><Cloud size={18}/></span></Link>)}</div>)}<Button asChild variant="ghost" className="fog-more"><Link to="/computer">Показать еще <ArrowDown size={18}/></Link></Button></section>
    <section className="fog-about fog-section"><h2>У нас нет подписок<br />и абонементов</h2><p>Ты арендуешь сервер на время,<br />какое захочешь сам!</p><div className="fog-actions"><Button asChild className="fog-gradient-button"><Link to="/servers">Выбрать сервер</Link></Button></div></section>
    <section className="fog-section"><h2>Почему МТС Fog Play?</h2><div className="fog-benefits">{[{icon:Clock3,title:"Плати только за время",text:"Выбирай игру и оплачивай игровые часы без подписки."},{icon:Gamepad2,title:"Любимые игры в облаке",text:`${data.games.length} игр в каталоге — от громких новинок до любимой классики.`},{icon:ShieldCheck,title:"Выбирай свой сервер",text:"Подбери компьютер по мощности, цене и расположению."},{icon:Cloud,title:"Продолжай с сохранения",text:"Игровой прогресс сохраняется в облаке, если выбранная игра поддерживает облачные сохранения."}].map(({icon:I,title,text}) => <article key={title}><div className="fog-feature-icon"><I size={28}/></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="fog-section fog-devices"><h2>Играй в облаке<br />с разных девайсов</h2><img src={devices.url} alt="Игры на компьютере, ноутбуке, смартфоне и телевизоре" loading="lazy"/><div className="fog-device-labels">{[{icon:Monitor,title:"Браузер",text:"На компьютере и macOS"},{icon:Monitor,title:"Приложение",text:"На ПК для Windows"},{icon:Smartphone,title:"Смартфон Android",text:"На смартфоне"},{icon:Tv,title:"Телевизоры и приставки",text:"Android TV"}].map(({icon:I,title,text}) => <div key={title}><I size={25}/><h3>{title}</h3><p>{text}</p></div>)}</div><Button asChild className="fog-gradient-button mt-10"><Link to="/computer">Играть в браузере</Link></Button></section>
    <section className="fog-section fog-bottom-offer"><h2>{data.games.length} игр в каталоге</h2><p>Открой для себя новые миры и запускай любимые игры в облаке</p><div className="fog-actions"><Button asChild className="fog-gradient-button"><Link to="/computer">Играть</Link></Button><Button className="fog-secondary-button" onClick={() => setPromo(true)}>Есть промокод</Button></div></section>
    <section id="faq" className="fog-section fog-faq"><h2>Частые вопросы</h2>{[{q:"Что такое облачный гейминг?",a:"Игра запускается на удалённом игровом компьютере, а изображение передаётся на твоё устройство."},{q:"Как начать играть?",a:"Выбери игру в каталоге, количество часов и свободный компьютер. Для аренды войди в профиль и пополни баланс."},{q:"Как действует промокод?",a:"Активируй код через кнопку «Есть промокод». Скидка применяется ко всем выбранным часам следующей аренды. Каждый код можно использовать один раз."}].map(({q,a}) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
    <footer className="fog-footer"><Logo /><div><Link to="/computer">Игры</Link><Link to="/servers">Серверы</Link><Link to="/support">Поддержка</Link><Link to="/profile">Профиль</Link><span>© 2026 МТС Fog Play</span></div></footer>
    {cookie && <div className="cookie-bar"><span>Наш сайт использует cookie для улучшения работоспособности сайта.</span><Button variant="ghost" className="text-cookie-foreground" onClick={() => setCookie(false)}>Хорошо</Button></div>}
    <PromoDialog open={promo} onOpenChange={setPromo}/>
  </main>;
}
