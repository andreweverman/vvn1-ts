/**
 * 
 *  Defining some commonly used numbers and strings
 * 
 * @file   Defining common numbers and strings
 * @author Andrew Everman.
 * @since  15.10.2020
 */

export enum NumberConstants {
    secs = 1000,
    mins = secs * 60,
    hours = mins * 60,
    days = hours*24
}

export const quit = 'quit'
export const valid = 'valid'
export const messageCollectorTimeout = 'time'
export const extraStringOption = 'extraStringOption'
export const vote = 'vote'
export const ready = 'ready'

export const movieChannelAlias = 'movie'
export const movieCountdownName = 'movie_countdown'
export const movieTimeName = 'movie_time'

export const readyEmojiName = 'ready'
export const willWatchEmojiName = 'will_watch'


export const keywords = [
    'me',
    'us',
    'them',
    'i',
    'you',
    'we',
    'they',
    'it',
    'him',
    'her',
    'she',
    'he',
    'not',
    'but',
    'everyone',
    'here',
    'quit',
]

export const selfPronouns = ['me', 'it']

export const groupPronouns = ['everyone', 'us', 'we']
