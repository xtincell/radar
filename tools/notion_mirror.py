#!/usr/bin/env python3
"""
Backup Notion du radar Matanga — miroir Supabase → Notion.

Crée (ou réutilise) deux bases Notion propres, clé = ndeg / nom :
  • « BRIEFS — Radar (miroir) »   ← table public.briefs
  • « WIKI CLIENTS — Radar (miroir) » ← table public.clients

Notion = SAUVEGARDE (la source de vérité reste le radar/Supabase). Idempotent :
relancer met à jour les pages existantes (upsert par code) au lieu de dupliquer.

⚠️ Pourquoi ce script et pas l'agent ? L'export en masse de données vers un service
externe (Notion) est bloqué par le garde-fou anti-exfiltration de l'environnement
d'exécution de l'agent. On le lance donc depuis un poste de confiance.

Usage :
    export NOTION_TOKEN=ntn_xxx                # jeton d'intégration Notion (Hermes)
    # (optionnel) export NOTION_PARENT_PAGE_ID=<id d'une page parente>
    python3 tools/notion_mirror.py            # miroir briefs + clients
    python3 tools/notion_mirror.py briefs     # seulement les briefs
    python3 tools/notion_mirror.py clients    # seulement le wiki clients

Le jeton n'est JAMAIS écrit dans le repo : il vient de l'environnement.
"""
import json, os, re, sys, time, urllib.request, urllib.error

NV = "2022-06-28"
SUPA_URL = os.environ.get("SUPA_URL", "https://fftfrfvllpukesgfgkms.supabase.co")
SUPA_KEY = os.environ.get("SUPA_KEY", "sb_publishable_gTHTHuy8gnVFzLp7bFZk0Q_oJBqUt8I")  # publishable (public)
TOKEN = os.environ.get("NOTION_TOKEN", "").strip()
PARENT = os.environ.get("NOTION_PARENT_PAGE_ID", "").strip()
ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")

if not TOKEN:
    sys.exit("NOTION_TOKEN manquant (export NOTION_TOKEN=ntn_...).")


