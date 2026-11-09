"""Unit tests: the worked word cases from the addendum (target "quick") and one synthetic interruption. Run: python3 -m unittest discover -s tests"""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from rhythm_analysis import features as F

SID = "s1"


class Sim:
    """Builds events the way the app's typing engine logs them (key, word_done) so the analysis sees realistic input."""
    def __init__(self):
        self.ev, self.seq, self.t = [], 0, 1000.0
        self.ctx = dict(phase="block", block=1, condition="AUTO", intr=0)

    def add(self, type_, data, t=None, **ctx):
        c = {**self.ctx, **ctx}
        self.ev.append({"session_id": SID, "pid": "P01", "seq": self.seq, "t": t if t is not None else self.t, "type": type_, "data": data, **c})
        self.seq += 1

    def word(self, idx, target, stream, gap=300, straddled=False, start_typed=""):
        """stream: characters; 'B' = Backspace. Mirrors the engine: every printable key is appended; correctness vs target at that position."""
        typed, wrong, bs, first = start_typed, 0, 0, None
        for ch in stream:
            self.t += gap
            if first is None:
                first = self.t
            if ch == "B":
                typed = typed[:-1]; bs += 1
                self.add("key", {"key": "Backspace", "code": "Backspace", "bs": True, "bs_word": False, "w": idx, "c": len(typed)})
            else:
                exp = target[len(typed)] if len(typed) < len(target) else None
                ok = ch == exp
                wrong += 0 if ok else 1
                self.add("key", {"key": ch, "code": "Key" + ch.upper(), "expected": exp, "correct": ok, "bs": False, "w": idx, "c": len(typed)})
                typed += ch
        self.t += gap
        self.add("key", {"key": " ", "expected": " ", "correct": typed == target, "bs": False, "w": idx, "c": len(typed)})
        cc = sum(1 for i in range(min(len(typed), len(target))) if typed[i] == target[i])
        self.add("word_done", {"idx": idx, "target": target, "typed": typed, "first_key_t": first, "space_t": self.t, "correct_chars": cc,
                               "errors": max(len(typed), len(target)) - cc, "wrong_keys": wrong, "backspaces": bs,
                               "straddled_interruption": straddled, "reopened": False, "reopen_count": 0})


CASES = [   # stream, total_keys, extra_keys, bursts, error, struggle
    ("quick", 5, 0, 0, False, False),
    ("quixBck", 7, 2, 1, True, False),
    ("quixcBBck", 9, 4, 1, True, False),
    ("quixckBBBck", 11, 6, 1, True, True),
    ("quixBxBck", 9, 4, 2, True, True),
]


class WordTests(unittest.TestCase):
    def test_worked_cases(self):
        for stream, total, extra, bursts, err, strug in CASES:
            s = Sim(); s.word(0, "quick", stream)
            w = F.extract_words(s.ev)[0]
            self.assertEqual((w["total_keys"], w["extra_keys"], w["correction_bursts"], w["error_word"], w["struggle_word"]),
                             (total, extra, bursts, err, strug), stream)

    def test_post_flags(self):
        s = Sim()
        s.word(0, "quick", "quixckBBBck")          # struggle word
        for i in range(1, 5): s.word(i, "quick", "quick")
        ws = F.extract_words(s.ev)
        self.assertEqual([w["post_error_word"] for w in ws], [False, True, False, False, False])
        self.assertEqual([w["post_struggle_word"] for w in ws], [False, True, True, False, False])

    def test_error_rates(self):
        s = Sim(); s.word(0, "quick", "quixBck"); s.word(1, "quick", "quick")
        r = F.error_rates(F.extract_words(s.ev))
        self.assertEqual((r["C"], r["INF"], r["IF"], r["F"]), (10, 0, 1, 1))
        self.assertAlmostEqual(r["TER"], 1 / 11)
        self.assertAlmostEqual(r["KSPC"], 12 / 10)


