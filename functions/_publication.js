// ============================================================
// RADAR — ce qu'une installation publie sans connexion
// Arbitrage 5.7 du 12 novembre 2026 : rien n'est public par défaut. Chaque
// sortie anonyme demande un choix explicite de l'installation, en variable
// d'environnement ; sans ce choix, la route passe derrière le mur.
//
//   Flux d'activité (/feed.xml, /activity.json) :
//     FEED_TOKEN=<secret>  → publié aux seuls détenteurs du jeton (?token=…)
//     FEED_PUBLIC=1        → publié sans jeton
//     ni l'un ni l'autre   → non publié ; lisible des responsables connectés
//   FEED_TOKEN prime : avec un jeton, FEED_PUBLIC n'ouvre rien de plus.
//
//   Vue du jour (/jour.json, /jour.html) :
//     JOUR_PUBLIC=1        → publiée sans connexion (dossiers non privés)
//     sinon                → derrière le mur, au périmètre de la personne
//
// Le contenu publié reste borné par la confidentialité de chaque dossier et
// de chaque événement (private_to) : un choix de publication n'ouvre jamais
// un dossier privé ni un événement ancien à confidentialité inconnue.
// ============================================================
"use strict";

const OUI = /^(1|true|oui|yes|on)$/i;
export const estActive = (v) => OUI.test(String(v ?? "").trim());

// "jeton" | "public" | "prive"
export function feedAccess(env) {
  if (String((env && env.FEED_TOKEN) || "")) return "jeton";
  if (estActive(env && env.FEED_PUBLIC)) return "public";
  return "prive";
}

export const jourPublic = (env) => estActive(env && env.JOUR_PUBLIC);

export const FEED_PATHS = new Set(["/feed.xml", "/activity.json"]);
export const JOUR_PATHS = new Set(["/jour.json", "/jour.html", "/jour"]);
