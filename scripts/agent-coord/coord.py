#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""coord.py — Cross-agent coordination CLI for shared git workspaces.

This repo can be worked on simultaneously by several AI agents on the same
machine (e.g. Antigravity IDE agent + Hermes + Codex/OpenCode). This script
coordinates them:

  * task locks    — one writer at a time per J working tree
  * audit log     — append-only record of claims / releases / pushes
  * guarded push  — fetch + pull --rebase + push, with retries; refuses while
                    another agent holds an active lock (unless --override)

State lives OUTSIDE the repo (machine-local):
    %USERPROFILE%\\.agent-coordination\\        (override with $COORD_HOME)
        locks\\<key>.json     one lock per repo working tree
        log.jsonl             audit trail

Usage (run from the repo root):
    python scripts/agent-coord/coord.py whoami
    python scripts/agent-coord/coord.py status [--all]
    python scripts/agent-coord/coord.py claim  --task "..." [--agent NAME] [--scope "..."] [--ttl 90] [--reclaim]
    python scripts/agent-coord/coord.py heartbeat [--agent NAME] [--ttl N]
    python scripts/agent-coord/coord.py release [--agent NAME] [--note "..."] [--commit HASH] [--force]
    python scripts/agent-coord/coord.py guard  [--agent NAME] [--push] [--branch main] [--override "reason"]
    python scripts/agent-coord/coord.py hook-check
    python scripts/agent-coord/coord.py install-hooks [--force]
    python scripts/agent-coord/coord.py log [-n 20]

Exit codes: 0 ok | 2 usage/refused-install | 3 lock held by another agent |
            4 guard refused | 5 git error
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import socket
import subprocess
import sys
import time
import types
from datetime import datetime, timezone
from pathlib import Path

TTL_DEFAULT_MIN = 90
PUSH_ATTEMPTS = 3
FETCH_TIMEOUT = 120
PUSH_TIMEOUT = 300

HOOK_MARK = "# cross-agent coordination guard (installed by scripts/agent-coord/coord.py)"


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #

def _epoch() -> float:
    return time.time()


def _iso(ts) -> str:
    if not ts:
        return ""
    return datetime.fromtimestamp(float(ts), tz=timezone.utc).astimezone().replace(microsecond=0).isoformat()


def coord_home() -> Path:
    env = os.environ.get("COORD_HOME")
    return Path(env) if env else Path.home() / ".agent-coordination"


def ensure_home() -> Path:
    h = coord_home()
    (h / "locks").mkdir(parents=True, exist_ok=True)
    return h


def run_git(repo: Path, args, check=False, timeout=None):
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GIT_EDITOR"] = "true"
    env["GIT_SEQUENCE_EDITOR"] = "true"
    env["GIT_PAGER"] = "cat"
    try:
        p = subprocess.run(["git", "-C", str(repo), *args],
                           stdin=subprocess.DEVNULL,
                           capture_output=True, text=True, env=env, timeout=timeout)
    except subprocess.TimeoutExpired:
        return types.SimpleNamespace(returncode=-1, stdout="",
                                     stderr=f"git {' '.join(args)} timed out after {timeout}s")
    if check and p.returncode != 0:
        sys.stderr.write((p.stdout or "") + "\n" + (p.stderr or "") + "\n")
        sys.exit(5)
    return p


def toplevel(repo: str) -> Path:
    p = run_git(Path(repo), ["rev-parse", "--show-toplevel"])
    if p.returncode != 0:
        sys.stderr.write(f"not a git repository: {repo}\n")
        sys.exit(5)
    return Path(p.stdout.strip())


def lock_file(root: Path) -> Path:
    key = hashlib.sha1(os.path.normcase(str(root)).encode("utf-8")).hexdigest()[:16]
    return ensure_home() / "locks" / f"{key}.json"


def read_lock(root: Path):
    f = lock_file(root)
    if not f.exists():
        return None
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        return None


def write_lock(root: Path, data: dict) -> None:
    f = lock_file(root)
    tmp = f.with_name(f.name + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, f)


def clear_lock(root: Path) -> None:
    try:
        lock_file(root).unlink()
    except FileNotFoundError:
        pass


def log_event(**kw) -> None:
    ev = {"ts": _epoch(), "when": _iso(_epoch()), **kw}
    with open(ensure_home() / "log.jsonl", "a", encoding="utf-8") as fh:
        fh.write(json.dumps(ev, ensure_ascii=False) + "\n")


def tail_log(n: int):
    f = coord_home() / "log.jsonl"
    if not f.exists():
        return []
    out = []
    for line in f.read_text(encoding="utf-8", errors="replace").splitlines()[-n:]:
        try:
            out.append(json.loads(line))
        except Exception:
            pass
    return out


