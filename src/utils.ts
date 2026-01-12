import {
  TriggerContext,
} from "@devvit/public-api";

// Main function to message mods if a user replied to a bot.
export async function messageModsIfBotReply(authorName: string, parentId: string, commentLink: string, context: TriggerContext) {
  var parentAuthor = "";
  if (parentId.startsWith("t3_")) { // Parent is a post.
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
    await pmMod(
      recipients[i].trim(), // Recipient username from list
      authorName, // Comment author's username
      parentAuthor, // Parent author (bot) username.
      context.subredditName!, // Current subreddit
      commentLink, // Comment link
      context); // Current TriggerContext
  }
}

// Main function to message user if they replied to a bot.
export async function messageUserIfBotReply(authorName: string, parentId: string, commentLink: string, context: TriggerContext) {
  const unformattedSubject = (await context.settings.get("subject-to-user")) as string ?? "";
  const unformattedMessage = (await context.settings.get("message-to-user")) as string ?? "";
  if (unformattedSubject.trim() == "" || unformattedMessage.trim() == "") return; // If subject or message is blank, do nothing.
  var parentAuthor = "";
  if (parentId.startsWith("t3_")) { // Parent is a post.
    const parentPost = await context.reddit.getPostById(parentId)!;
    parentAuthor = parentPost.authorName;
  }
  else { // Parent is a comment (starts with "t1_").
    const parentComment = await context.reddit.getCommentById(parentId)!;
    parentAuthor = parentComment.authorName;
  }
  // // If parent isn't applicable bot, do nothing.
  if (!(await parentUsernameIsApplicable(parentAuthor, context))) return;
  // All conditions met. Send PM to user.
  // Replace placeholders in subject and message.
  const subredditName = context.subredditName!;
  const subjectText = unformattedSubject
    .replace(/\{bot\}/g, parentAuthor)
    .replace(/\{subreddit\}/g, subredditName);
  const messageText = unformattedMessage
    .replace(/\{bot\}/g, parentAuthor)
    .replace(/\{user\}/g, authorName)
    .replace(/\{subreddit\}/g, subredditName)
    .replace(/\{comment_link\}/g, commentLink);
  await pmUser(authorName, subjectText, messageText, subredditName, context);
}

// Helper function to PM a mod about comment replies.
export async function pmMod(
  recipientUsername: string,
  authorUsername: string,
  botUsername: string,
  subredditName: string,
  commentLink: string,
  context: TriggerContext
) {
  //console.log("Recipient: " + recipientUsername);
  //console.log("Author: " + authorUsername);
  //console.log("Bot: " + botUsername);
  //console.log("Subreddit: " + subredditName);
  //console.log("Link: " + commentLink);
  if (!isValidRecipientName(recipientUsername, subredditName, context.appName))
    return; // If recipient is undefined, blank, this app, or a known bot, do nothing.
  const subjectText = `Someone replied to a bot in r/${subredditName}.`;
  var messageText = `u/${authorUsername} replied to u/${botUsername}.` +
    `\n\n- [**Comment Link**](${commentLink})` +
    `\n\n---\n\n[App Settings](https://developers.reddit.com/r/${subredditName}/apps/${context.appName})`;
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

// Helper function to PM a user about comment replies.
export async function pmUser(
  username: string,
  subjectText: string,
  messageText: string,
  subredditName: string,
  context: TriggerContext
) {
  if (!isValidRecipientName(username, subredditName, context.appName))
    return; // If recipient is undefined, blank, this app, or a known bot, do nothing.
  messageText += `\n\n---\n\n*Do not reply; this inbox is not monitored.*`;
  if (username) {
    // If you want to send a PM as the subreddit, uncomment the line below and comment out the next line
    //await context.reddit.sendPrivateMessageAsSubreddit({
    try {
      await context.reddit.sendPrivateMessage({
        subject: subjectText,
        text: messageText,
        to: username,
        //fromSubredditName: subredditName,
      });
    } catch (error) {
      if (error == "NOT_WHITELISTED_BY_USER_MESSAGE")
        console.log(`Error: u/${username} likely has messaging disabled.`);
      else console.log(`Error sending PM to user ${username}: ${error}`);
    }
  }
  else {
    console.log(`Error: User not found.`);
  }
}

// Helper function for getting recipients for PM
export async function getRecipients(context: TriggerContext) {
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
function isValidRecipientName(username: string | undefined, subredditName: string, appName: string) {
  if (username == undefined || username == "")
    return false;
  const knownBots = [ appName, "AutoModerator", subredditName + "-ModTeam" ];
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
export async function userIsMod(username: string, context: TriggerContext) {
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

// Helper function to determine if parent author is applicable bot
export async function parentUsernameIsApplicable(parentUsername: string, context: TriggerContext) {
  const subredditName = context.subredditName!;
  // Compare parent author username to ModTeam user and AutoModerator.
  const modTeamEnabled = (await context.settings.get("send-for-modteam")) as boolean;
  const parentIsModTeam = (parentUsername == (subredditName + "-ModTeam"));
  const modTeamApplicable = (parentIsModTeam && modTeamEnabled);
  const automodEnabled = (await context.settings.get("send-for-automod")) as boolean;
  const parentIsAutomod = (parentUsername == "AutoModerator");
  const automodApplicable = (parentIsAutomod && automodEnabled);
  // Compare parent author username to list of bot usernames.
  const parentInBotList = await usernameInBotList(parentUsername, context);
  // Return true if any of the conditions are applicable.
  return (modTeamApplicable || automodApplicable || parentInBotList);
}