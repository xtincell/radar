// Traduit entre l'API Node http (IncomingMessage/ServerResponse) et l'API Fetch
// standard (Request/Response) qu'attendent les Pages Functions réutilisées telles
// quelles (functions/*.js). Node 18+ expose Request/Response/Headers/ReadableStream
// en globals — aucune dépendance npm nécessaire.
"use strict";
import { Readable } from "node:stream";

export function toWebRequest(nodeReq, origin) {
  const url = origin + nodeReq.url;
  const headers = new Headers();
  for (let i = 0; i < nodeReq.rawHeaders.length; i += 2) {
    headers.append(nodeReq.rawHeaders[i], nodeReq.rawHeaders[i + 1]);
  }
  const hasBody = nodeReq.method !== "GET" && nodeReq.method !== "HEAD";
  return new Request(url, {
    method: nodeReq.method,
    headers,
    body: hasBody ? Readable.toWeb(nodeReq) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

export async function writeWebResponse(webRes, nodeRes) {
  const setCookies = webRes.headers.getSetCookie ? webRes.headers.getSetCookie() : [];
  for (const [name, value] of webRes.headers) {
    if (name.toLowerCase() === "set-cookie") continue; // géré à part (multi-valeurs)
    nodeRes.setHeader(name, value);
  }
  if (setCookies.length) nodeRes.setHeader("Set-Cookie", setCookies);
  nodeRes.statusCode = webRes.status;

  if (!webRes.body) {
    nodeRes.end();
    return;
  }
  Readable.fromWeb(webRes.body).pipe(nodeRes);
}
