import * as path from 'path'
import * as walk from 'walk'

const dev = process.env.NODE_ENV == 'dev' ? true : false
const commands_path = `./${!dev ? 'dist' : 'src'}/commands`

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
