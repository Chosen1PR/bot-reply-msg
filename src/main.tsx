// Learn more at developers.reddit.com/docs
import {
  CommentCreate,
  //CommentCreateDefinition,
  CommentDelete,
  Devvit,
  MenuItemOnPressEvent,
  Post,
  //SettingScope,
  TriggerContext,
  //User,
  //useState,
} from "@devvit/public-api";

Devvit.configure({
  redis: true,
  redditAPI: true,
});


Devvit.addSettings([
  {
    type: "group",
    label: "Diverse Comments",
    fields: [
      // Master config flag for enabling comment diversification at all
      {
        type: "boolean",
        name: "enable-diversify",
        label: "Turn on diverse comments",
        helpText:
          "Limits the number of comments a single user can leave on any given post.",
        defaultValue: false,
        scope: "installation",
      },
      // Config setting for flag to diversify all posts
      {
        type: "boolean",
        name: "diversify-all-posts",
        label: "Diversify all posts",
        helpText: "Limits comments for all posts.",
        defaultValue: false,
        scope: "installation", // this can be a string literal 'app' as well
      },
      // Config setting for list of flairs of posts that should have comment diversification enabled
      {
        type: "paragraph",
        name: "diversify-flair-list",
        label: "Flair list",
        helpText:
          'Comma (,) delimited list of flairs (case-sensitive) for posts where you want to limit/diversify comments.\nNOTE: The "Diversify all posts" setting overrides this.',
        defaultValue: "",
        scope: "installation",
      },
      // Config setting for comment limit for comment diversification
      {
        type: "number",
        name: "diversify-comment-limit",
        label: "Comment limit",
        defaultValue: -1,
        helpText:
          "Enter the maximum number of comments you want people to be able to leave on a post. Enter any negative number for no limit, or 0 for no comments (equivalent to locking a post).",
        scope: "installation",
      },
      // Config setting for updating comment count when a user deletes their comments
      {
        type: "boolean",
        name: "update-comment-delete",
        label: "Update with comment deletes",
        defaultValue: true,
        helpText:
          "Update a user's comment count in a post when they delete their comment(s). Turn this off if you think users will abuse this and spend their time deleting and making comments over and over again.",
        scope: "installation",
      },
    ],
  },
  {
    type: "group",
    label: "Comment Pruning",
    fields: [
      // Master config setting for enabling comment pruning
      {
        type: "boolean",
        name: "enable-prune",
        label: "Turn on comment reply tree pruning",
        defaultValue: false,
        helpText: "Limit how long nested comment chains can get.",
        scope: "installation",
      },
      // Config setting for pruning comments in all posts
      {
        type: "boolean",
        name: "prune-all-posts",
        label: "Prune all posts",
        helpText: "Prune new comment trees in all posts.",
        defaultValue: false,
        scope: "installation", // this can be a string literal 'app' as well
      },
      // Config setting for pruning flair list
      {
        type: "paragraph",
        name: "prune-flair-list",
        label: "Flair list",
        helpText:
          'Comma (,) delimited list of flairs (case-sensitive) for posts where you want to prune comment trees.\nNOTE: The "Prune all posts" setting overrides this.',
        defaultValue: "",
        scope: "installation",
      },
      {
        type: "number",
        name: "prune-comment-limit",
        label: "Comment limit",
        helpText:
          "Enter the maximum length that comment reply trees can reach. Enter any negative number for no limit, 0 for no comments (equivalent to locking a post), or 1 for only top-level comments.",
        defaultValue: -1,
        scope: "installation",
      },
    ],
  },
  // Config setting for PMing a user when their comment is removed
  {
    type: "boolean",
    name: "pm-user",
    label: "Message users regarding comment removal",
    defaultValue: false,
    helpText:
      "Message users privately from the bot account (not modmail) when their comment has been removed and explain why.",
    scope: "installation",
  },
  // Config setting for exempting moderators to all rules
  {
    type: "boolean",
    name: "mods-exempt",
    label: "Moderators exempt",
    defaultValue: true,
    helpText:
      "Disable for testing, but most mods should leave this enabled.",
    scope: "installation",
  },
]);

