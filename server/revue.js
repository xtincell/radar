// ============================================================
//  RADAR — revue des événements anciens (/journal/revue)
//  Arbitrage 5.7 du 12 novembre 2026 : un événement dont la confidentialité
//  est inconnue (task_events.private_to NULL, écrit avant qu'elle ne soit
//  enregistrée) est traité comme privé jusqu'à relecture. Il n'entre dans
//  aucun flux ; owner et supervisor le lisent par REST pour le qualifier.
//
//  POST /journal/revue, JSON :
//    { "ids": [12, 13], "decision": "public" }
//    { "ids": [14], "decision": "prive", "private_to": "Alice" }
//  Réservé à owner, supervisor et à la clé machine. Tout ou rien : un seul
//  événement refusé et aucun n'est qualifié. Qui et quand sont inscrits
//  (revue_par, revue_le) ; le contenu de l'événement n'est jamais modifié.
//
//  Refus :
//    • un événement qualifié à sa création (private_to déjà posé, sans revue)
//      garde sa confidentialité d'origine (409) ;
//    • un événement déjà relu et devenu privé à quelqu'un d'autre est hors de
//      vue, donc hors de portée (403) ;
//    • « public » est refusé si le dossier qui porte aujourd'hui ce code est
//      privé (409) : la relecture ne publie pas un dossier privé par son code.
//  Une décision déjà prise peut être corrigée par la même route, dans ces
//  limites (par exemple « public » → « prive »).
// ============================================================
"use strict";
import { hasDb, initDb, transaction } from "./pgrest.js";
import { taskAuthority } from "../functions/_authz.js";

const MAX_IDS = 500;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const refus = (message, status) => Object.assign(new Error(message), { status });

export async function handleRevueJournal(context) {
  if (!hasDb()) return json({ message: "base non configurée" }, 503);
  if (!await initDb()) return json({ message: "base indisponible" }, 503);
  const who = taskAuthority(context);
  if (!who.fullAccess && who.role !== "owner" && who.role !== "supervisor") return json({ message: "réservé aux superviseurs" }, 403);
  // Un formulaire d'un autre site ne peut pas poser ce type de contenu sans prévol.
  if (!/^application\/json\b/i.test(context.request.headers.get("content-type") || "")) return json({ message: "corps application/json attendu" }, 415);
  let body;
  try { body = await context.request.json(); } catch { return json({ message: "corps JSON attendu" }, 400); }
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number) : [];
  if (!ids.length || ids.length > MAX_IDS || ids.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length)
    return json({ message: `ids : 1 à ${MAX_IDS} identifiants d'événements distincts` }, 400);
  const decision = body.decision;
  if (decision !== "public" && decision !== "prive") return json({ message: "decision : « public » ou « prive »" }, 400);
  const privateTo = decision === "prive" ? String(body.private_to ?? "").trim() : "";
  if (decision === "prive" && !privateTo) return json({ message: "private_to : la personne à qui l'événement reste réservé" }, 400);
  if (decision === "public" && body.private_to != null && String(body.private_to).trim() !== "")
    return json({ message: "private_to ne s'emploie qu'avec la décision « prive »" }, 400);
  const reviewer = context.data?.email || "";

  try {
    const evenements = await transaction(async client => {
      const { rows } = await client.query(
        "select id, ndeg, private_to, revue_le from task_events where id = any($1) order by id for update", [ids]);
      if (rows.length !== ids.length) {
        const connus = new Set(rows.map(r => Number(r.id)));
        throw refus("événement inconnu : " + ids.filter(id => !connus.has(id)).join(", "), 404);
      }
      for (const e of rows) {
        if (e.private_to !== null && e.revue_le === null)
          throw refus(`événement ${e.id} qualifié à sa création : sa confidentialité ne se révise pas`, 409);
        if (!who.fullAccess && e.private_to !== null && e.private_to !== "" && e.private_to !== who.person)
          throw refus(`événement ${e.id} hors de votre périmètre`, 403);
      }
      if (decision === "public") {
        const codes = [...new Set(rows.map(e => e.ndeg).filter(c => c != null && c !== ""))];
        const prives = codes.length ? (await client.query(
          "select ndeg from briefs where ndeg = any($1) and btrim(coalesce(private_to,'')) <> '' order by ndeg", [codes])).rows : [];
        if (prives.length)
          throw refus(`un dossier privé porte aujourd'hui le code ${prives.map(p => p.ndeg).join(", ")} : publication refusée, qualifier en « prive »`, 409);
      }
      return (await client.query(
        `update task_events set private_to = $2, revue_par = $3, revue_le = now() where id = any($1)
         returning id, at, ndeg, kind, projet, private_to, revue_par, revue_le`, [ids, privateTo, reviewer])).rows;
    });
    return json({ revus: evenements.length, decision, evenements });
  } catch (e) {
    if (e.status) return json({ message: e.message }, e.status);
    console.error("[revue]", e && e.message);
    return json({ message: "erreur SQL" }, 500);
  }
}
