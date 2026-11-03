import { archiveCategoryAction, createCategoryAction, updateCategoryAction } from "@/app/actions";
import { GROUPS } from "@/lib/categories";
import { listCategories } from "@/lib/data";
import { translator } from "@/lib/i18n";
import { requireUser, uiLang } from "@/lib/session";

export default async function Categories() {
  const user = await requireUser();
  const lang = await uiLang(user);
  const tr = translator(lang);
  const categories = await listCategories(user.id);

  const groupSelect = (value: string) => (
    <select name="grp" defaultValue={value} aria-label={tr("group")} className="input">
      {GROUPS.map((g) => (
        <option key={g} value={g}>
          {tr(g)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{tr("navCategories")}</h1>
        <p className="text-slate-600">{tr("categoriesHelp")}</p>
      </div>

      <form action={createCategoryAction} className="card grid gap-2 sm:grid-cols-[1fr_10rem_9rem_6rem_auto] sm:items-end">
        <label className="text-sm">
          <span className="mb-1 block font-medium">{tr("newCategory")}</span>
          <input name="name" required maxLength={40} placeholder={lang === "es" ? "ej. Gimnasio, Mascotas, Horas Fede" : "e.g. Gym, Pets, Side gig"} className="input" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">{tr("group")}</span>
          {groupSelect("wants")}
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">{tr("monthlyCap")}</span>
          <input name="budget" type="number" min={0} step="any" defaultValue={0} className="input" />
        </label>
        <label className="text-sm">
          <span className="sr-only">Moneda</span>
          <select name="currency" defaultValue="CRC" className="input">
            <option>CRC</option>
            <option>USD</option>
          </select>
        </label>
        <button className="btn">{tr("add")}</button>
      </form>

      {GROUPS.map((g) => (
        <section key={g} className="card">
          <h2 className="mb-3 text-lg font-semibold">{tr(g)}</h2>
          <ul className="space-y-2">
            {categories
              .filter((c) => c.grp === g)
              .map((c) => (
                <li key={c.id} className="flex flex-wrap items-end gap-2 border-b border-slate-100 pb-2 last:border-0">
                  <form action={updateCategoryAction} className="grid flex-1 gap-2 sm:grid-cols-[1fr_10rem_9rem_6rem_auto]">
                    <input type="hidden" name="id" value={c.id} />
                    <input name="name" defaultValue={c.name} required maxLength={40} aria-label={tr("name")} className="input" />
                    {groupSelect(c.grp)}
                    <input
                      name="budget"
                      type="number"
                      min={0}
                      step="any"
                      defaultValue={c.budget}
                      aria-label={tr("monthlyCap")}
                      className="input"
                    />
                    <select name="currency" defaultValue={c.currency} aria-label="Moneda" className="input">
                      <option>CRC</option>
                      <option>USD</option>
                    </select>
                    <button className="btn-ghost">{tr("save")}</button>
                  </form>
                  <form action={archiveCategoryAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="rounded-lg px-3 py-2 text-sm text-bad hover:bg-red-50">{tr("archive")}</button>
                  </form>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