// Pop-up form for disabling comment diversification on a post
const disableDiversifyForm = Devvit.createForm({
  title: 'Success!',
  description: "Comment diversification is now not forced on this specific post, but if diversification is on for all posts"
    + " or for posts with this post's flair, comments in this post will still be diversified."
    + " Please check your config settings for more details.",
  fields: [],
  acceptLabel: 'Ok',
  cancelLabel: 'Cancel',
}, values => { });

// Pop-up form for disabling comment pruning on a post
const disablePruneForm = Devvit.createForm({
  title: 'Success!',
  description: "Comment pruning is now not forced on this specific post, but if pruning is on for all posts"
    + " or for posts with this post's flair, comments in this post will still be pruned."
    + " Please check your config settings for more details.",
  fields: [],
  acceptLabel: 'Ok',
  cancelLabel: 'Cancel',
}, values => { });

// Pop-up form for managing diverse comments on a post
const manageDiversifyForm = Devvit.createForm(
  (data) => (
    {
      title: 'Manage Diverse Comments',
      fields: [
      {
        type: 'boolean',
        name: 'diversifyThisPost',
        label: 'Diversify this post',
        defaultValue: data.diversifyThisPost,
        helpText: `Controls the active state of whether or not to diversify comments on this specific post`
          + `. NOTE: Even if this setting is off, comments may still be diversified if "Diversify all posts" is on`
          + ` or if diversification is enabled for all posts with this post's flair.`,
      }
    ],
    acceptLabel: 'Submit',
    cancelLabel: 'Cancel',
  }),
  async (event, context) => {
    const postId = context.postId!;
    const key = getKeyForDiversifyPosts(postId);
    if (event.values.diversifyThisPost) {
      await context.redis.set(key, "1");
      context.ui.showToast({
        text: "Success! Comment diversification is now enabled on this post.",
        appearance: "success",
      });
    }
    else {
      await context.redis.del(key, "1");
      context.ui.showForm(disableDiversifyForm);
    }
  }
);

// Pop-up form for managing pruning comments on a post
const managePruneForm = Devvit.createForm(
  (data) => (
    {
      title: 'Manage Comment Pruning',
      fields: [
      {
        type: 'boolean',
        name: 'pruneThisPost',
        label: 'Prune this post',
        defaultValue: data.pruneThisPost,
        helpText: `Controls the active state of whether or not to prune comments on this specific post`
          + `. NOTE: Even if this setting is off, comments may still be pruned if "Prune all posts" is on`
          + ` or if pruning is enabled for all posts with this post's flair.`,
      }
    ],
    acceptLabel: 'Submit',
    cancelLabel: 'Cancel',
  }),
  async (event, context) => {
    const postId = context.postId!;
    const key = getKeyForPrunePosts(postId);
    if (event.values.pruneThisPost) {
      await context.redis.set(key, "1");
      context.ui.showToast({
        text: "Success! Comment pruning is now enabled on this post.",
        appearance: "success",
      });
    }
    else {
      await context.redis.del(key, "1");
      context.ui.showForm(disablePruneForm);
    }
  }
);

// Button on posts to manage comment limiting/diversification
Devvit.addMenuItem({
  label: "Manage Diverse Comments",
  location: "post", // can also be 'comment' or 'subreddit'
  forUserType: "moderator",
  onPress: async (event, context) => {
    const diversifyEnabled = await context.settings.get("enable-diversify")!; //check if diversification enabled
    const diversifyAllPosts = await context.settings.get("diversify-all-posts"); //check if enabled for all posts
    const diversifyLimit = await context.settings.get("diversify-comment-limit");
    const diversifyLimitIsValid = commentLimitIsValid(diversifyLimit); //check if diversify comment limit is valid

    if (!diversifyEnabled) {
      context.ui.showToast({
        //text: `Value of diversifyEnabled is: ${diversifyEnabled}`,
        text: "Please enable comment diversification in the config settings for this app.",
        appearance: "neutral",
      });
    } else if (diversifyAllPosts) {
      context.ui.showToast({
        //text: `Value of diversifyAllPosts is: ${diversifyAllPosts}. diversifyEnabled`,
        text: "Comment diversification is already enabled for all posts.",
        appearance: "neutral",
      });
    } else if (!diversifyLimitIsValid) {
      context.ui.showToast({
        //text: `Value of diversifyLimit is: ${diversifyLimit}. Is valid? ${diversifyLimitIsValid}`,
        text: "The comment limit in this app's config settings does not allow for diverse comments.",
        appearance: "neutral",
      });
    } else {
      const isDiversified = await isDiversifyOnForThisPost(context);
      context.ui.showForm(manageDiversifyForm, { diversifyThisPost: isDiversified })
    }
  },
});

