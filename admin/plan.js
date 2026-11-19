// Which participant link comes next? Pure functions (no page access) so they can be tested on their own.
// Rule: always hand out the order with the fewest runs; ties go to the lowest order number. A run counts when its session has
// finished (not a test session), when it was completed outside the database (OFFLINE_DONE, see below), or when it is in progress
// (started in the last PENDING_HOURS hours and not finished), so two people asking for a link in a row never get the same order.
(function (root) {
  const ORDER_CODES = ["O1", "O2", "O3", "O4", "O5", "O6"];
  // Runs that finished but whose data is not in the database yet (offline JSON). Each entry stops counting by itself as soon as the
  // database has a finished session with that participant id, so importing the JSON later does not count the run twice.
  const OFFLINE_DONE = [{ pid: "P10", order: "O4" }, { pid: "P11", order: "O5" }];
  const PENDING_HOURS = 3;

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

    // Hand out `count` links at once (default 3). Each gets the next free participant number and a different order:
    // the order with the fewest runs first, ties to the lowest order number, and no order twice in the same batch.
    const maxPid = Math.max(0, ...sessions.map((s) => pidNumber(s.pid)), ...OFFLINE_DONE.map((o) => pidNumber(o.pid)));
    const nexts = [], used = new Set();
    for (let i = 0; i < Math.min(opts.count ?? 1, ORDER_CODES.length); i++) {
      let order = null;
      for (const o of ORDER_CODES) if (!used.has(o) && (order === null || counts[o].total < counts[order].total)) order = o;
      used.add(order);
      nexts.push({ pid: "P" + String(maxPid + 1 + i).padStart(2, "0"), order });
    }
    // Participant ids that have more than one finished run (the same id was handed out twice).
    const perPid = {};
    for (const s of finished) perPid[s.pid] = (perPid[s.pid] || 0) + 1;
    const duplicates = Object.keys(perPid).filter((p) => perPid[p] > 1).sort();
    const runs = finished.length + offline.length;
    const distinctDone = new Set([...finished.map((s) => s.pid), ...offline.map((o) => o.pid)]).size;
    return { next: nexts[0], nexts, counts, pending, offline, duplicates, runs, distinctDone };
  }

  const linkFor = (site, pid, order, key) => `${site}?pid=${encodeURIComponent(pid)}&order=${order}&k=${encodeURIComponent(key)}`;
  root.RhythmPlan = { ORDER_CODES, OFFLINE_DONE, PENDING_HOURS, planNext, isTest, linkFor };
})(typeof window !== "undefined" ? window : globalThis);
