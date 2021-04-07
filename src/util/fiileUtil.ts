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

import * as path from 'path'
import * as walk from 'walk'

const dev = process.env.NODE_ENV == 'dev' ? true : false
const commands_path = `./${!dev ? 'dist' : 'src'}/commands`
const jobs_path = `./${!dev ? 'dist' : 'src'}/jobs`

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
    walk.walkSync(path.resolve(commands_path), options)
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
    walk.walkSync(path.resolve(jobs_path), options)
    const res: Array<string> = files.filter((file) => file.endsWith('.js') || file.endsWith('.ts'))

    if (res.length > 0) return res
    return null
}
