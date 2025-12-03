// Learn more at developers.reddit.com/docs
import {
  Devvit,
  TriggerContext,
} from "@devvit/public-api";

Devvit.configure({
  //redis: true,
  redditAPI: true,
});


Devvit.addSettings([
  // Config setting to enable app
  {
    type: "boolean",
    name: "app-enable",
    label: "Enable app",
    helpText:
      "Enable chat messaging for replies to bot accounts.",
    defaultValue: true,
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
    // Config setting to enable notifications for post replies
  {
    type: "boolean",
    name: "post-enable",
    label: "Message for post replies",
    helpText:
      "Enable messages for replies to bot posts in addition to bot comments.",
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
        name: "modteam-enable",
        label: "Message for replies to -ModTeam account",
        helpText:
          "Enables messaging for replies to [subreddit]-ModTeam account.",
        defaultValue: false,
        scope: "installation",
      },
      // Config setting for AutoModerator replies
      {
        type: "boolean",
        name: "automod-enable",
        label: "Message for replies to AutoModerator",
        helpText:
          "Enables messaging for replies to u/AutoModerator.",
        defaultValue: false,
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
    label: "Recipient Settings",
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
        helpText: "Comma (,) separated list of users that will receive messages. Overrides the above blocklist.",
        defaultValue: "",
        scope: "installation",
      },
    ]
  },
]);

// Button for settings form
Devvit.addMenuItem({
  label: "Bot Reply Messenger",
  location: "subreddit", // can also be 'comment' or 'subreddit'
  forUserType: "moderator",
  onPress: async (event, context) => {
    context.ui.navigateTo(`https://developers.reddit.com/r/${context.subredditName!}/apps/bot-reply-msg`);
  },
});

// Comment trigger handler
Devvit.addTrigger({
  event: "CommentCreate",
  onEvent: async (event, context) => {
    // If app is not enabled, do nothing.
    if (!(await context.settings.get("app-enable"))) return;
    // Check if replies by mods are ignored and if author is mod.
    if (await context.settings.get("ignore-mods")) {
      const authorIsMod = (await userIsMod(event.author?.name!, context)) as boolean;
      if (authorIsMod) return; // If author is mod and replies by mods are ignored, do nothing.
    }
    const parentId = event.comment?.parentId!;
    var parentAuthor = "";
    if (parentId.startsWith("t3_")) { // Parent is a post.
      if (!(await context.settings.get("post-enable"))) return; // If app is not enabled for post replies, do nothing.
      const parentPost = await context.reddit.getPostById(parentId)!;
      parentAuthor = parentPost.authorName;
    }
    else { // Parent is a comment (starts with "t1_").
      const parentComment = await context.reddit.getCommentById(parentId)!;
      parentAuthor = parentComment.authorName;
    }
    // // If parent isn't applicable bot, do nothing.
    if (!(await parentUsernameIsApplicable(parentAuthor, context))) return;
    // Get recipients.
    const recipients = await getRecipients(context);
    if (recipients.length == 0) return; // If no recipients, do nothing.
    // All conditions met.
    // Iterate through recipients and send PM to each one.
    for (let i = 0; i < recipients.length; i++) {
      await pmUser(
        recipients[i].trim(), // Recipient username from list
        event.author?.name!, // Comment author's username
        parentAuthor, // Parent author (bot) username.
        context.subredditName!, // Current subreddit
        event.comment?.permalink!, // Comment link
        context); // Current TriggerContext
    }
  },
});

// Helper function to PM a user about comment replies.
async function pmUser(
  recipientUsername: string,
  authorUsername: string,
  botUsername: string,
  subredditName: string,
  commentLink: string,
  //postLink: string,
  context: TriggerContext
) {
  //console.log("Recipient: " + recipientUsername);
  //console.log("Author: " + authorUsername);
  //console.log("Bot: " + botUsername);
  //console.log("Subreddit: " + subredditName);
  //console.log("Link: " + commentLink);
  if (!isValidRecipientName(recipientUsername, subredditName))
    return; // If recipient is undefined, blank, this app, or a known bot, do nothing.
  const subjectText = `Someone replied to a bot in r/${subredditName}.`;
  var messageText = `u/${authorUsername} replied to u/${botUsername}.` +
    `\n\n- [**Comment Link**](${commentLink})` +
    `\n\n---\n\n[App Settings](https://developers.reddit.com/r/${subredditName}/apps/bot-reply-msg)`;
  //messageText += `\n\n---\n\n*Do not reply; this inbox is not monitored.*`;
  if (recipientUsername) {
    // If you want to send a PM as the subreddit, uncomment the line below and comment out the next line
    //await context.reddit.sendPrivateMessageAsSubreddit({
    try {
      await context.reddit.sendPrivateMessage({
        subject: subjectText,
        text: messageText,
        to: recipientUsername,
        //fromSubredditName: subredditName,
      });
    } catch (error) {
      if (error == "NOT_WHITELISTED_BY_USER_MESSAGE")
        console.log(`Error: u/${recipientUsername} likely has messaging disabled.`);
      else console.log(`Error sending PM to user ${recipientUsername}: ${error}`);
    }
  }
  else {
    console.log(`Error: User not found.`);
  }
}

