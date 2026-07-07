// Route /feed.xml — flux RSS 2.0 de l'activité du pipe Matanga.
// Logique partagée dans _feed.js. Auth gérée par token (FEED_TOKEN), pas par le mur Basic.
import { handleFeed } from "./_feed.js";
export const onRequestGet = (context) => handleFeed(context, "rss");
