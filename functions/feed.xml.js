// Route /feed.xml — flux RSS 2.0 de l'activité du pipe.
// Logique partagée dans _feed.js. Non publié par défaut : FEED_PUBLIC ou FEED_TOKEN
// l'ouvrent (functions/_publication.js) ; sinon, derrière le mur, aux responsables.
import { handleFeed } from "./_feed.js";
export const onRequestGet = (context) => handleFeed(context, "rss");
