import { categorizeAction } from "@/app/actions";
import { listCategories, listPendingReviews } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { translator, type TKey } from "@/lib/i18n";
import { formatSignedMoney } from "@/lib/money";
import { movementConceptDisplay } from "@/lib/movement-view";
import { requireUser, uiLang } from "@/lib/session";

export default async function Review() {
  const user = await requireUser();
  const lang = await uiLang(user);
  const tr = translator(lang);
  const [reviews, categories] = await Promise.all([listPendingReviews(user.id), listCategories(user.id)]);
  const nameOf = (id: string | null) => categories.find((c) => c.id === id)?.name;

  return (
    <div className="page">
      <div>
        <h1 className="large-title">{tr("navReview")}</h1>
        <p className="on-brand-muted mt-1">{tr("reviewHelp")}</p>
      </div>

      {reviews.length === 0 && <p className="card text-slate-600">✓ {tr("noReviews")}</p>}

      <ul className="space-y-3">
        {reviews.map(({ id, reason, transaction: tx }) => {
          const needsConcept = reason === "sinpe_sin_concepto";
          const suggested = nameOf(tx.category_id);
          const concept = movementConceptDisplay(tx, tr);
          const place = tx.city?.trim() || "";
          return (
            <li key={id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                    {tr(`reason_${reason}` as TKey)}
                  </span>
                  <p className="mt-1 font-semibold">{tx.merchant}</p>
                  {concept && (
                    <p className={`mt-0.5 text-sm ${concept.empty ? "italic text-slate-500" : "font-medium text-ink"}`}>
                      {concept.empty ? (
                        concept.text
                      ) : (
                        <>
                          <span className="text-xs font-normal uppercase tracking-wide text-slate-500">{tr("concept")}: </span>
                          “{concept.text}”
                        </>
                      )}
                    </p>
                  )}
                  <p className="text-sm text-slate-500">
                    {formatDate(tx.occurred_at, lang, true)} · {tr(tx.kind)} · {tr(tx.direction)}
                    {place ? ` · ${place}` : ""}
                    {tx.card_last4 ? ` · ${tx.card_brand} ····${tx.card_last4}` : ""}
                  </p>
                </div>
                <p
                  className={`num shrink-0 text-right text-base font-semibold tabular-nums tracking-normal ${tx.direction === "ingreso" ? "text-ok" : "text-ink"}`}
                >
                  {formatSignedMoney(tx.amount, tx.currency, tx.direction, lang)}
                </p>
              </div>

              {!needsConcept && tx.category_id && suggested && (
                <form action={categorizeAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="transactionId" value={tx.id} />
                  <input type="hidden" name="categoryId" value={tx.category_id} />
                  <span>
                    {tr("isThisRight")} <strong>{suggested}</strong>?
                  </span>
                  <button className="btn">{tr("confirm")}</button>
                </form>
              )}

              <form action={categorizeAction} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <input type="hidden" name="transactionId" value={tx.id} />
                {needsConcept && (
                  <label className="text-sm sm:col-span-3">
                    <span className="mb-1 block font-medium">{tr("whatWasIt")}</span>
                    <input name="concept" required placeholder={tr("conceptPlaceholder")} className="input" />
                  </label>
                )}
                <label className="text-sm">
                  <span className="mb-1 block font-medium">{tr("changeTo")}</span>
                  <select name="categoryId" defaultValue={tx.category_id ?? ""} className="input">
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {tr(c.grp)} · {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">{tr("orNewCategory")}</span>
                  <input name="newCategory" maxLength={40} className="input" />
                </label>
                <button className="btn-ghost">{tr("save")}</button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