// Button on posts to manage comment pruning
Devvit.addMenuItem({
  label: "Manage Comment Pruning",
  location: "post", // can also be 'comment' or 'subreddit'
  forUserType: "moderator",
  onPress: async (event, context) => {
    const pruneEnabled = await context.settings.get("enable-prune")!; //check if pruning enabled
    const pruneAllPosts = await context.settings.get("prune-all-posts"); //check if enabled for all posts
    const pruneLimit = await context.settings.get("prune-comment-limit");
    const pruneLimitIsValid = commentLimitIsValid(pruneLimit); //check if prune comment limit is valid

    if (!pruneEnabled) {
      context.ui.showToast({
        //text: `Value of pruneEnabled is: ${pruneEnabled}`,
        text: "Please enable comment pruning in the config settings for this app.",
        appearance: "neutral",
      });
    } else if (pruneAllPosts) {
      context.ui.showToast({
        //text: `Value of pruneAllPosts is: ${pruneAllPosts}. pruneEnabled`,
        text: "Comment pruning is already enabled for all posts.",
        appearance: "neutral",
      });
    } else if (!pruneLimitIsValid) {
      context.ui.showToast({
        //text: `Value of pruneLimit is: ${pruneLimit}. Is valid? ${pruneLimitIsValid}`,
        text: "The comment limit in this app's config settings is does not allow for pruning comments.",
        appearance: "neutral",
      });
    } else {
      const isPruned = await isPruningOnForThisPost(context);
      context.ui.showForm(managePruneForm, { pruneThisPost: isPruned })
    }
  },
});

// Form that links to app settings page
const settingsForm = Devvit.createForm(
  {
    title: 'Manage Diverse Comments',
    description: `If you notice any issues with a particular post, try uninstalling and reinstalling the app to clear its data.`
      + ` Change the settings below or cancel to close this pop-up.`,
    fields: [],
    acceptLabel: 'Settings',
    cancelLabel: 'Cancel',
  },
  async (event, context) => {
    const subredditName = context.subredditName!;
    context.ui.navigateTo(`https://developers.reddit.com/r/${subredditName}/apps/diverse-comments`);
  }
);

// Button for settings form
Devvit.addMenuItem({
  label: "Diverse Comments",
  location: "subreddit", // can also be 'comment' or 'subreddit'
  forUserType: "moderator",
  onPress: async (event, context) => {
    context.ui.showForm(settingsForm);
  },
});

