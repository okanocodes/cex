import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Panel", end: true },
  { to: "/senaryolar", label: "Senaryolar" },
  { to: "/aramalar", label: "Arama Günlükleri" },
  { to: "/arama-baslat", label: "Arama Başlat" },
  { to: "/ayarlar", label: "Ayarlar" },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold">
            C
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">CEX</p>
            <p className="text-xs text-slate-400">AI Çağrı Platformu</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