def default_agent() -> str:
    return (os.environ.get("COORD_AGENT")
            or f"{os.environ.get('USERNAME') or os.environ.get('USER') or 'user'}@{socket.gethostname()}")


def is_active(lock) -> bool:
    if not lock:
        return False
    ttl = int(lock.get("ttl_min") or TTL_DEFAULT_MIN)
    hb = float(lock.get("heartbeat") or lock.get("started") or 0)
    return (_epoch() - hb) < ttl * 60


def fmt_lock(lk: dict) -> str:
    state = "ACTIVE" if is_active(lk) else "STALE (reclaimable)"
    age_min = (_epoch() - float(lk.get("heartbeat") or lk.get("started") or 0)) / 60.0
    s = (f"lock: {state} — owner={lk.get('agent')} task={lk.get('task')!r}\n"
         f"      started={_iso(lk.get('started'))} heartbeat={_iso(lk.get('heartbeat'))} "
         f"age={age_min:.1f} min ttl={lk.get('ttl_min')} min")
    if lk.get("scope"):
        s += f"\n      scope: {lk.get('scope')}"
    return s


# --------------------------------------------------------------------------- #
# commands
# --------------------------------------------------------------------------- #

def cmd_whoami(args):
    print(default_agent())
    return 0


def cmd_status(args):
    root = toplevel(args.repo)
    print(f"repo: {root}")
    lk = read_lock(root)
    print(fmt_lock(lk) if lk else "lock: none (free)")
    p = run_git(root, ["rev-list", "--left-right", "--count", "HEAD...origin/main"])
    if p.returncode == 0 and p.stdout.strip():
        parts = p.stdout.split()
        if len(parts) == 2:
            print(f"drift vs origin/main (cached): ahead {parts[0]}, behind {parts[1]}")
    recent = tail_log(8)
    if recent:
        print("recent activity:")
        for e in recent:
            extra = e.get("task") or e.get("note") or ""
            line = f"  - {e.get('when')} | {e.get('agent')} | {e.get('event')}"
            if extra:
                line += f" | {extra}"
            if e.get("commit"):
                line += f" | commit={e.get('commit')}"
            print(line)
    if getattr(args, "all", False):
        d = coord_home() / "locks"
        print("all locks:")
        if d.exists():
            for f in sorted(d.glob("*.json")):
                try:
                    data = json.loads(f.read_text(encoding="utf-8"))
                except Exception:
                    continue
                state = "ACTIVE" if is_active(data) else "stale"
                print(f"  - [{state}] {data.get('repo')} | {data.get('agent')} | {data.get('task')!r}")
        else:
            print("  (none)")
    return 0


def cmd_claim(args):
    root = toplevel(args.repo)
    agent = args.agent or default_agent()
    lk = read_lock(root)
    now = _epoch()
    if lk and is_active(lk) and lk.get("agent") != agent and not args.reclaim:
        print(f"REFUSED: repo lock is held by '{lk.get('agent')}' "
              f"(task: {lk.get('task')!r}, since {_iso(lk.get('started'))}, "
              f"heartbeat {_iso(lk.get('heartbeat'))}).")
        print("Coordinate first (wait / ask the user). Use --reclaim only if you are sure the owner is gone.")
        log_event(agent=agent, event="claim-refused", repo=str(root),
                  task=args.task, held_by=lk.get("agent"))
        return 3
    reclaimed = bool(lk and (not is_active(lk) or lk.get("agent") != agent))
    data = {
        "agent": agent,
        "task": args.task,
        "scope": args.scope or "",
        "repo": str(root),
        "started": lk.get("started", now) if (lk and lk.get("agent") == agent and lk.get("task") == args.task) else now,
        "heartbeat": now,
        "ttl_min": int(args.ttl),
        "host": socket.gethostname(),
        "pid": os.getpid(),
    }
    write_lock(root, data)
    log_event(agent=agent, event="reclaim" if reclaimed else "claim",
              repo=str(root), task=args.task, scope=data["scope"])
    print(f"LOCK ACQUIRED by {agent}: {args.task!r} (ttl {args.ttl} min). Release when done.")
    return 0


def cmd_heartbeat(args):
    root = toplevel(args.repo)
    agent = args.agent or default_agent()
    lk = read_lock(root)
    if not lk:
        print("no lock to heartbeat")
        return 0
    if lk.get("agent") != agent and not args.force:
        print(f"REFUSED: lock owned by {lk.get('agent')}")
        return 3
    lk["heartbeat"] = _epoch()
    if args.ttl:
        lk["ttl_min"] = int(args.ttl)
    write_lock(root, lk)
    print("heartbeat refreshed")
    return 0


