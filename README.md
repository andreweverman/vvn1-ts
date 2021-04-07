[![Build Status](https://travis-ci.com/andreweverman/vvn1-ts.svg?token=d54KyybAaqRxeqHK3Bso&branch=main)](https://travis-ci.com/andreweverman/vvn1-ts)
# vvn1

## A discord bot for cleaning messages, moving users, creating static links, and watching movies together.

The aim of this bot is to be a configurable way to share information with each other.

## Current Features

### Alias
#### Create names for your users and channels to quickly use them with the other commands that vvn1 offers.
##### Ex. If I were to have set a user alias to 'andrew' and a voice channel to 'main', then the move command ?move andrew main would move the user andrew to the main voice channel. 

### Movement Commands
#### As alluded to earlier, there are various commands for moving users
* Move: Move 1 or more users based on created aliases
* Shake: Move a user repeatedly to make sound if they are deafened to see if they are available
* Partyover: Move all the users in some non-main voice channel to the main voice channels
  
### Links

#### The links functionality allows the user to create a dynamically named command to use a link. Two types of links:
* Link: The bot will just post whatever link is provided on setup in the voice channel. Great for services like [Watchtogether](https://w2g.tv) and can be used for anything your server commonly uses a static link for. For example, I have ?wt as our Watchtogher room link. Whenever a group of people want to watch a youtube video together, invoking ?wt gives the link conveniently.
* Clip: The bot will play the audio of a youtube video in the voice channel that the command invoker is in. This is not meant to be a music bot, but to be able to save certain audio clips to a name. This is meant to be more of a soundboard type use, but feel free to use as you wish.

### Movie
* Manage various movies and their links
* Request for movies to be downloaded
* Indicate interest in watching specific movies with the watchlist
* Watch Movie: Create an event for watching a movie. Specify the movie or leave it up to your friends and vote for movies. Specify the time and day (editable later). Automatically moves users to dedicated movie channel and synchronize the start time with audio sounds and ready checks. 
* For Premium Servers - Download: Have vvn1 download a given magnet link and upload it to Mega

### Auto-Deleting
#### Remove clutter from your voice channel by using vvn1. Configure certain command prefixes or full commands to auto-delete after a specified time. Can also configure certain bot users to have all of their messages deleted after a specified time.

### Other

* Configure the command prefix for the server
* Set server time zone (for watching movies currently)
* Message Archive: Archive all messages in a single channel. This can help see if someone says something they shouldn't and it can be logged.

### In Progress
Currently working on professionalizing existing code 
* Getting back the amount of testing we had on the pure javascript version
* Letterboxd account integration
