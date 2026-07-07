-- ============================================================
-- Matanga RADAR — seed wiki (combler les clients-gap depuis les FICHES RÉELLES
-- du repo, uniquement du contenu CONFIRMÉ, jamais inféré).
--
-- Périmètre : clients actifs sans ligne client_markets/client_contacts dont
-- la fiche (.md) contient de vrais interlocuteurs (issus des threads mail réels).
-- Source tracée dans la colonne `source` = « importé de <fiche> — à valider ».
-- Éditable ensuite via marques.html. Idempotent (NOT EXISTS).
--
-- Clients-gap SANS fiche exploitable (Airtel Tchad, Care CIV, Groupe Arno,
-- Le Drouot, Mama Makala, Olea, Pacey, PAK, Payboard, Presynats, Shoome,
-- Trade View, UCB, Dr Pierre Somsé, Florida, Fokou Gabon, xtincell) :
-- volontairement NON insérés → restent vides (« — » dans le deck) en attendant
-- une saisie humaine. On n'invente pas.
-- ============================================================

-- ---------- CONTACTS (réels, issus des fiches) ----------
insert into public.client_contacts (client, nom, role, source)
select v.client, v.nom, v.role, v.source
from (values
  ('Bel Group','Junior Koffi Komenan','Brand Manager WACA','importé de CLIENTS-DIVERS.md — à valider'),
  ('Bel Group','Soraya Kone','Senior Brand Manager West/East/Central Africa','importé de CLIENTS-DIVERS.md — à valider'),
  ('Bel Group','Emmanuel Tchameyo','Contact Bel (retours créatifs)','importé de CLIENTS-DIVERS.md — à valider'),
  ('Danone','Lorena Bernadini','Brand Manager Cereals team DNAF','importé de CLIENTS-DIVERS.md — à valider'),
  ('Danone','Marie-Emmanuelle Tcheby','Contact Danone','importé de CLIENTS-DIVERS.md — à valider'),
  ('Sofavin/Cap Esterias','Bénédicte Avomo','Responsable Marketing','importé de SOF.md — à valider')
) as v(client, nom, role, source)
where not exists (
  select 1 from public.client_contacts c where c.client = v.client and c.nom = v.nom
);

-- ---------- MARCHÉS / MARQUES (réels, issus des fiches) ----------
insert into public.client_markets (client, marque, langue, specificites, source)
select v.client, v.marque, v.langue, v.specificites, v.source
from (values
  ('Bel Group','La Vache Qui Rit / Apéricube','Français','[]'::jsonb,'importé de CLIENTS-DIVERS.md — à valider'),
  ('Danone','Phosphatine','Français','[]'::jsonb,'importé de CLIENTS-DIVERS.md — à valider'),
  ('Sofavin/Cap Esterias','Cap Esterias (vin rosé), AVA (mayonnaise)','Français',
     '["Produits alcoolisés + agroalimentaire : contraintes d''étiquetage réglementaire","Chaîne de validation lourde : service Achat distinct du Marketing (conflits BC/paiement)"]'::jsonb,
     'importé de SOF.md — à valider')
) as v(client, marque, langue, specificites, source)
where not exists (
  select 1 from public.client_markets m where m.client = v.client and m.marque = v.marque
);