def cmd_release(args):
    root = toplevel(args.repo)
    agent = args.agent or default_agent()
    lk = read_lock(root)
    if not lk:
        print("nothing to release (no lock)")
        return 0
    if lk.get("agent") != agent and not args.force:
        print(f"REFUSED: lock owned by {lk.get('agent')} (use --force only after coordinating)")
        return 3
    clear_lock(root)
    log_event(agent=agent, event="release", repo=str(root),
              task=lk.get("task"), note=args.note, commit=args.commit)
    print(f"LOCK RELEASED by {agent} (task: {lk.get('task')!r})")
    return 0


def cmd_guard(args):
    root = toplevel(args.repo)
    agent = args.agent or default_agent()
    branch = args.branch
    os.environ["COORD_AGENT"] = agent  # let git hooks resolve the same identity (pre-push hook-check)
    lk = read_lock(root)
    if lk and is_active(lk) and lk.get("agent") != agent:
        if not args.override:
            print(f"GUARD REFUSED: '{lk.get('agent')}' holds an active lock "
                  f"(task: {lk.get('task')!r}). Coordinate or wait.")
            print('Override consciously with: --override "<documented reason>" (logged loudly).')
            log_event(agent=agent, event="guard-refused", repo=str(root), held_by=lk.get("agent"))
            return 4
        log_event(agent=agent, event="guard-override", repo=str(root),
                  reason=args.override, held_by=lk.get("agent"))
        print(f"WARNING: overriding active lock of '{lk.get('agent')}' — reason logged: {args.override}")

    # refresh own lock heartbeat so long tasks don't go stale
    if lk and lk.get("agent") == agent:
        lk["heartbeat"] = _epoch()
        write_lock(root, lk)

    url = (run_git(root, ["remote", "get-url", "origin"]).stdout or "").strip()
    if url and "maxperformance14" not in url:
        print(f"WARNING: origin = {url} (expected .../shroukmagdi74-source/maxperformance14)")

    attempts = max(1, int(getattr(args, "attempts", PUSH_ATTEMPTS)))
    for attempt in range(1, attempts + 1):
        p = run_git(root, ["fetch", "origin", branch], timeout=FETCH_TIMEOUT)
        if p.returncode != 0:
            err = ((p.stderr or "") + (p.stdout or "")).strip()
            print(f"fetch failed (attempt {attempt}/{attempts}):")
            print(err[-800:])
            if attempt < attempts:
                time.sleep(3)
                continue
            return 5
        behind = int((run_git(root, ["rev-list", "--count", f"HEAD..origin/{branch}"]).stdout or "0").strip() or 0)
        if behind > 0:
            print(f"remote moved: {behind} commit(s) behind origin/{branch} — running pull --rebase ...")
            pr = run_git(root, ["pull", "--rebase", "--autostash", "origin", branch], timeout=PUSH_TIMEOUT)
            if pr.returncode != 0:
                out = ((pr.stdout or "") + (pr.stderr or "")).strip()
                networkish = any(s in out for s in ("Connection was reset", "Could not resolve", "Recv failure", "timed out", "unable to access"))
                print(f"pull --rebase failed ({'network hiccup — retrying' if networkish and attempt < attempts else 'resolve conflicts, commit/stash, then retry'}):")
                print(out[-1500:])
                if networkish and attempt < attempts:
                    time.sleep(3)
                    continue
                return 5
        ahead = int((run_git(root, ["rev-list", "--count", f"origin/{branch}..HEAD"]).stdout or "0").strip() or 0)
        if ahead == 0:
            print("GUARD OK: nothing to push (HEAD is in sync with origin).")
            return 0
        if not args.push:
            print(f"GUARD OK: {ahead} commit(s) ready, remote in sync. Push with: "
                  f"git push origin HEAD:{branch}  (or re-run guard with --push)")
            return 0
        print(f"pushing {ahead} commit(s) to origin/{branch} (attempt {attempt}/{attempts}) ...")
        push_args = ["push", "origin", f"HEAD:{branch}"]
        if args.override:
            push_args.append("--no-verify")  # override was consciously logged above
        pp = run_git(root, push_args, timeout=PUSH_TIMEOUT)
        if pp.returncode == 0:
            head = (run_git(root, ["rev-parse", "--short", "HEAD"]).stdout or "").strip()
            log_event(agent=agent, event="push", repo=str(root), branch=branch, commit=head,
                      task=(lk or {}).get("task") if (lk and lk.get("agent") == agent) else None)
            print(f"PUSH OK: origin/{branch} is now at {head}.")
            return 0
        print("push rejected (remote moved again) — refetching and retrying after rebase ...")
        print(((pp.stderr or "") + (pp.stdout or "")).strip()[-600:])
    print("GUARD FAILED: could not push cleanly after retries. Force push is FORBIDDEN — coordinate and retry.")
    return 5