// Diversify comments: comment trigger handler
Devvit.addTrigger({
  event: "CommentCreate",
  onEvent: async (event, context) => {
    //console.log(`A new comment was created: ${JSON.stringify(event)}`);
    const userId = event.author?.id!;
    const isMod = await authorIsMod(userId, context);
    const modsExempt = await context.settings.get("mods-exempt");
    //check if comment author is a mod and exempt them if the config setting is checked
    const passedModCheck = !(isMod && modsExempt);
    //if (!passedModCheck)
    //  return;
    const diversifyEnabled = await context.settings.get("enable-diversify")!; //check if diversification enabled
    // Beginning of temporary variables that will be needed if PM is sent to user
    var commentRemoved = false;
    var commentRemovedReason = "";
    var commentLimit = 0;
    var forAllPosts = false;
    var forThisPostFlair = false;
    var forThisPost = false;
    // End of temporary variables that will be needed if PM is sent to user
    
    if (diversifyEnabled) {
      const diversifyLimit = await context.settings.get("diversify-comment-limit");
      const diversifyLimitIsValid = commentLimitIsValid(diversifyLimit); //check if diversify comment limit is valid
      if (diversifyLimitIsValid) {
        //////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////// Code for diversifying comments starts here /////////////////////////
        //////////////////////////////////////////////////////////////////////////////////////////////
        commentLimit = Number(diversifyLimit);
        const diversifyAllPosts = await context.settings.get("diversify-all-posts")!; //check if enabled for all posts
        forAllPosts = Boolean(diversifyAllPosts);
        const postId = event.post?.id!;
        const diversifyMatches = await context.redis.exists(
          getKeyForDiversifyPosts(postId)
        );
        forThisPost = diversifyMatches > 0; //check if manually enabled for this specific post
        const commentId = event.comment?.id!;

        //If not enabled for all posts and not enabled manually for this specific post, then check post flair.
        forThisPostFlair = false;
        if (!forAllPosts && !forThisPost) {
          const flair = event.post?.linkFlair?.text ?? "";
          const flairListTemp = await context.settings.get("diversify-flair-list");
          const flairList = flairListTemp?.toString() ?? "";
          forThisPostFlair =
            flair != "" && flairList != "" && containsFlair(flair, flairList);
          //console.log(`forThisPostFlair is ${forThisPostFlair} for flair ${flair} and flairList ${flairList}`);
        }
        // If everything looks good, this is where comment limiting/diversification begins
        if (forAllPosts || forThisPost || forThisPostFlair) {
          // Step 1: Get user's comment count in post.
          const key = getKeyForComments(postId); //key is comments:<postId>, field is userId
          const commentCount = await getAuthorsCommentCountInPost(
            key,
            userId,
            postId,
            context
          );
          // Step 2: If user is over limit, remove comment.
          if (commentCount >= commentLimit && passedModCheck) { // Mod check here will depend on the "mods exempt" config setting.
            await context.reddit.remove(commentId, false);
            commentRemoved = true;
            commentRemovedReason = "diversify";
          }
          // Step 3: Increment user's comment count in post.
          await context.redis.hIncrBy(key, userId, 1);
          // Even if this comment was removed in Step 2, any new comments will still increment the comment count for this user.
          // For the count to be decremented, the user must delete their comment and "update with comment deletes" must be enabled.
        }
      }
    }
    const pruneEnabled = await context.settings.get("enable-prune")!; //check if pruning enabled
    if (pruneEnabled && !commentRemoved) {
      const pruneLimit = await context.settings.get("prune-comment-limit");
      const pruneLimitIsValid = commentLimitIsValid(pruneLimit); //check if diversify comment limit is valid
      if (pruneLimitIsValid) {
        /////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////// Code for pruning comments starts here /////////////////////////
        /////////////////////////////////////////////////////////////////////////////////////////
        commentLimit = Number(pruneLimit);
        const pruneAllPosts = await context.settings.get("prune-all-posts")!; //check if enabled for all posts
        forAllPosts = Boolean(pruneAllPosts);
        const postId = event.post?.id!;
        const pruneMatches = await context.redis.exists(getKeyForPrunePosts(postId));
        forThisPost = pruneMatches > 0; //check if manually enabled for this specific post
        const commentId = event.comment?.id!;

        //If not enabled for all posts and not enabled manually for this specific post, then check post flair.
        forThisPostFlair = false;
        if (!forAllPosts && !forThisPost) {
          const flair = event.post?.linkFlair?.text ?? "";
          const flairListTemp = await context.settings.get("prune-flair-list");
          const flairList = flairListTemp?.toString() ?? "";
          forThisPostFlair =
            flair != "" && flairList != "" && containsFlair(flair, flairList);
          //console.log(`forThisPostFlair is ${forThisPostFlair} for flair ${flair} and flairList ${flairList}`);
        }
        // If everything looks good, this is where comment pruning begins
        if (forAllPosts || forThisPost || forThisPostFlair) {
          var counter = 1;
          var id = event.comment?.parentId!;
          // Keep getting parent IDs until you get to "t3_[whatever]" which indicates the parent post,
          // or until you get to the installation's prune limit.
          while (id.startsWith("t1_") && counter <= commentLimit) {
            const comment = await context.reddit.getCommentById(id)!;
            id = comment.parentId;
            counter++;
          }
          // If the limit of comment tree growth has been reached, remove comment
          if (counter > commentLimit && passedModCheck) { // Mod check here will depend on the "mods exempt" config setting.
            context.reddit.remove(commentId, false);
            commentRemoved = true;
            commentRemovedReason = "prune";
          }
        }
      }
    }
    if (commentRemoved) {
      // Optional: inform user via PM that they have reached the limit.
      const pmUserSetting = await context.settings.get("pm-user")!;
      if (pmUserSetting) {
        const subredditName = event.subreddit?.name!;
        //const postTitle = event.post?.title!;
        const postLink = event.post?.permalink!;
        const commentLink = event.comment?.permalink!;
        var reason = getReasonForRemoval(commentRemovedReason, commentLimit);
        reason += getReasonScope(forAllPosts, forThisPostFlair, forThisPost);
        pmUser(userId, subredditName, commentLink, postLink, reason, context);
      }
      return;
    }
  },
});

