# AI Open Source Capstone: Prework

This is the prework for CodePath's Advanced AI Engineering Open Source Capstone course. 

As part of this course, you will learn many tips and tricks to use AI with large and complex codebases. 

This prework, will get you started with AI-enabled open source workflows utilizing popular AI coding IDEs/text editors and walk you through building the real-time multiplayer game below in about 30 minutes.

![mmorpg.gif](./mmorpg.gif)

## Instructions

1. Set up an AI-native text editor or IDE: We recommend: [Cursor](https://cursor.com/students), but you can also use VSCode augmented with [Claude Code](https://www.claude.com/product/claude-code) or [Github Copilot](https://docs.github.com/en/copilot/how-tos/manage-your-account/get-free-access-to-copilot-pro)
2. This repository has [4 milestone issues](https://github.com/codepath/ai_open_source_prework/issues) for you to solve. Take a look at them on the Github.
3. To complete this assignment:
    1. [Fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo) your own copy of the prework repo 
    2. Clone the repo to your computer and solve the [4 issues](https://github.com/codepath/ai_open_source_prework/issues) (you are allowed / expected to use AI support for this task) 
    3. Push your completed code to Github and submit your completed repo with all solved issues [here](https://apply.codepath.org/cohorts/2025-ai-open-source-capstone/application/prework)
    4. (Optional but highly encouraged): [Create a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork) on the main repo with your changes

## Getting Started

Watch the 5 minute introduction video below for a quick getting started walkthrough.
[<img src="https://cdn.loom.com/sessions/thumbnails/b045fd05b3bf451e90fdae110b73f9a8-a647d9aa501b3cce-full-play.gif">](https://www.loom.com/share/b045fd05b3bf451e90fdae110b73f9a8?t=27)

**With everything you’ve seen so far you should be able to attempt your submissions 🚀** 

If you need additional help completing the milestones checkout our support steps and example prompts for each below:

## Milestone 0: Installation

Fortunately, Cursor Pro is free for university students for 1 year, which includes access to Claude.

[Install Cursor here](https://cursor.com/students) with your edu email.

While you're waiting for your edu verification, you can use the free version of Cursor. The free version comes with 2 weeks of extended token limits, then it starts to restrict your tokens.

## Milestone 1: Displaying the map

Check out the issue [here](https://github.com/codepath/ai_open_source_prework/issues/8)

1. Use the prompt below to implement the map.

> I want to start building the game client described in the README.
> 
> 
> Let's start by creating index.html and a CSS file that displays the world map. The world map image should be displayed in actual size, with no scaling. We should see the upper left of the map, so that it matches with the world’s coordinate system. Implement using a canvas, the map should fill the browser window.
> 
1. Open index.html in Chrome and confirm that you can see the top left of the map.

## Milestone 2: Joining the server

Check out the issue [here](https://github.com/codepath/ai_open_source_prework/issues/9)

1. Use the prompt below to join the server and draw your avatar. In the prompt, replace with your name.

> Next, I want to connect to the game server. In the README, it says that we send a join game message, and the server will give us a player id, an avatar, and a random starting position, and the list of all current player positions and avatar images.
> 
> 
> For this milestone, I just want to display my own avatar, named “Tim”. Avatars should have a label for their username.
> 
> My avatar should be in the middle of the browser window. Based on that centering, we should shift the viewport. However, don’t show past the edge of the map.
> 
> The avatar should be rendered using the images returned from the server, respecting aspect ratio and size, and drawing should be efficient to display many players.
> 
> Can you talk through your plan first?
> 
1. Open index.html and verify that you can see your avatar centered on the screen. Try reloading, your starting position should change with each reload.
    - If you don't see your avatar on the map, describe what you're seeing to Cursor.
    - Hint: if the map is changing position on reload, tell that to Cursor. That means the server connection is succeeding, and you're getting a starting coordinate.
    - AI still isn't great at fixing bugs. Using a prompt like this helps: **"Walk through the expected code path step-by-step, and talk through possible issues."**
2. After it's working, understand the code with a prompt like this:

> Walk me through some of the key code changes, step by step. I don’t want to be overwhelmed, so present it part by part, and I may ask questions, then let you know when I’m ready for the next part.
> 

## Milestone 3: Adding player movement

Check out the issue [here](https://github.com/codepath/ai_open_source_prework/issues/10)

1. Add the ability to move your avatar with your arrow keys using the prompt below.

> I want to add the ability to move my avatar using the arrow keys. Holding down the arrow keys should move the player continuously, and don’t rate limit the move commands. Send one move command per key down event. Can you talk through your plan first?
> 
1. As always, review the generated code with a prompt like this:

> Walk me through some of the key code changes, step by step. I don’t want to be overwhelmed, so present it part by part, and I may ask questions, then let you know when I’m ready for the next part.
> 

## Milestone 4: Viewing all players

Check out the issue [here](https://github.com/codepath/ai_open_source_prework/issues/11)

1. By this time, you might already be able to see other players moving around. The server has some AI characters walking around. If you don't, let cursor know.

> I want to be able to see other players moving around.
> 

## Milestone 5: Have some fun!

Refine the behaviors, add features, or improve the UI. Claude is not bad at generating standard and common game UI.

## Submission
Push your completed code to Github and submit your completed repo with all solved issues [here](https://apply.codepath.org/cohorts/2025-ai-open-source-capstone/application/prework)

(Optional but highly encouraged): [Create a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork) on the main repo with your changes
