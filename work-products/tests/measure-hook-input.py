"""Compare actual hook text with 5.2.0 using tiktoken 0.14.0 (optional QA dependency).

Run from the project environment with Node and Git available. The result measures
the plugin's text in o200k_base, independently of any provider's cache or billing.
"""

import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import zipfile

import tiktoken


ROOT = Path(__file__).resolve().parents[2]
BASELINE = "95822b37ed5f49ada8c9a05e14902530b899cdd0"


def run_hooks(tree, host, workspace, env):
    hooks = tree / host / "hooks"
    prefix = "@" if host == "Codex" else "/uxu-code:"
    policy = subprocess.check_output(
        ["node", "-p", "require(process.argv[1]).workflowPolicy", str(hooks / "mode-policy.js")],
        cwd=workspace, env=env, encoding="utf-8",
    ).rstrip("\r\n")
    cases = [
        ("session", "uxu-session-start.js", ""),
        ("review", "uxu-prompt-router.js", prefix + "review"),
        ("debug", "uxu-prompt-router.js", prefix + "debug"),
        ("stats", "uxu-prompt-router.js", prefix + "stats"),
        ("status", "uxu-prompt-router.js", prefix + "status"),
        ("subagent", "uxu-subagent-start.js", ""),
        ("ordinary", "uxu-prompt-router.js", "Please review this change."),
    ]
    results = {}
    for name, script, prompt in cases:
        output = subprocess.check_output(
            ["node", str(hooks / script)], input=json.dumps({"prompt": prompt}),
            cwd=workspace, env=env, encoding="utf-8",
        )
        if output.startswith("{"):
            output = json.loads(output)["hookSpecificOutput"]["additionalContext"]
        if name == "ordinary":
            if output:
                raise ValueError(f"{host}: ordinary prompt gained hook text")
        elif not policy or output.count(policy) != 1:
            raise ValueError(f"{host}/{name}: expected one complete workflow policy")
        results[name] = (output, output.replace(policy, "<workflow policy>"))
    return results


def main():
    scratch = Path(__file__).parent / ".tmp"
    scratch.mkdir(exist_ok=True)
    os.environ["TIKTOKEN_CACHE_DIR"] = str(scratch / "task-cost-encoding")
    encoder = tiktoken.get_encoding("o200k_base")
    members = [f"{host}/{part}" for host in ("Claude", "Codex") for part in
               ("hooks", "skills/debug/SKILL.md", "skills/stats/SKILL.md")]
    archive = subprocess.check_output(["git", "archive", "--format=zip", BASELINE, *members], cwd=ROOT)
    rows = []
    with tempfile.TemporaryDirectory(dir=scratch) as temporary:
        workspace = Path(temporary)
        before = workspace / "baseline"
        with zipfile.ZipFile(io.BytesIO(archive)) as bundle:
            bundle.extractall(before)
        env = {**os.environ, "APPDATA": temporary, "HOME": temporary, "USERPROFILE": temporary}
        for host in ("Claude", "Codex"):
            old = run_hooks(before, host, workspace, env)
            new = run_hooks(ROOT, host, workspace, env)
            for case, (text, normalized) in old.items():
                current, normalized_current = new[case]
                if normalized != normalized_current:
                    raise ValueError(f"{host}/{case}: output outside the workflow policy changed")
                row = {"host": host, "case": case, "before": len(encoder.encode_ordinary(text)),
                       "after": len(encoder.encode_ordinary(current))}
                if case in ("debug", "stats"):
                    skill = Path(host) / "skills" / case / "SKILL.md"
                    for label, tree in (("before", before), ("after", ROOT)):
                        body = (tree / skill).read_text(encoding="utf-8")
                        row[label + "WithSkill"] = row[label] + len(encoder.encode_ordinary(body))
                rows.append(row)
    print(json.dumps({"baseline": BASELINE, "encoding": encoder.name, "mode": "standard", "rows": rows}, indent=2))
    for row in rows:
        if row.get("afterWithSkill", row["after"]) > row.get("beforeWithSkill", row["before"]):
            raise SystemExit(f'Input grew for {row["host"]}/{row["case"]}')


if __name__ == "__main__":
    main()
