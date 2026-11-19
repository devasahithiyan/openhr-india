import { Button, PageHeader, Pill, fmtDate, statusTone } from "../components/ui";
import { useDemo } from "../lib/store";

const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });

export function AdminCompliance() {
  const { filings, markFiled } = useDemo();
  const sorted = [...filings].sort((a, b) => a.due.localeCompare(b.due));
  const groups = new Map<string, typeof filings>();
  for (const f of sorted) {
    const key = monthFmt.format(new Date(f.due + "T00:00:00"));
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }

  return (
    <>
      <PageHeader
        title="Compliance"
        sub="Statutory deposits and returns for Kaveri Textiles. Due dates follow central and state rules."
      />
      <div className="space-y-10">
        {[...groups.entries()].map(([month, items]) => (
          <section key={month}>
            <h2 className="mb-3 text-[19px] font-bold">{month}</h2>
            <ul className="divide-y divide-line rounded-xl bg-white ring-1 ring-line">
              {items.map((f) => (
                <li key={f.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[7rem_1fr_auto] sm:items-center">
                  <p className="num text-[15px] font-semibold">{fmtDate(f.due)}</p>
                  <div>
                    <p className="font-semibold">{f.name}</p>
                    <p className="text-[14px] text-muted">{f.detail}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <Pill tone={statusTone(f.status)}>{f.status}</Pill>
                    {f.status !== "Filed" && (
                      <Button variant="ghost" onClick={() => markFiled(f.id)}>
                        Mark as filed
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
