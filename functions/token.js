// functions/token.js — émet un JWT Supabase PAR UTILISATEUR (identité au niveau base).
// L'appelant est déjà authentifié par le mur (_middleware) : on lit son email (fiable),
// on récupère son niveau d'autorité (functions/_authz.js) et on signe un JWT HS256 avec
// le secret JWT Supabase (env SUPABASE_JWT_SECRET, jamais dans le repo). Le front l'utilise
// comme Authorization Bearer → les policies RLS peuvent lire app_role / app_person.
"use strict";
import { identityFor } from "./_authz.js";

const enc = new TextEncoder();
function b64urlBytes(buf){ let s=""; const b=new Uint8Array(buf); for(let i=0;i<b.length;i++) s+=String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function b64urlStr(str){ return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }

async function sign(payload, secret){
  const head = b64urlStr(JSON.stringify({alg:"HS256",typ:"JWT"}));
  const body = b64urlStr(JSON.stringify(payload));
  const data = head+"."+body;
  const key  = await crypto.subtle.importKey("raw", enc.encode(secret), {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
  const sig  = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return data+"."+b64urlBytes(sig);
}
function emailFromBasic(request){
  const h=request.headers.get("Authorization")||"";
  if(!h.startsWith("Basic ")) return "";
  try{ const d=atob(h.slice(6)); const i=d.indexOf(":"); return (i>=0?d.slice(0,i):"").trim().toLowerCase(); }catch{ return ""; }
}
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});

export async function onRequestGet(context){
  const email = ((context.data && context.data.email) || emailFromBasic(context.request) || "").toLowerCase();
  if(!email) return json({ok:false, error:"non authentifié"}, 401);
  const secret = context.env.SUPABASE_JWT_SECRET;
  if(!secret) return json({ok:false, error:"secret JWT non configuré"});   // 200 → le front retombe sur la clé anon
  const id = identityFor(email);   // { email, person, role }
  const now = Math.floor(Date.now()/1000);
  const payload = { role:"authenticated", aud:"authenticated", sub:email, email,
    app_role:id.role, app_person:id.person||"", iat:now, exp:now + 60*60 };
  try{
    const token = await sign(payload, secret);
    return json({ok:true, token, role:id.role, person:id.person, exp:payload.exp});
  }catch(e){ return json({ok:false, error:"signature échouée: "+(e&&e.message)}); }
}
