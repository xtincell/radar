// Dashboard R26 × Radar — Gabarits : DONNÉES par projet (clés réelles de la base)
// Chaque projet = { suivi, client, crea, prod, cs } avec les clés du schéma.
// Champ absent → rendu « — » (comme le mode live du repo).

const GABARIT_DATA = {
  // ===== La Pasta — Rentrée 2026 (le plus complet) =====
  'PAN-014': {
    suivi: {
      pitch: 'Faire de La Pasta le geste gourmand de la rentrée — la table qui rassemble après l\'été.',
      brief_source: 'Slack · #panza-crea', tension_marche: 'Marché des pâtes premium en croissance mais banalisé : tous les acteurs parlent « qualité italienne », personne ne parle du moment de consommation.',
      duree_etalon: '21 jours', date_etalon: '2026-06-30', marge: '+5 j ouvrés', delai_realiste: '2026-07-07',
      lecture: 'Durée étalon 21 j (standard Campagne 360°) + 5 j de marge agence → livraison réaliste le 7 juillet. La deadline client au 3 juillet est donc tendue de 4 jours.',
      dimensions: ['KV maître 4×3', 'Presse 210×270', 'Social 4:5', 'Story 9:16', 'OOH abribus'],
      langue: 'Français', claim_retenu: 'La rentrée a meilleur goût.', specificites: ['Logo toujours en bas à droite', 'Mention « Sans conservateurs » obligatoire', 'Packshot produit visible'],
      interlocuteur: 'Direction Marketing Panza', interlocuteur_role: 'Décideur validation finale', conditions: ['2 rounds de retours max', 'Validation légale packaging avant diffusion'], vigilance: 'Fenêtre de rentrée courte : tout glissement au-delà du 10 juillet fait rater le pic média.',
    },
    client: {
      contexte_business: 'La Pasta est n°2 des pâtes en volume mais veut monter en gamme pour améliorer sa marge et sa perception.',
      contexte_marque: 'Marque familiale, chaleureuse, historiquement « produit du quotidien ».', contexte_market: 'Segment premium en croissance (+12%/an), tiré par le fait-maison et les recettes.',
      contexte_com: 'Dernière campagne il y a 18 mois, centrée produit, sans territoire émotionnel fort.',
      probleme_marketing: 'La perception « pâtes basiques » plafonne la premiumisation et la préférence de marque.',
      obj_business: '+8 pts de préférence de marque et +5% de mix premium sur le S2.', obj_marketing: 'Installer La Pasta dans le rituel de la rentrée familiale.', obj_communication: 'Créer un territoire émotionnel propriétaire autour du repas partagé.',
      cible_principale: 'Parents urbains 28–45 ans, enfants scolarisés, qui cuisinent le soir en semaine.', cible_secondaire: 'Jeunes actifs 25–35, cuisine rapide mais soignée.', cible_socio_eco: 'CSP+ et CSP moyennes supérieures', cible_situation: 'Retour de vacances, reprise du rythme scolaire',
      cible_frein: 'Manque de temps le soir → tentation du plat industriel tout prêt.', cible_motivation: 'Offrir un vrai repas maison sans y passer une heure — fierté et lien familial.', cible_langage: 'Chaleureux, complice, sans culpabilisation',
      insight_client: '« La rentrée, c\'est le retour des vrais repas ensemble après l\'été éclaté. »', big_idea: 'La rentrée a meilleur goût.',
      axe1_nom: 'La table de rentrée', axe1_intention: 'Célébrer le retour des repas partagés en famille comme le vrai plaisir de septembre.', axe1_promesse: 'Un vrai repas maison, sans effort.', axe1_ton: 'Chaleureux, lumineux',
      axe1_copy_p: 'On rallume les fourneaux.', axe1_copy_s: 'La rentrée a meilleur goût.', axe1_preuve: 'Recette prête en 12 minutes, ingrédients simples visibles à l\'image.',
      axe2_nom: 'Le geste retrouvé', axe2_intention: 'Zoomer sur le geste de cuisiner comme un moment à soi retrouvé.', axe2_promesse: 'Le plaisir de bien faire, vite.', axe2_ton: 'Sensoriel, intime',
      axe2_copy_p: 'Le bon geste, tout simplement.', axe2_copy_s: 'La rentrée a meilleur goût.', axe2_preuve: 'Gros plans texture, vapeur, mains qui dressent l\'assiette.',
      contrainte_marque: 'Rouge La Pasta + logo intact', contrainte_legale: 'Mentions nutritionnelles', contrainte_culturelle: 'Éviter clichés de genre en cuisine', contrainte_produit: 'Packshot gamme premium', contrainte_format: 'Déclinable 4:5 / 9:16 / OOH', contrainte_delai: 'Diffusion avant le 15 juillet',
    },
    crea: {
      status_validation: 'Piste retenue — déclinaisons', message_claim: 'La rentrée a meilleur goût.', challenge_creatif: 'Rendre désirable un moment banal (le dîner de semaine) sans tomber dans le cliché de la famille parfaite.', principe_creatif: 'Filmer la vérité du geste et de la lumière plutôt que la mise en scène — le premium par l\'authenticité.',
      concept1_nom: 'Table de rentrée', concept1_axe: 'Axe 1 — La table de rentrée', concept1_piste: 'Scènes de repas du soir, lumière dorée de fin d\'été, vapeur, rires hors-champ. Le produit apparaît comme le héros discret du moment.', concept1_croisement: 'Food × moment de vie', concept1_univers: 'Cuisine réelle, pas studio', concept1_safe: 'Oui — packshot net garanti', concept1_reco: '★ Recommandé', concept1_money: 'Budget maîtrisé, 1 jour de shoot',
      concept2_nom: 'Le geste retrouvé', concept2_axe: 'Axe 2 — Le geste retrouvé', concept2_piste: 'Macro sur les gestes : eau qui bout, pâtes qu\'on égoutte, assiette qu\'on dresse. Montage rythmé, sound design gourmand.',
      da_style_image: 'Photo culinaire chaude, réaliste', da_lumiere: 'Dorée, rasante, fin de journée', da_cadrage: 'Gros plans + plans d\'ensemble table', da_decor: 'Cuisine familiale vécue', da_styling: 'Vaisselle dépareillée, authentique', da_attitude: 'Complicité, spontanéité', da_palette: 'Terracotta, crème, rouge La Pasta', da_typo: 'Serif chaleureuse + sans humaniste', da_retouche: 'Naturelle, vapeur préservée',
      copy_claim: 'La rentrée a meilleur goût.', copy_accroche: 'On rallume les fourneaux.', copy_explication: 'Après un été de sandwichs et d\'horaires décalés, La Pasta ramène le vrai repas du soir — simple, chaud, partagé.', copy_cta: 'Découvrez les recettes de rentrée', reco_agence: 'Partir sur le concept 1 en principal, garder l\'axe 2 pour les formats courts social.',
    },
    prod: {
      status_production: 'En production', livrable_principal: 'KV maître + déclinaisons', nb_slides: '1 KV + 6 déclinaisons', ratio: '4×3, 4:5, 9:16, 1:1', plateformes: ['OOH', 'Presse', 'Instagram', 'Meta', 'TikTok'], responsable_prod: 'Laure Pemha', deadline_prod: '2026-07-07',
      spec_social_portrait: '1080×1350, marges 64px', spec_carre: '1080×1080', spec_story: '1080×1920, zone safe 250px haut/bas', spec_export: 'CMJN 300dpi print · sRGB web', spec_safety_zone: 'Logo à 80px du bord', spec_file_weight: '≤ 2 Mo web · print sans limite', spec_naming: 'PAN014_[format]_[langue]_v[n]',
    },
    cs: {},
  },

  // ===== Bonnet Rouge — Ramadan 2025 =====
  'BNR-021': {
    suivi: {
      pitch: 'Faire du Ramadan Bonnet Rouge un rendez-vous émotionnel du partage, au-delà des codes visuels attendus.',
      brief_source: 'Notion · brief direction', tension_marche: 'Marché saturé de lanternes et croissants de lune : différenciation par l\'émotion, pas par les symboles.',
      duree_etalon: '16 jours', date_etalon: '2025-06-18', marge: '+5 j ouvrés', delai_realiste: '2025-06-25', lecture: 'Durée étalon 16 j (Campagne Digitale) + 5 j → réaliste au 25 juin. Retour client en attente : chaque jour de retard décale d\'autant.',
      dimensions: ['Film 30s 16:9', 'Film 9:16', 'Carrousel 4:5', 'Story'], langue: 'Français + sous-titres arabe', claim_retenu: 'Les soirs qui rassemblent.', specificites: ['Respect des codes religieux', 'Pas de musique instrumentale forte', 'Sous-titres bilingues'],
      interlocuteur: 'Direction Marketing Bonnet Rouge', interlocuteur_role: 'Validation créative + légale', conditions: ['Validation du board sur le film avant montage final'], vigilance: 'Fenêtre Ramadan non négociable : livraison ferme avant le début du mois.',
    },
    client: {
      contexte_business: 'Bonnet Rouge veut renforcer sa préférence de marque sur un moment de forte consommation.', contexte_marque: 'Marque populaire, généreuse, ancrée dans le quotidien familial.', contexte_market: 'Pic de consommation et d\'attention média pendant le Ramadan, forte pression concurrentielle.', contexte_com: 'Codes visuels du secteur très homogènes (lanternes, or, croissant).',
      probleme_marketing: 'Se démarquer d\'un marché où toutes les marques se ressemblent visuellement.', obj_business: 'Croissance des ventes sur la période +10%.', obj_marketing: 'Créer un rendez-vous de marque attendu chaque Ramadan.', obj_communication: 'Passer du symbole à l\'émotion du partage.',
      cible_principale: 'Familles pratiquantes 25–50 ans, forte activité sociale le soir (iftar).', cible_secondaire: 'Jeunes adultes organisant les repas.', cible_socio_eco: 'Toutes CSP, cœur populaire', cible_situation: 'Rupture du jeûne, repas du soir en famille',
      cible_frein: 'Sur-sollicitation publicitaire pendant le Ramadan → lassitude.', cible_motivation: 'Célébrer et honorer le moment du partage familial.', cible_langage: 'Respectueux, chaleureux, sobre',
      insight_client: '« Le vrai luxe du Ramadan, ce n\'est pas la table, c\'est le temps ensemble. »', big_idea: 'Les soirs qui rassemblent.',
      axe1_nom: 'Lanternes & tablée', axe1_intention: 'Filmer l\'intimité de l\'iftar, la lumière chaude et les gestes du partage.', axe1_promesse: 'Le produit du moment qui compte.', axe1_ton: 'Intimiste, chaleureux',
      axe1_copy_p: 'Quand la nuit rassemble.', axe1_copy_s: 'Les soirs qui rassemblent.', axe1_preuve: 'Scènes réelles d\'iftar, gestes de partage, lumière de lanternes.',
      axe2_nom: '', axe2_intention: '', axe2_promesse: '', axe2_ton: '', axe2_copy_p: '', axe2_copy_s: '', axe2_preuve: '',
      contrainte_marque: 'Logo + rouge Bonnet Rouge', contrainte_legale: 'Validation religieuse', contrainte_culturelle: 'Codes du Ramadan respectés', contrainte_produit: 'Packshot discret', contrainte_format: 'Film + social', contrainte_delai: 'Avant début Ramadan',
    },
    crea: {
      status_validation: 'En attente retour client', message_claim: 'Les soirs qui rassemblent.', challenge_creatif: 'Émouvoir sans tomber dans les clichés visuels du secteur.', principe_creatif: 'La lumière comme personnage : tout se joue dans le warm et l\'intime.',
      concept1_nom: 'Lanternes & tablée', concept1_axe: 'Axe 1', concept1_piste: 'Film 30s intimiste : préparation, attente, rupture du jeûne, sourires. Bokeh de lanternes, cadrage serré sur les gestes.', concept1_croisement: 'Émotion × rituel', concept1_univers: 'Maison familiale, nuit chaude', concept1_safe: 'Oui', concept1_reco: '★ Recommandé', concept1_money: '1,5 jour de tournage',
      concept2_nom: '', concept2_axe: '', concept2_piste: '',
      da_style_image: 'Cinématographique, chaud', da_lumiere: 'Nuit + lanternes, bokeh', da_cadrage: 'Serré sur les gestes', da_decor: 'Intérieur familial', da_styling: 'Table d\'iftar réelle', da_attitude: 'Recueillement + joie', da_palette: 'Bleu nuit + or', da_typo: 'Serif élégante', da_retouche: 'Grain léger, warm',
      copy_claim: 'Les soirs qui rassemblent.', copy_accroche: 'Quand la nuit rassemble.', copy_explication: 'Chaque soir de Ramadan, c\'est le moment où la famille se retrouve. Bonnet Rouge accompagne ce temps précieux.', copy_cta: '', reco_agence: 'Verrouiller le film avant de lancer les déclinaisons social.',
    },
    prod: {
      status_production: 'En conception', livrable_principal: 'Film 30s + social', nb_slides: '1 film + 5 déclinaisons', ratio: '16:9, 9:16, 4:5', plateformes: ['YouTube', 'Instagram', 'TikTok', 'Meta'], responsable_prod: 'Sarah Dikongue', deadline_prod: '2025-06-25',
      spec_social_portrait: '1080×1350', spec_carre: '', spec_story: '1080×1920', spec_export: 'H.264 1080p, sous-titres incrustés', spec_safety_zone: '250px haut/bas story', spec_file_weight: '≤ 15 Mo social', spec_naming: 'BNR021_[format]_v[n]',
    },
    cs: {},
  },

  // ===== Payboard — Teaser (livré, case study complet) =====
  'PBD-003': {
    suivi: {
      pitch: 'Créer la curiosité avant le lancement de Payboard, sur un marché de confiance où la notoriété est nulle.',
      brief_source: 'Slack · #payboard', tension_marche: 'Les solutions de paiement se ressemblent toutes et parlent « sécurité » — Payboard peut posséder la simplicité.',
      duree_etalon: '10 jours', date_etalon: '2025-06-05', marge: '+5 j ouvrés', delai_realiste: '2025-06-12', lecture: 'Livré dans les temps, validé au premier envoi.',
      dimensions: ['Teaser 16:9', 'Teaser 1:1', 'Teaser 9:16', 'Post produit'], langue: 'Français', claim_retenu: 'Payé. Point.', specificites: ['Sound design percussif', 'Pas de jargon fintech'],
      interlocuteur: 'CEO Payboard', interlocuteur_role: 'Validation finale', conditions: ['Validation en 1 envoi'], vigilance: 'RAS — projet clôturé.',
    },
    client: {
      contexte_business: 'Payboard lance une solution de paiement pour TPE/commerçants.', contexte_marque: 'Marque neuve, pas d\'héritage visuel.', contexte_market: 'Marché de confiance dominé par des acteurs installés.', contexte_com: 'Aucune notoriété préalable.',
      probleme_marketing: 'Exister et créer de la curiosité avant même le lancement produit.', obj_business: '1000 pré-inscriptions avant le lancement.', obj_marketing: 'Générer du bouche-à-oreille digital.', obj_communication: 'Poser la simplicité comme signature.',
      cible_principale: 'Commerçants et TPE 25–45, early adopters digitaux.', cible_secondaire: 'Freelances', cible_socio_eco: 'Indépendants', cible_situation: 'Encaissement au quotidien',
      cible_frein: 'Méfiance envers une marque inconnue.', cible_motivation: 'Se faire payer sans friction.', cible_langage: 'Direct, moderne, sans jargon',
      insight_client: '« Se faire payer devrait être aussi simple qu\'envoyer un message. »', big_idea: 'Le paiement, enfin simple.',
      axe1_nom: 'Payé. Point.', axe1_intention: 'Dire la simplicité par la brièveté même du message.', axe1_promesse: 'Zéro friction.', axe1_ton: 'Sec, moderne, confiant',
      axe1_copy_p: 'Payé. Point.', axe1_copy_s: 'Le paiement, enfin simple.', axe1_preuve: 'Démo produit en 3 secondes.',
      axe2_nom: '', axe2_intention: '', axe2_promesse: '', axe2_ton: '', axe2_copy_p: '', axe2_copy_s: '', axe2_preuve: '',
      contrainte_marque: 'Violet Payboard', contrainte_legale: 'Mentions paiement', contrainte_culturelle: '', contrainte_produit: 'UI produit visible', contrainte_format: 'Digital only', contrainte_delai: 'Avant lancement',
    },
    crea: {
      status_validation: 'Validé & livré', message_claim: 'Payé. Point.', challenge_creatif: 'Rendre désirable un sujet froid (le paiement) avec un budget teaser.', principe_creatif: 'La typographie comme produit : le rythme dit la simplicité.',
      concept1_nom: 'Typo-motion', concept1_axe: 'Axe 1', concept1_piste: 'Teaser typographique rythmé, mots-clés qui claquent, sound design percussif, révélation logo.', concept1_croisement: 'Motion × son', concept1_univers: 'Digital, bold', concept1_safe: 'Oui', concept1_reco: '★ Retenu', concept1_money: 'Motion only, pas de tournage',
      concept2_nom: '', concept2_axe: '', concept2_piste: '',
      da_style_image: 'Typographique, motion', da_lumiere: 'N/A', da_cadrage: 'Plein cadre typo', da_decor: 'Fond uni violet', da_styling: 'N/A', da_attitude: 'Confiante, snappy', da_palette: 'Violet profond + blanc', da_typo: 'Grotesque bold', da_retouche: 'N/A',
      copy_claim: 'Payé. Point.', copy_accroche: 'Payé. Point.', copy_explication: 'Payboard rend l\'encaissement aussi simple qu\'un message. Sans friction, sans attente.', copy_cta: 'Pré-inscrivez-vous', reco_agence: 'Décliner en version carrée pour le feed.',
    },
    prod: {
      status_production: 'Livré', livrable_principal: 'Teaser 15s', nb_slides: '1 teaser + 3 formats', ratio: '16:9, 1:1, 9:16', plateformes: ['Instagram', 'LinkedIn', 'Meta'], responsable_prod: 'Nelson Metougue', deadline_prod: '2025-06-12',
      spec_social_portrait: '1080×1350', spec_carre: '1080×1080', spec_story: '1080×1920', spec_export: 'H.264 1080p, master ProRes archivé', spec_safety_zone: 'Logo centré', spec_file_weight: '≤ 15 Mo', spec_naming: 'PBD003_[format]_v[n]',
    },
    cs: {
      status_validation: 'Publié', big_idea: 'Le paiement, enfin simple.', challenge: 'Créer de la notoriété et de la curiosité pour une marque partant de zéro, avant lancement.', insight: 'Se faire payer devrait être aussi simple qu\'envoyer un message.', strategie: 'Teaser de curiosité axé simplicité, sans montrer tout le produit.', concept_retenu: 'Typo-motion « Payé. Point. »', execution: 'Teaser 15s décliné en 3 formats, diffusion Meta + LinkedIn sur 2 semaines.', da: 'Typographique violet, sound design percussif',
      kpi_portee: '412 000 personnes touchées', kpi_impressions: '1,2 M impressions', kpi_engagement: '6,8%', kpi_taux_eng: '6,8% (vs 2,1% benchmark)', kpi_clics: '18 400 clics', kpi_leads: '1 240 pré-inscriptions', kpi_sentiment: '92% positif', kpi_verbatims: '« Enfin clair », « hâte de tester » — retours spontanés en commentaires.', kpi_reutilisabilite: 'Template typo réutilisable pour le lancement',
      learning_ok: 'Le teaser typographique a surperformé les visuels produit de +3x sur l\'engagement.', learning_improve: 'Lancer 1 semaine plus tôt pour mieux capitaliser sur la curiosité.', learning_platform: 'LinkedIn a généré les leads les plus qualifiés ; TikTok non testé.', learning_industrial: 'Le système typo-motion est industrialisable pour toute la marque.', learning_sell: 'Preuve que la simplicité de message bat la démo produit en phase de teasing.',
    },
  },

  // ===== AGL — Brand Refresh (partiel, en conception) =====
  'AGL-007': {
    suivi: {
      pitch: 'Moderniser l\'identité AGL sans renier son héritage industriel et maritime.',
      brief_source: 'Tracker · AGL', tension_marche: 'Acteur logistique établi mais image datée face à des concurrents plus jeunes.',
      duree_etalon: '24 jours', date_etalon: '2025-06-12', marge: '+5 j ouvrés', delai_realiste: '2025-06-19', lecture: 'Chantier de fond, jalonné en 3 phases (audit, design, déclinaisons).',
      dimensions: ['Logo', 'Charte', 'OOH', 'Papeterie'], langue: 'Français + anglais', claim_retenu: '', specificites: ['Conserver le bleu AGL', 'Décliner sur signalétique entrepôt'],
      interlocuteur: 'Direction AGL', interlocuteur_role: 'Comité de marque', conditions: ['Validation par phase'], vigilance: 'Alignement de tous les BU avant déploiement.',
    },
    client: {
      contexte_business: 'AGL veut rajeunir son image pour attirer talents et clients.', contexte_marque: 'Marque solide mais perçue comme vieillissante.', contexte_market: 'Logistique en modernisation, concurrence plus digitale.', contexte_com: 'Identité fragmentée selon les filiales.',
      probleme_marketing: 'Une image qui ne reflète plus l\'ambition du groupe.', obj_business: 'Renforcer l\'attractivité employeur et commerciale.', obj_marketing: 'Unifier la marque sur toutes les BU.', obj_communication: 'Affirmer une modernité ancrée dans l\'expertise.',
      cible_principale: 'Clients B2B, partenaires, talents.', cible_secondaire: 'Collaborateurs internes', cible_socio_eco: 'Décideurs', cible_situation: 'Choix de partenaire logistique',
      cible_frein: 'Perception « vieux groupe ».', cible_motivation: 'Fiabilité + modernité.', cible_langage: 'Sobre, corporate, confiant',
      insight_client: '« La solidité n\'empêche pas d\'être moderne. »', big_idea: 'L\'expertise en mouvement.',
      axe1_nom: 'En mouvement', axe1_intention: 'Traduire l\'expertise par le dynamisme.', axe1_promesse: 'Solide et moderne.', axe1_ton: 'Corporate dynamique', axe1_copy_p: 'L\'expertise en mouvement.', axe1_copy_s: '', axe1_preuve: 'Flux, lignes, logistique en action.',
      axe2_nom: '', axe2_intention: '', axe2_promesse: '', axe2_ton: '', axe2_copy_p: '', axe2_copy_s: '', axe2_preuve: '',
      contrainte_marque: 'Bleu AGL conservé', contrainte_legale: '', contrainte_culturelle: 'Multi-pays', contrainte_produit: '', contrainte_format: 'Système complet', contrainte_delai: 'Déploiement Q3',
    },
    crea: {
      status_validation: 'En conception', message_claim: 'L\'expertise en mouvement.', challenge_creatif: 'Moderniser sans casser la reconnaissance.', principe_creatif: 'Faire vivre le bleu historique dans un système dynamique.',
      concept1_nom: 'Système en flux', concept1_axe: 'Axe 1', concept1_piste: 'Logo avec signe de mouvement, système graphique de lignes-flux, déclinable en signalétique.', concept1_croisement: 'Héritage × mouvement', concept1_univers: 'Industriel moderne', concept1_safe: 'Oui', concept1_reco: 'En exploration', concept1_money: 'Chantier long',
      concept2_nom: '', concept2_axe: '', concept2_piste: '',
      da_style_image: 'Photo industrielle premium', da_lumiere: 'Contrastée', da_cadrage: 'Lignes de fuite', da_decor: 'Entrepôts, ports', da_styling: '', da_attitude: 'Fiable, en action', da_palette: 'Bleu AGL + gris + accent', da_typo: 'Grotesque technique', da_retouche: 'Nette, corporate',
      copy_claim: 'L\'expertise en mouvement.', copy_accroche: '', copy_explication: '', copy_cta: '', reco_agence: '',
    },
    prod: {
      status_production: 'En conception', livrable_principal: 'Système d\'identité', nb_slides: 'Logo + charte + déclinaisons', ratio: 'Variable', plateformes: ['Print', 'OOH', 'Digital', 'Signalétique'], responsable_prod: 'Marc Biya', deadline_prod: '2025-06-19',
      spec_social_portrait: '', spec_carre: '', spec_story: '', spec_export: 'Vectoriel + guidelines PDF', spec_safety_zone: 'Zone de protection logo', spec_file_weight: '', spec_naming: 'AGL007_[asset]_v[n]',
    },
    cs: {},
  },
};

Object.assign(window, { GABARIT_DATA });
