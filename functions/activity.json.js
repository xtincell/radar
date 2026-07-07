// Route /activity.json — même flux qu'/feed.xml au format JSON Feed 1.1.
import { handleFeed } from "./_feed.js";
export const onRequestGet = (context) => handleFeed(context, "json");
