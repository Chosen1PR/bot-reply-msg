## Features

This app allows moderators to limit comments on posts in two distinct ways.

- Limit how many comments a single user can leave on a specific post. Doing this can lead to a more diverse variety of comments, since they won't all be coming from the same people.
- Limit how many comments can be on a comment reply chain. This chops off or "prunes" the end of comment trees once the limit has been reached.
- Configure comment removal for all posts, no posts, individual posts, or posts with a specific post flair.
- Configure whether or not to message users privately from the bot account (not modmail) when their comment is removed and explain why.

---

## Changelog

### [0.0.29] (2025-11-22)

#### Features

- Added a proper link to the config settings from the subreddit-level menu item.
- Migrated application to Devvit Web.

### [0.0.23] (2025-08-19)

#### Bug Fixes

- Fixed a bug where the PM wasn't being sent to the user even if the config setting was enabled.
- Fixed a bug where comment deletes by users were being combined with comment removals from mods, negatively affecting comment tracking. Now, a comment removal will not decrease that user's comment count; it will only decrease if the user deletes their own comment.

### [0.0.21] (2025-08-06)

#### Bug Fixes

- Re-engineered the app to reference a user's "user ID" (a unique hidden identifier) rather than their username. This solves some edge cases where a user might change their username after their account is created.
- Fixed a bug where the app wasn't properly keeping track of new comments and deleted comments when diversification was enabled.
- Fixed a bug where some settings for comment pruning were dependent on the settings for diversification.
- Tweaked how the "mods exempt" setting works to improve the testing experience for mods.

### [0.0.18] (2025-07-20)

#### Bug Fixes

- Fixed a bug where a post was not being diversified/pruned even if its post flair had a match in the config's flair list.

### [0.0.17] (2025-06-25)

- Updated to use new Devvit platform version 0.11.17. No new features or bug fixes.

### [0.0.16] (2025-06-10)

#### Features

- Tidied up the menu items on a post. Now there are only 2 instead of 4: Manage Diverse Comments and Manage Comment Pruning.
- The menu items now show a pop-up where you can change whether or not diversifying or pruning is enabled on a specific post.
- A more detailed message now appears when these pop-ups show up and when diversifying or pruning is disabled per post. The message explains that even though it can look "turned off" for an individual post, comments will still be removed if diversification/pruning is turned on for all posts or for posts with a specific flair.

### [0.0.9] (2025-06-08)

#### Features

- Now sends users a PM with their comment's permalink and the post's permalink instead of the post title.

### [0.0.8] Initial version (2025-06-07)

#### Features

- Limit how many comments a single user can leave on any given post.
- Limit how many comments can be on a comment reply chain.
- Configure for all posts, no posts, individual posts, or posts with a specific post flair.
- Option to PM users when their comment is removed and explain why.

#### Bug Fixes

None yet (initial version). Please send a private message to the developer (u/Chosen1PR) to report bugs.