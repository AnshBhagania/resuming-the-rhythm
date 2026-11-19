// Which participant link comes next? Pure functions (no page access) so they can be tested on their own.
// The study has TARGET participants, P01..P18: 3 sets of the 6 orders. Participant number N always has order ((N-1) mod 6)+1
// (P01-P06 are the first set, P07-P12 the second, P13-P18 the third), so the number tells you the order and the set.
// Rule: hand out the lowest participant numbers that are still free, never two with the same order in one batch. A number is taken when
// its session has finished (not a test session), when it was completed outside the database (OFFLINE_DONE, see below), or when it is in
// progress (started in the last PENDING_HOURS hours and not finished), so two people asking for a link in a row never get the same number.
(function (root) {
  const ORDER_CODES = ["O1", "O2", "O3", "O4", "O5", "O6"];
  // Runs that finished but whose data is not in the database yet (offline JSON). Each entry stops counting by itself as soon as the
  // database has a finished session with that participant id, so importing the JSON later does not count the run twice.
  const OFFLINE_DONE = [{ pid: "P10", order: "O4" }, { pid: "P11", order: "O5" }];
  const PENDING_HOURS = 3;
  const TARGET = 18;
  const orderOfNumber = (n) => ORDER_CODES[(n - 1) % ORDER_CODES.length];

  const isTest = (s) => !!(s.is_test || (s.flags && (s.flags.debug || s.flags.dryrun || s.flags.nodb || s.flags.gazetest || s.flags.inputtest ||
    s.flags.gazeParam === "mouse" || s.flags.audio === "synthetic")));
  const pidNumber = (pid) => { const m = /^P(\d+)$/i.exec(pid || ""); return m ? parseInt(m[1], 10) : 0; };

  function planNext(sessions, opts = {}) {
    const now = opts.now ?? Date.now(), ignored = new Set(opts.ignored || []);
    const real = sessions.filter((s) => !isTest(s));
    const finished = real.filter((s) => s.finished);
    const finishedPids = new Set(finished.map((s) => s.pid));
    const offlinePids = new Set(OFFLINE_DONE.map((o) => o.pid));
    const offline = OFFLINE_DONE.filter((o) => !finishedPids.has(o.pid));

    const pendingMap = new Map();
    for (const s of real) {
      if (s.finished || finishedPids.has(s.pid) || offlinePids.has(s.pid) || ignored.has(s.pid)) continue;
      const last = s.last_event_at || s.started_at;
      if (!last || now - new Date(last).getTime() > PENDING_HOURS * 3600 * 1000) continue;
      const p = pendingMap.get(s.pid) || { pid: s.pid, order: s.order_code, last, n_events: 0, sessions: 0 };
      p.sessions++; p.n_events = Math.max(p.n_events, s.n_events || 0);
      if (new Date(last) > new Date(p.last)) { p.last = last; p.order = s.order_code; }
      pendingMap.set(s.pid, p);
    }
    const pending = [...pendingMap.values()];

    const counts = {};
    for (const o of ORDER_CODES) counts[o] = { finished: 0, offline: 0, pending: 0, total: 0 };
    for (const s of finished) if (counts[s.order_code]) counts[s.order_code].finished++;
    for (const o of offline) if (counts[o.order]) counts[o.order].offline++;
    for (const p of pending) if (counts[p.order]) counts[p.order].pending++;
    for (const o of ORDER_CODES) counts[o].total = counts[o].finished + counts[o].offline + counts[o].pending;

    // Hand out `count` links at once (default 1): the lowest free participant numbers, each with the order that number stands for,
    // skipping a number whose order is already in the batch (so three links are always three different orders).
    const taken = new Set([...finished.map((s) => pidNumber(s.pid)), ...OFFLINE_DONE.map((o) => pidNumber(o.pid)), ...pending.map((p) => pidNumber(p.pid))]);
    const nexts = [], usedOrders = new Set();
    for (let n = 1; n <= 99 && nexts.length < (opts.count ?? 1); n++) {
      if (taken.has(n) || usedOrders.has(orderOfNumber(n))) continue;
      usedOrders.add(orderOfNumber(n));
      nexts.push({ pid: "P" + String(n).padStart(2, "0"), order: orderOfNumber(n) });
    }
    const freeInTarget = []; for (let n = 1; n <= TARGET; n++) if (!taken.has(n)) freeInTarget.push("P" + String(n).padStart(2, "0"));
    // Participant ids that have more than one finished run (the same id was handed out twice).
    const perPid = {};
    for (const s of finished) perPid[s.pid] = (perPid[s.pid] || 0) + 1;
    const duplicates = Object.keys(perPid).filter((p) => perPid[p] > 1).sort();
    const runs = finished.length + offline.length;
    const distinctDone = new Set([...finished.map((s) => s.pid), ...offline.map((o) => o.pid)]).size;
    return { next: nexts[0], nexts, counts, pending, offline, duplicates, runs, distinctDone, freeInTarget, target: TARGET };
  }

  const linkFor = (site, pid, order, key) => `${site}?pid=${encodeURIComponent(pid)}&order=${order}&k=${encodeURIComponent(key)}`;
  root.RhythmPlan = { ORDER_CODES, OFFLINE_DONE, PENDING_HOURS, TARGET, orderOfNumber, planNext, isTest, linkFor };
})(typeof window !== "undefined" ? window : globalThis);
