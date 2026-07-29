import express from "express";
import {
  createServer,
  getServerPort,
  reddit,
  settings
} from "@devvit/web/server";

import {
  getRequestBodyValue,
  messageModsIfBotReply,
  messageUserIfBotReply,
  userIsMod,
  isValidUsername
} from "./utils.js";

import { CommentId } from "./types.js"

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

// Trigger handler for comment create
router.post('/internal/triggers/on-comment-create', async (req, res): Promise<void> => {
  try {
    // Check if the reply is to a post.
    const parentId = getRequestBodyValue(req.body, ['comment', 'parentId']),
    id = getRequestBodyValue(req.body, ['comment', 'id']),
    commentLink = getRequestBodyValue(req.body, ['comment', 'permalink']);
    if (!(await settings.get<boolean>("send-for-posts"))) {
      const isPostReply = parentId.startsWith("t3_");
      if (isPostReply) return; // If messages for post replies are disabled and this is a post reply, do nothing.
    }
    // Get username and if it's invalid, try fetching it again from the Comment object.
    let authorName = getRequestBodyValue(req.body, ['author', 'name']);
    if (!isValidUsername(authorName)) {
      const comment = await reddit.getCommentById(id as CommentId);
      if (comment) authorName = comment.authorName;
    }
    // Check if replies by mods should be ignored.
    if (await settings.get<boolean>("ignore-mods")) {
      const authorIsMod = (await userIsMod(authorName)) as boolean;
      if (authorIsMod) return; // If author is mod and replies by mods are ignored, do nothing.
    }
    // If mod messaging is enabled, proceed.
    if (await settings.get<boolean>("message-mods")) {
      await messageModsIfBotReply(
        authorName,
        parentId,
        commentLink
      );
    }
    // If user messaging is enabled, proceed.
    if (await settings.get<boolean>("message-users")) {
      await messageUserIfBotReply(
        authorName,
        parentId,
        commentLink
      );
    }
    res.status(200).json({ status: 'ok' });
  }
  catch (error) {
    console.log(`General error: ${error}`);
  }
});

app.use(router);

const server = createServer(app);
server.on("error", (err) => console.error(`server error: ${err.stack}`));
server.listen(getServerPort());