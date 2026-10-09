"""Build gh-pages from committed main and company-cases without switching checkouts.

Run from repository root: python scripts/prepare-pages.py
Then publish: git push origin gh-pages
"""
import subprocess

STATIC = {"index.html", "slides.js", "app.js", "field.js", "fonts.css", "styles.css", "assets", ".nojekyll"}


def git(*args, data=None):
    return subprocess.run(["git", *args], input=data, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, check=True).stdout


def entries(ref):
    result = {}
    for entry in git("ls-tree", "-z", ref).split(b"\0"):
        if entry:
            metadata, name = entry.split(b"\t", 1)
            if name.decode() in STATIC:
                result[name] = metadata
    missing = STATIC - {name.decode() for name in result}
    if missing:
        raise SystemExit(f"Missing static files in {ref}: {sorted(missing)}")
    return result


def tree(items):
    payload = b"".join(metadata + b"\t" + name + b"\0"
                       for name, metadata in sorted(items.items()))
    return git("mktree", "-z", data=payload).strip().decode()


if git("status", "--porcelain").strip():
    raise SystemExit("Commit changes before preparing the published site.")
company = git("rev-parse", "company-cases").strip().decode()
lecture = git("rev-parse", "origin/main").strip().decode()
company_tree = tree(entries(company))
site = entries(lecture)
site[b"company"] = b"040000 tree " + company_tree.encode()
site_tree = tree(site)
previous = subprocess.run(["git", "rev-parse", "--verify", "refs/heads/gh-pages"],
                          capture_output=True)
parents = ["-p", previous.stdout.strip().decode()] if previous.returncode == 0 else []
message = (f"Publish lecture and company cases\n\n"
           f"Lecture: {lecture}\nCompany: {company}\n")
commit = git("-c", "user.name=Yaroslav Uvarovsky",
             "-c", "user.email=oscurosssgroup@gmail.com",
             "commit-tree", site_tree, *parents, data=message.encode()).strip().decode()
git("update-ref", "refs/heads/gh-pages", commit)
print(f"Prepared gh-pages: {commit}")
print(f"Lecture at / from {lecture}; company version at /company/ from {company}")