// Helper function for getting recipients for PM
async function getRecipients(context: TriggerContext) {
  const recipientWhitelist = (await context.settings.get("recipient-whitelist")) as string;
  const whitelistHasSomething = (recipientWhitelist != undefined && recipientWhitelist.trim() != "");
  if (whitelistHasSomething) {
    // If whitelist is not empty, use that.
    return recipientWhitelist.trim().split(',');
  }
  const modBlacklist = (await context.settings.get("mod-blacklist")) as string;
  const blacklistHasSomething = (modBlacklist != undefined && modBlacklist.trim() != "");
  if (blacklistHasSomething) {
    // If blacklist is not empty, check that.
    const blacklist = modBlacklist.trim().split(',');
    const filteredMods = await getFilteredMods(blacklist, context);
    return filteredMods;
  }
  else { // If both whitelist and blacklist are empty, get all mods.
    const allMods = await getAllMods(context);
    return allMods;
  }
}

// Helper function for determining if recipient of direct message is valid
function isValidRecipientName(username: string | undefined, subredditName: string) {
  if (username == undefined || username == "")
    return false;
  const knownBots = [ "bot-reply-msg", "AutoModerator", subredditName + "-ModTeam" ];
  return (!knownBots.includes(username));
}

// Helper function to find out if a username is in the list of bots to monitor.
async function usernameInBotList(username: string, context: TriggerContext) {
  const botUsernames = (await context.settings.get("bot-usernames")) as string;
  const botListHasSomething = (botUsernames != undefined && botUsernames.trim() != "");
  var bots: string[] = [];
  if (botListHasSomething)
    bots =  botUsernames.trim().split(',');
  var userIsBot = false;
  for (let i = 0; i < bots.length; i++) {
    const botUsername = bots[i].trim();
    if (username == botUsername) {
      userIsBot = true;
      break;
    }
  }
  return userIsBot;
}

// Helper function to get all mods' usernames.
async function getAllMods(context: TriggerContext) {
  const modListing = context.reddit.getModerators( { subredditName: context.subredditName! } );
  const mods = await modListing.all();
  var modList: string[] = [];
  for (let i = 0; i < mods.length; i++) {
    modList.push(mods[i].username);
  }
  return modList;
}

// Helper function to get a filtered list of mods' usernames using a blacklist.
async function getFilteredMods(blacklist: string[], context: TriggerContext) {
  const modListing = context.reddit.getModerators( { subredditName: context.subredditName! } );
  const mods = await modListing.all();
  var modList: string[] = [];
  // Iterate through each mod.
  for (let i = 0; i < mods.length; i++) {
    const modUsername = mods[i].username;
    // For each mod, compare their username against each username in the blacklist.
    for (let j = 0; j < blacklist.length; j++) {
      const blacklistedUser = blacklist[j].trim();
      // If mod is not blacklisted, add them to the list of recipients.
      if (modUsername != blacklistedUser) {
        modList.push(modUsername);
      }
    }
  }
  return modList;
}

// Helper function for determining if comment author is a moderator
async function userIsMod(username: string, context: TriggerContext) {
  if (username == undefined || username == "")
    return false;
  const subredditName = context.subredditName!;
  if (username == "AutoModerator" || username == (subredditName + "-ModTeam"))
    return true;
  // Base conditions satisfied. Get user object.
  const user = await context.reddit.getUserByUsername(username);
  if (!user) return false; // If user not found, return false.
  const modPermissions = await user.getModPermissionsForSubreddit(subredditName);
  if (!modPermissions) return false; // For no permissions object, return false.
  else if (modPermissions.length < 1) return false; // For no permissions in the object, return false.
  else return true; // Otherwise, it's a mod; return true.
}

async function parentUsernameIsApplicable(parentUsername: string, context: TriggerContext) {
  const subredditName = context.subredditName!;
  // Compare parent author username to ModTeam user and AutoModerator.
  const modTeamEnabled = (await context.settings.get("modteam-enable")) as boolean;
  const parentIsModTeam = (parentUsername == (subredditName + "-ModTeam"));
  const modTeamApplicable = (parentIsModTeam && modTeamEnabled);
  const automodEnabled = (await context.settings.get("automod-enable")) as boolean;
  const parentIsAutomod = (parentUsername == "AutoModerator");
  const automodApplicable = (parentIsAutomod && automodEnabled);
  // Compare parent author username to list of bot usernames.
  const parentInBotList = await usernameInBotList(parentUsername, context);
  // Return true if any of the conditions are applicable.
  return (modTeamApplicable || automodApplicable || parentInBotList);
}

// Helper function for determining if comment author is a moderator
async function userIsModLegacy(username: string, context: TriggerContext) {
  if (username == undefined || username == "")
    return false;
  const subredditName = context.subredditName!;
  if (username == "AutoModerator" || username == (subredditName + "-ModTeam"))
    return false;
  const modList = context.reddit.getModerators({ subredditName: context.subredditName! }!);
  const mods = await modList.all();
  var isMod = false;
  // For each mod in the list, check if their user id matches the comment author's user id.
  for (let i = 0; i < mods.length; i++) {
    if (username == mods[i].username) {
      isMod = true;
      break;
    }
  }
  return isMod;
}

export default Devvit;