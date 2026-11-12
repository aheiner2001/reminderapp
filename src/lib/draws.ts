export interface DrawExclusion {
  aUid: string;
  bUid: string;
}

export interface GroupDraw {
  status: "setup" | "drawn" | "locked";
  celebrationDate?: string;
  budgetNote?: string;
  exclusions: DrawExclusion[];
  assignments: Record<string, string>;
  drawnAt?: string;
  drawnByUid?: string;
}

export function computeAssignments(
  memberUids: string[],
  exclusions: DrawExclusion[],
  rng: () => number = Math.random,
): Record<string, string> {
  const members = [...new Set(memberUids)];
  if (members.length < 2) {
    throw new Error("Need at least 2 members to draw names.");
  }
  const forbidden = new Set<string>();
  for (const m of members) forbidden.add(`${m}|${m}`);
  for (const ex of exclusions) {
    forbidden.add(`${ex.aUid}|${ex.bUid}`);
    forbidden.add(`${ex.bUid}|${ex.aUid}`);
  }

  const order = [...members].sort((a, b) => a.localeCompare(b));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const used = new Set<string>();
  const map: Record<string, string> = {};

  function optionsFor(g: string) {
    const opts = members.filter(
      (r) => !used.has(r) && !forbidden.has(`${g}|${r}`),
    );
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  }

  function dfs(idx: number): boolean {
    if (idx === order.length) return true;
    const g = order[idx];
    for (const r of optionsFor(g)) {
      used.add(r);
      map[g] = r;
      if (dfs(idx + 1)) return true;
      used.delete(r);
      delete map[g];
    }
    return false;
  }

  if (!dfs(0)) {
    throw new Error(
      "No valid draw with these exclusions. Try adjusting exclusions.",
    );
  }
  return map;
}
