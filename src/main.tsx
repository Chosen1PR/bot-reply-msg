// Learn more at developers.reddit.com/docs
import { Devvit } from "@devvit/public-api";
import {
  messageModsIfBotReply,
  messageUserIfBotReply,
  userIsMod,
} from "./utils.js";

Devvit.configure({
  redditAPI: true,
});

Devvit.addSettings([
  // Config setting to enable app
  {
    type: "boolean",
    name: "message-mods",
    label: "Message mods",
    helpText: "Enables chat messages to mods for replies to bot accounts. Configure further settings below.",
    defaultValue: true,
    scope: "installation",
  },
  {
    type: "boolean",
    name: "message-users",
    label: "Message users",
    helpText: "Enables chat messages to users when they reply to bots. Configure further settings below.",
    defaultValue: false,
    scope: "installation",
  },
  {
    type: "group",
    label: "Bot Settings",
    helpText:
      "",
    fields: [
      // Config setting for ModTeam replies
      {
        type: "boolean",
        name: "send-for-modteam",
        label: "Message for replies to -ModTeam account",
        helpText:
          "Enables messaging for replies to the [subreddit]-ModTeam account.",
        defaultValue: true,
        scope: "installation",
      },
      // Config setting for AutoModerator replies
      {
        type: "boolean",
        name: "send-for-automod",
        label: "Message for replies to AutoModerator",
        helpText:
          "Enables messaging for replies to u/AutoModerator.",
        defaultValue: true,
        scope: "installation",
      },
      // Config setting for bot usernames
      {
        type: "paragraph",
        name: "bot-usernames",
        label: "Bot account usernames",
        helpText: `Comma (,) separated list of usernames for bot accounts that you want to receive reply messages for. ` +
          `Please omit any leading "u/" (e.g., AutoModerator, not u/AutoModerator).`,
        defaultValue: "",
        scope: "installation",
      },
    ]
  },
  {
    type: "group",
    label: "Mod Message Settings",
    helpText:
      `Please omit any leading "u/" (e.g., AutoModerator, not u/AutoModerator) in the settings below.`,
    fields: [
      // Config setting for mod blacklist
      {
        type: "paragraph",
        name: "mod-blacklist",
        label: "Mod blocklist",
        helpText: "Comma (,) separated list of moderators that will not receive messages. " +
          "Leave blank to send to all mods (except AutoModerator and this app). " +
          "This setting is ignored if there is at least one username in the allowlist.",
        defaultValue: "",
        scope: "installation",
      },
      // Config setting for recipient whitelist
      {
        type: "paragraph",
        name: "recipient-whitelist",
        label: "Recipient allowlist",
        helpText: "Comma (,) separated list of users that will receive messages. Overrides the above blocklist and can include non-mod accounts.",
        defaultValue: "",
        scope: "installation",
      },
    ]
  },
  {
    type: "group",
    label: "User Message Settings",
    helpText:
      "Leave below fields blank to disable.",
    fields: [
      // Config setting for subject to user
      {
        type: "string",
        name: "subject-to-user",
        label: "Subject for message to user",
        helpText: `This is the subject line for the message that will be sent to users who reply to bots. ` +
          `Available placeholders: {subreddit} (doesn't include r/), {bot} (doesn't include u/)`,
        defaultValue: "",
        scope: "installation",
      },
      // Config setting for message to user
      {
        type: "paragraph",
        name: "message-to-user",
        label: "Message to user",
        helpText: `This is the message that will be sent to users who reply to bots. You can use markdown here. ` +
          `Available placeholders: {comment_link}, {subreddit} (doesn't include r/), {bot} & {user} (don't include u/)`,
        defaultValue: "",
        scope: "installation",
      }
    ]
  },
  // Config setting to enable notifications for post replies
  {
    type: "boolean",
    name: "send-for-posts",
    label: "Message for post replies",
    helpText:
      "Enable messages for replies to bot posts in addition to bot comments. Affects both mod and user messages.",
    defaultValue: false,
    scope: "installation",
  },
  // Config setting to ignore replies by mods
  {
    type: "boolean",
    name: "ignore-mods",
    label: "Ignore replies by mods",
    helpText:
      "If enabled, replies to bots by mods will be ignored. This may include other bots that are mods. Disable for testing.",
    defaultValue: true,
    scope: "installation",
  },
]);

// Button for settings form
Devvit.addMenuItem({
  label: "Bot Reply Messenger",
  description: "Settings",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (event, context) => {
    context.ui.navigateTo(`https://developers.reddit.com/r/${context.subredditName!}/apps/${context.appName}`);
  },
});

// Comment trigger handler
Devvit.addTrigger({
  event: "CommentCreate",
  onEvent: async (event, context) => {
    // Check if the reply is to a post.
    const parentId = event.comment?.parentId!;
    if (!(await context.settings.get("send-for-posts"))) {
      const isPostReply = parentId.startsWith("t3_");
      if (isPostReply) return; // If messages for post replies are disabled and this is a post reply, do nothing.
    }
    // Check if replies by mods should be ignored.
    const authorName = event.author?.name!;
    if (await context.settings.get("ignore-mods")) {
      const authorIsMod = (await userIsMod(authorName, context)) as boolean;
      if (authorIsMod) return; // If author is mod and replies by mods are ignored, do nothing.
    }
    // If mod messaging is enabled, proceed.
    const commentLink = event.comment?.permalink!;
    if (await context.settings.get("message-mods")) {
      await messageModsIfBotReply(
        authorName,
        parentId,
        commentLink,
        context
      );
    }
    // If user messaging is enabled, proceed.
    if (await context.settings.get("message-users")) {
      await messageUserIfBotReply(
        authorName,
        parentId,
        commentLink,
        context
      );
    }
  },
});



export default Devvit;