def cmd_hook_check(args):
    root = toplevel(args.repo)
    agent = os.environ.get("COORD_AGENT") or default_agent()
    lk = read_lock(root)
    if lk and is_active(lk) and lk.get("agent") != agent:
        sys.stderr.write(
            f"[coord] BLOCKED: '{lk.get('agent')}' holds an active lock on this repo "
            f"(task: {lk.get('task')!r}). Another agent is working — coordinate first.\n"
            f"[coord] Status:  python scripts/agent-coord/coord.py status\n")
        return 1
    return 0


def cmd_install_hooks(args):
    root = toplevel(args.repo)
    hooks = root / ".git" / "hooks"
    hooks.mkdir(parents=True, exist_ok=True)
    target = hooks / "pre-push"
    if target.exists():
        try:
            existing = target.read_text(encoding="utf-8", errors="replace")
        except Exception:
            existing = ""
        if HOOK_MARK not in existing and not args.force:
            print(f"pre-push hook already exists and is not ours: {target}")
            print("Re-run with --force to overwrite, or merge manually.")
            return 2
    script = (
        "#!/bin/sh\n"
        f"{HOOK_MARK}\n"
        'root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0\n'
        'for c in python python3 py; do\n'
        '  if command -v "$c" >/dev/null 2>&1; then\n'
        '    exec "$c" "$root/scripts/agent-coord/coord.py" hook-check\n'
        '  fi\n'
        'done\n'
        'exit 0\n'
    )
    target.write_text(script, encoding="utf-8", newline="\n")
    try:
        os.chmod(target, 0o755)
    except OSError:
        pass
    print(f"installed: {target}")
    return 0


def cmd_log(args):
    for e in tail_log(int(args.n)):
        line = f"{e.get('when','')} | {e.get('agent','')} | {e.get('event','')}"
        for k in ("task", "note", "commit", "branch", "held_by", "reason", "scope"):
            if e.get(k):
                line += f" | {k}={e[k]}"
        print(line)
    return 0


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #

def main():
    p = argparse.ArgumentParser(prog="coord",
                                description="Cross-agent coordination for shared git workspaces "
                                            "(locks + audit log + guarded push)")
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--repo", default=".", help="path inside the target repository (default: cwd)")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("whoami", parents=[common], help="resolved agent name")
    sp.set_defaults(fn=cmd_whoami)

    sp = sub.add_parser("status", parents=[common], help="lock + drift + recent activity")
    sp.add_argument("--all", action="store_true", help="also list locks of all repos")
    sp.set_defaults(fn=cmd_status)

    sp = sub.add_parser("claim", parents=[common], help="take the repo lock")
    sp.add_argument("--task", required=True)
    sp.add_argument("--agent")
    sp.add_argument("--scope", default="")
    sp.add_argument("--ttl", type=int, default=TTL_DEFAULT_MIN)
    sp.add_argument("--reclaim", action="store_true", help="take over a lock (logs a reclaim)")
    sp.set_defaults(fn=cmd_claim)

    sp = sub.add_parser("heartbeat", parents=[common], help="refresh lock timestamp")
    sp.add_argument("--agent")
    sp.add_argument("--ttl", type=int)
    sp.add_argument("--force", action="store_true")
    sp.set_defaults(fn=cmd_heartbeat)

    sp = sub.add_parser("release", parents=[common], help="drop the lock, log completion")
    sp.add_argument("--agent")
    sp.add_argument("--note", default="")
    sp.add_argument("--commit", default="")
    sp.add_argument("--force", action="store_true")
    sp.set_defaults(fn=cmd_release)

    sp = sub.add_parser("guard", parents=[common], help="pre-push gate: fetch + pull --rebase (+ push)")
    sp.add_argument("--agent")
    sp.add_argument("--push", action="store_true", help="actually push after the checks")
    sp.add_argument("--branch", default="main")
    sp.add_argument("--override", default="", help='bypass an active lock of another agent (logged)')
    sp.add_argument("--attempts", type=int, default=PUSH_ATTEMPTS)
    sp.set_defaults(fn=cmd_guard)

    sp = sub.add_parser("hook-check", parents=[common], help="pre-push hook body")
    sp.set_defaults(fn=cmd_hook_check)

    sp = sub.add_parser("install-hooks", parents=[common], help="install .git/hooks/pre-push")
    sp.add_argument("--force", action="store_true")
    sp.set_defaults(fn=cmd_install_hooks)

    sp = sub.add_parser("log", parents=[common], help="tail the audit log")
    sp.add_argument("-n", type=int, default=20)
    sp.set_defaults(fn=cmd_log)

    args = p.parse_args()
    sys.exit(args.fn(args))


if __name__ == "__main__":
    main()
