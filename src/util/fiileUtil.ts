/**
 *
 *  Utility for file related things
 *
 *  This file is mainly for outsourcing the file gathering type functions
 *
 * @file   Defining common file related functions
 * @author Andrew Everman.
 * @since  15.10.2020
 */

import path from 'path'
import walk from 'walk'
import fs from 'fs'


const dev = process.env.NODE_ENV == 'dev' ? true : false
const commandsPath = `./${!dev ? 'dist' : 'src'}/commands`
const jobsPath = `./${!dev ? 'dist' : 'src'}/jobs`
export const clipsPath = path.resolve('clips')

export function getCommandFiles(): Array<string> | null {
    let files: Array<string> = []
    let options = {
        listeners: {
            file: function (root: string, stat: any, next: Function) {
                // Add this file to the list of files
                if (!root.endsWith('indirect')) files.push(root + '/' + stat.name)
                next()
            },
        },
    }
    walk.walkSync(path.resolve(commandsPath), options)
    const res: Array<string> = files.filter((file) => file.endsWith('.js') || file.endsWith('.ts'))

    if (res.length > 0) return res
    return null
}

export function getJobFiles(): Array<string> | null {
    let files: Array<string> = []
    let options = {
        listeners: {
            file: function (root: string, stat: any, next: Function) {
                // Add this file to the list of files
                if (!stat.name.startsWith('runner')) files.push(root + '/' + stat.name)
                next()
            },
        },
    }
    walk.walkSync(path.resolve(jobsPath), options)
    const res: Array<string> = files.filter((file) => file.endsWith('.js') || file.endsWith('.ts'))

    if (res.length > 0) return res
    return null
}

interface findFile{
    path:string, 
    end:string
}
export function getClipFiles(): Array<findFile> {
    if (!fs.existsSync(clipsPath)) {
        fs.mkdirSync(clipsPath)
    }
    let files: Array<findFile> = []
    let options = {
        listeners: {
            file: function (root: string, stat: any, next: Function) {
                // Add this file to the list of files
                files.push({path:root + '/' + stat.name, end:stat.name})
                next()
            },
        },
    }
    walk.walkSync(path.resolve(clipsPath), options)
    const res: Array<findFile> = files.filter((file) => file.end.endsWith('.mp3'))

    return res
}