// Update comment count on delete only if the config setting says so
Devvit.addTrigger({
  event: "CommentDelete",
  onEvent: async (event, context) => {
    //console.log(`A new comment was deleted: ${JSON.stringify(event)}`);
    
    const diversifyEnabled = await context.settings.get("enable-diversify")!; //check if diversification enabled
    if (!diversifyEnabled)
      return; // If not enabled, don't do anything.
    const updateDelete = await context.settings.get("update-comment-delete"); //check if update with delete enabled
    if (!updateDelete)
      return; // If not enabled, don't do anything.
    const eventSource = event.source;
    const source = eventSource.valueOf(); // 3 = mod; 2 = admin; 1 = user; 0 = unknown; -1 = unrecognized
    if (source != 1)
      return; // If a comment was not deleted by its author, don't do anything.

    // If we got here, then comment diversification is enabled and "update with comment delete" is enabled.
    const userId = event.author?.id!;
    //const isMod = await authorIsMod(userId, context);
    //const modsExempt = await context.settings.get("mods-exempt");
    //check if comment author is a mod and exempt them if the config setting is checked
    //if (isMod && modsExempt)
    //  return;
    const diversifyLimit = await context.settings.get("diversify-comment-limit");
    const diversifyLimitIsValid = commentLimitIsValid(diversifyLimit); //check if diversify comment limit is valid
    if (!diversifyLimitIsValid) // If not valid, don't do anything.
      return;
    // If we got here, then comment diversification is enabled and "update with comment delete" is enabled.
    // It's not necessary to check if diversification is enabled for this post, because even if it's not,
    // then we only make one redis call which will return nothing, and no action will be taken.
    const postId = event.postId!;
    const key = getKeyForComments(postId); //key is comments:<postId>
    const countString = await context.redis.hGet(key, userId) ?? ""; // Look up user's comment count in this post
    if (countString != "") { // If user has a comment count in this post, update it.
      const commentCount = Number(countString);
      if (commentCount == 1) // If this was the last comment, delete the redis hash for this user.
        await context.redis.hDel(key, [userId]);
      else if (commentCount > 1) // If there are more comments, just decrement the count by 1.
        await context.redis.hIncrBy(key, userId, -1);
    }
  },
});

// Helper function to get key for redis hash that handles comments on posts
function getKeyForComments(postId: string) {
  return `comments:${postId}`;
}

// Alternative helper function for redis key-value pair that handles comments on posts
function getKeyForComments2(postId: string, userId: string) {
  return `${postId}:${userId}`;
}

// Helper function for redis key-value pair that handles manual post diversification
function getKeyForDiversifyPosts(postId: string) {
  return `diversify:${postId}`;
}

// Helper function for redis key-value pair that handles manual post pruning
function getKeyForPrunePosts(postId: string) {
  return `prune:${postId}`;
}

// Helper function that tells you if the current comment limit in the config settings is even valid
function commentLimitIsValid(commentLimit: string | number | boolean | string[] | undefined) {
  return (
    commentLimit != undefined &&
    !Number.isNaN(commentLimit) &&
    Number(commentLimit) >= 1
  );
}