def napi(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", "Bearer " + TOKEN)
    req.add_header("Notion-Version", NV)
    req.add_header("Content-Type", "application/json")
    for _ in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(2); continue
            raise SystemExit("Notion %s: %s" % (e.code, e.read().decode()[:300]))
    raise SystemExit("Notion: trop de 429")


def supa(path):
    req = urllib.request.Request(SUPA_URL + "/rest/v1/" + path)
    req.add_header("apikey", SUPA_KEY)
    req.add_header("Authorization", "Bearer " + SUPA_KEY)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def parent_page():
    if PARENT:
        return PARENT
    p = napi("POST", "https://api.notion.com/v1/pages", {
        "parent": {"type": "workspace", "workspace": True},
        "properties": {"title": [{"text": {"content": "📡 Radar Matanga — Miroir (backup)"}}]}})
    print("page parente:", p["id"])
    return p["id"]


def rt(s):
    s = "" if s is None else str(s)
    return [{"text": {"content": s[:1990]}}] if s else []
def sel(s):
    s = (s or "").strip()
    return {"name": s[:90]} if s else None
def dt(s):
    s = (s or "").strip()
    return {"start": s[:10]} if ISO.match(s) else None


def find_or_create_db(parent, title, props, key_prop):
    """Retrouve une base déjà créée par titre sous le parent, sinon la crée."""
    res = napi("POST", "https://api.notion.com/v1/search",
               {"query": title, "filter": {"value": "database", "property": "object"}})
    for d in res.get("results", []):
        t = "".join(x.get("plain_text", "") for x in d.get("title", []))
        if t == title:
            return d["id"]
    db = napi("POST", "https://api.notion.com/v1/databases", {
        "parent": {"type": "page_id", "page_id": parent},
        "title": [{"text": {"content": title}}], "properties": props})
    print("base créée:", title, db.get("url", ""))
    return db["id"]


def index_by_key(db_id, key_prop):
    """Map code → page_id pour upsert idempotent."""
    out, cur = {}, None
    while True:
        body = {"page_size": 100}
        if cur:
            body["start_cursor"] = cur
        r = napi("POST", "https://api.notion.com/v1/databases/%s/query" % db_id, body)
        for pg in r["results"]:
            tp = pg["properties"].get(key_prop, {}).get("title", [])
            code = "".join(x.get("plain_text", "") for x in tp)
            if code:
                out[code] = pg["id"]
        if not r.get("has_more"):
            break
        cur = r["next_cursor"]
    return out


def upsert(db_id, existing, code, props):
    if code in existing:
        napi("PATCH", "https://api.notion.com/v1/pages/%s" % existing[code], {"properties": props})
    else:
        napi("POST", "https://api.notion.com/v1/pages",
             {"parent": {"database_id": db_id}, "properties": props})


def mirror_briefs(parent):
    props = {
        "Code": {"title": {}}, "Projet": {"rich_text": {}}, "Client": {"rich_text": {}},
        "Marque": {"rich_text": {}}, "Statut": {"select": {}}, "Entrée": {"select": {}},
        "Niveau": {"rich_text": {}}, "Type": {"rich_text": {}}, "Priorité": {"select": {}},
        "Deadline": {"date": {}}, "Date réception": {"date": {}}, "Responsable": {"rich_text": {}},
        "Parent": {"rich_text": {}}, "Statut brief": {"select": {}}, "Livrables": {"rich_text": {}},
        "Commentaire": {"rich_text": {}},
    }
    db = find_or_create_db(parent, "BRIEFS — Radar (miroir)", props, "Code")
    existing = index_by_key(db, "Code")
    rows = supa("briefs?select=ndeg,projet,client,marque,statut,entree,niveau,type,prio,deadline,date_reception,responsable,parent,brief_etat,livrables,comm&order=ndeg.asc&limit=5000")
    print("briefs:", len(rows), "(existants:", len(existing), ")")
    ok = 0
    for b in rows:
        p = {
            "Code": {"title": rt(b.get("ndeg"))}, "Projet": {"rich_text": rt(b.get("projet"))},
            "Client": {"rich_text": rt(b.get("client"))}, "Marque": {"rich_text": rt(b.get("marque"))},
            "Niveau": {"rich_text": rt(b.get("niveau"))}, "Type": {"rich_text": rt(b.get("type"))},
            "Responsable": {"rich_text": rt(b.get("responsable"))}, "Parent": {"rich_text": rt(b.get("parent"))},
            "Livrables": {"rich_text": rt(b.get("livrables"))}, "Commentaire": {"rich_text": rt(b.get("comm"))},
            "Statut": {"select": sel(b.get("statut"))}, "Entrée": {"select": sel(b.get("entree"))},
            "Priorité": {"select": sel(b.get("prio"))}, "Statut brief": {"select": sel(b.get("brief_etat"))},
            "Deadline": {"date": dt(b.get("deadline"))}, "Date réception": {"date": dt(b.get("date_reception"))},
        }
        upsert(db, existing, (b.get("ndeg") or ""), p); ok += 1
        if ok % 50 == 0:
            print("…", ok, "/", len(rows))
        time.sleep(0.34)
    print("briefs OK:", ok)


def mirror_clients(parent):
    props = {
        "Client": {"title": {}}, "Secteur": {"rich_text": {}}, "Marchés": {"rich_text": {}},
        "Langues": {"rich_text": {}}, "Marques": {"rich_text": {}},
        "Exigences par marché": {"rich_text": {}}, "Charte & créa": {"rich_text": {}},
        "Contacts & validation": {"rich_text": {}}, "Notes": {"rich_text": {}},
    }
    db = find_or_create_db(parent, "WIKI CLIENTS — Radar (miroir)", props, "Client")
    existing = index_by_key(db, "Client")
    rows = supa("clients?select=*&order=ordre.asc&limit=1000")
    print("clients:", len(rows))
    ok = 0
    for c in rows:
        p = {
            "Client": {"title": rt(c.get("nom"))}, "Secteur": {"rich_text": rt(c.get("secteur"))},
            "Marchés": {"rich_text": rt(c.get("pays"))}, "Langues": {"rich_text": rt(c.get("langues"))},
            "Marques": {"rich_text": rt(c.get("marques"))},
            "Exigences par marché": {"rich_text": rt(c.get("exigences"))},
            "Charte & créa": {"rich_text": rt(c.get("charte"))},
            "Contacts & validation": {"rich_text": rt(c.get("contacts"))},
            "Notes": {"rich_text": rt(c.get("notes"))},
        }
        upsert(db, existing, (c.get("nom") or ""), p); ok += 1
        time.sleep(0.34)
    print("clients OK:", ok)


def main():
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    parent = parent_page()
    if what in ("all", "briefs"):
        mirror_briefs(parent)
    if what in ("all", "clients"):
        mirror_clients(parent)
    print("Terminé.")


if __name__ == "__main__":
    main()
