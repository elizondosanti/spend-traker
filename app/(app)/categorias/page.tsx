import { archiveCategoryAction, createCategoryAction, updateCategoryAction } from "@/app/actions";
import { GROUPS } from "@/lib/categories";
import { listCategories } from "@/lib/data";
import { translator } from "@/lib/i18n";
import { requireUser, uiLang } from "@/lib/session";

/* Full static strings so Tailwind picks up the arbitrary grid tracks. */
const CREATE_GRID =
  "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(9rem,1fr)_minmax(7rem,8.5rem)_5.75rem_auto] lg:items-end";
const ROW_GRID =
  "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(9rem,1fr)_minmax(7rem,8.5rem)_5.75rem_auto_auto] lg:items-center";

export default async function Categories() {
  const user = await requireUser();
  const lang = await uiLang(user);
  const tr = translator(lang);
  const categories = await listCategories(user.id);
  const nameLabel = lang === "es" ? "Nombre" : "Name";

  const groupSelect = (value: string) => (
    <select name="grp" defaultValue={value} aria-label={tr("group")} className="input min-h-11">
      {GROUPS.map((g) => (
        <option key={g} value={g}>
          {tr(g)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="page">
      <div>
        <h1 className="large-title">{tr("navCategories")}</h1>
        <p className="on-brand-muted mt-1">{tr("categoriesHelp")}</p>
      </div>

      <form action={createCategoryAction} className={`card ${CREATE_GRID}`}>
        <label className="text-sm sm:col-span-2 lg:col-span-1">
          <span className="mb-1 block font-medium">{tr("newCategory")}</span>
          <input
            name="name"
            required
            maxLength={40}
            placeholder={lang === "es" ? "ej. Gimnasio, Mascotas, Horas Fede" : "e.g. Gym, Pets, Side gig"}
            className="input min-h-11"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">{tr("group")}</span>
          {groupSelect("wants")}
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">{tr("monthlyCap")}</span>
          <input name="budget" type="number" min={0} step="any" defaultValue={0} className="input min-h-11" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">{tr("currency")}</span>
          <select name="currency" defaultValue="CRC" aria-label={tr("currency")} className="input min-h-11">
            <option>CRC</option>
            <option>USD</option>
          </select>
        </label>
        <button className="btn min-h-11 w-full sm:col-span-2 sm:justify-self-end sm:w-auto sm:min-w-28 lg:col-span-1">
          {tr("add")}
        </button>
      </form>

      {GROUPS.map((g) => (
        <section key={g} className="card">
          <h2 className="mb-3 text-lg font-semibold">{tr(g)}</h2>
          <ul className="space-y-2">
            {categories
              .filter((c) => c.grp === g)
              .map((c) => (
                <li key={c.id} className={`${ROW_GRID} border-b border-slate-100 pb-2 last:border-0 dark:border-white/10`}>
                  <form action={updateCategoryAction} className="contents">
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      name="name"
                      defaultValue={c.name}
                      required
                      maxLength={40}
                      aria-label={nameLabel}
                      className="input min-h-11 sm:col-span-2 lg:col-span-1"
                    />
                    {groupSelect(c.grp)}
                    <input
                      name="budget"
                      type="number"
                      min={0}
                      step="any"
                      defaultValue={c.budget}
                      aria-label={tr("monthlyCap")}
                      className="input min-h-11"
                    />
                    <select name="currency" defaultValue={c.currency} aria-label={tr("currency")} className="input min-h-11">
                      <option>CRC</option>
                      <option>USD</option>
                    </select>
                    <button className="btn-ghost min-h-11 w-full lg:w-auto lg:min-w-24">{tr("save")}</button>
                  </form>
                  <form action={archiveCategoryAction} className="contents">
                    <input type="hidden" name="id" value={c.id} />
                    <button className="min-h-11 justify-self-start px-2 text-sm font-medium text-bad hover:underline sm:col-span-2 lg:col-span-1">
                      {tr("archive")}
                    </button>
                  </form>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