// Helper function for getting user's comment count
async function getAuthorsCommentCountInPost(
  key: string,
  userId: string,
  postId: string,
  context: TriggerContext
) {
  var countString = (await context.redis.hGet(key, userId)) ?? "";
  if (countString == "") {
    // User hasn't commented here before. Adding redis hash with comment count of 0.
    countString = "0";
    await context.redis.hSet(key, { userId: countString });
  }
  const commentCount = Number(countString);
  return commentCount;
}

// Helper function to PM a user when their comment is removed
async function pmUser(
  userId: string,
  subredditName: string,
  commentLink: string,
  postLink: string,
  reason: string,
  context: TriggerContext
) {
  const subjectText = `Your comment in r/${subredditName} was removed`;
  var messageText = `Hi, [your comment](${commentLink}) in [this post](${postLink}) was removed due to the following reason:\n\n`;
  const commentCountDisclaimer = `\n\nTo reduce your comment count so it is once again under the limit, you can delete your comment(s).`;
  const inboxDisclaimer = `\n\n*This inbox is not monitored. If you have any questions, please message the moderators of r/${subredditName}.*`;
  if (reason.startsWith("- This subreddit has limited the total number"))
    messageText = messageText + reason + commentCountDisclaimer + inboxDisclaimer;
  else // any other reason besides diversify
    messageText = messageText + reason + inboxDisclaimer;
  const thisUser = await context.reddit.getUserById(userId);
  const username = thisUser?.username;
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
      console.log(`Error sending PM to user ${username}: ${error}`);
    }
  }
  else {
    console.log(`Error: User with ID ${userId} not found. Cannot send PM.`);
  }
}

// Helper function for verifying if post flair is included in the list of flairs in the config settings
function containsFlair(flair: string, flairList: string) {
  flair = flair.trim(); //trim unneeded white space
  var flairs = flairList.split(","); //separate flairs in list
  for (let i = 0; i < flairs.length; i++) {
    flairs[i] = flairs[i].trim(); //for each flair in the list, trim white space as well
    if (flairs[i] == flair) //check if flairs match
      return true;
  }
  //reached end of list, no match
  return false;
}

// Helper function for determining if comment author is a moderator
async function authorIsMod(userId: string, context: TriggerContext) {
  const subreddit = await context.reddit.getCurrentSubredditName()!;
  const modList = context.reddit.getModerators( { subredditName: subreddit }!);
  const mods = await modList.all();
  var isMod = false;
  //for each mod in the list, check if their user id matches the comment author's user id
  for (let i = 0; i < mods.length; i++) {
    const modId = mods[i].id;
    if (userId==modId) {
      isMod = true;
      break;
    }
  }
  return isMod;
}

// Helper function to get reason for why a comment was removed
function getReasonForRemoval(reasonWord: string, commentLimit?: number) {
  var reason = "";
  if (reasonWord=="diversify") {
    reason += "- This subreddit has limited the total number of comments a single user can leave on a post";
    if (commentLimit!=undefined)
      reason += ` to ${commentLimit}.`;
    else reason += ".";
  }
  else if (reasonWord=="prune") {
    reason += "- This subreddit has limited the length of comment reply chains";
    if (commentLimit!=undefined)
      reason += ` to ${commentLimit}.`;
    else reason += ".";
  }
  return reason;
}

// Helper function to get the full text for which post(s) the comment removal reason applies
function getReasonScope(
  forAllPosts: boolean,
  forThisPostFlair: boolean,
  forThisPost: boolean
) {
  var scope = "";
  if (forAllPosts)
    scope +=
      " Currently, this limit applies across all posts in the subreddit.";
  else if (forThisPostFlair)
    scope +=
      " Currently, this limit applies across all posts with this post's flair.";
  else if (forThisPost)
    scope +=
      " Currently, this limit applies on this specific post, but not necessarily *only* this post.";
  return scope;
}

async function isDiversifyOnForThisPost(context: Devvit.Context) {
  const postId = context.postId!;
  const key = getKeyForDiversifyPosts(postId);
  const matches = await context.redis.exists(key);
  return matches > 0;
}

async function isPruningOnForThisPost(context: Devvit.Context) {
  const postId = context.postId!;
  const key = getKeyForPrunePosts(postId);
  const matches = await context.redis.exists(key);
  return matches > 0;
}

export default Devvit;