class InterruptionTests(unittest.TestCase):
    def build(self, mode="DIGI"):
        s = Sim()
        s.add("session_start", {"app_version": "0.8.6", "order": "O1", "conditions": ["DIGI", "AUTO", "PHYS"], "flags": {"audio": "spotify"}}, t=0, phase="welcome", block=0, condition=None)
        for i in range(6): s.word(i, "quick", "quick")                 # pre words
        s.word(6, "quick", "qui")                                       # half typed, then the email
        T0 = s.t + 500
        s.add("interruption_start", {"n": 1, "k": 1, "email_id": "s1", "practice": False, "word_idx": 6, "typed_partial": "qui"}, t=T0, condition=mode, intr=1)
        s.add("email_shown", {"n": 1}, t=T0 + 20, condition=mode, intr=1)
        s.add("reply_sent", {"n": 1, "practice": False}, t=T0 + 6000, condition=mode, intr=1)
        s.add("resume_prompt_shown", {"mode": mode, "gap_below_box": 250, "clamped": False}, t=T0 + 6020, condition=mode, intr=1)
        s.add("wrong_input", {"kind": "keyboard", "mode": mode}, t=T0 + 6300, condition=mode, intr=1)
        s.add("resume_input", {"mode": mode, "source": "mouse_click"}, t=T0 + 7200, condition=mode, intr=1)
        s.add("typing_unlock", {"n": 1, "play_timed_out": False, "play_called_to_playing_ms": 230.0}, t=T0 + 7500, condition=mode, intr=1)
        s.t = T0 + 7500
        # continue the half-typed word after resuming: first key is a wrong letter, then fix
        s.t += 800
        for ch in "xBck":
            s.t += 300
            if ch == "B":
                s.add("key", {"key": "Backspace", "bs": True, "w": 6, "c": 4})
            else:
                s.add("key", {"key": ch, "correct": ch == "c" or ch == "k", "bs": False, "w": 6, "c": 3, "expected": "c"})
        s.t += 300
        s.add("word_done", {"idx": 6, "target": "quick", "typed": "quick", "first_key_t": T0 - 2000, "space_t": s.t, "correct_chars": 5, "errors": 0, "wrong_keys": 1,
                            "backspaces": 1, "straddled_interruption": True, "reopened": False, "reopen_count": 0})
        for i in range(7, 13): s.word(i, "quick", "quick")
        return s.ev

    def test_metrics(self):
        ev = self.build()
        rows, traj = F.extract_interruptions(ev, F.extract_words(ev))
        r = rows[0]
        self.assertEqual(r["intr"], 1)
        self.assertAlmostEqual(r["resume_action_time_ms"], 1200)
        self.assertAlmostEqual(r["unlock_delay_ms"], 1500)
        self.assertAlmostEqual(r["resumption_lag_ms"], 1500 + 800 + 300)
        self.assertAlmostEqual(r["restart_time_ms"], 1100)
        self.assertTrue(r["first_key_error"])
        self.assertEqual(r["wrong_inputs"], 1)
        self.assertEqual(r["straddled_outcome"], "continued")
        self.assertEqual((r["pre_n"], r["post_n"]), (5, 5))
        self.assertEqual(r["pre_mean_ms"], 1500)                     # 5 chars at 300 ms + the space, first key to space
        self.assertFalse(r["excluded"])
        self.assertEqual([t["rank"] for t in traj if t["phase"] == "post"], [1, 2, 3, 4, 5, 6])
        self.assertEqual([t["rank"] for t in traj if t["phase"] == "pre"], [-5, -4, -3, -2, -1])

    def test_straddled_word_never_in_window(self):
        ev = self.build()
        rows, traj = F.extract_interruptions(ev, F.extract_words(ev))
        self.assertNotIn(6, [t["idx"] for t in traj])

    def test_exclusions(self):
        ev = self.build()
        unlock_t = next(e["t"] for e in ev if e["type"] == "typing_unlock")
        ev.append({**ev[-1], "type": "blur", "data": {}, "t": unlock_t + 100, "seq": 9999})
        rows, _ = F.extract_interruptions(ev, F.extract_words(ev))
        self.assertIn("focus_lost_in_window", rows[0]["excl_reasons"])
        self.assertTrue(rows[0]["excluded"])
        sess = F.session_exclusions(ev)
        self.assertEqual(sess, [])
        ev[0]["data"]["flags"]["debug"] = True
        self.assertEqual(F.session_exclusions(ev), ["debug"])


if __name__ == "__main__":
    unittest.main()
