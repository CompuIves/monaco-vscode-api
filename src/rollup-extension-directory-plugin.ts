import { createFilter, FilterPattern, dataToEsm } from '@rollup/pluginutils'
import { InputPluginOption, Plugin } from 'rollup'
import { IExtensionManifest } from 'vs/platform/extensions/common/extensions'
import { localizeManifest } from 'vs/platform/extensionManagement/common/extensionNls.js'
import { isBinaryFileSync } from 'isbinaryfile'
import { lookup as lookupMimeType } from 'mime-types'
import * as path from 'path'
import * as fsPromise from 'fs/promises'
import * as fs from 'fs'
import * as url from 'url'
import { buildExtensionCode, compressResource, extractResourcesFromExtensionManifest, parseJson } from './extension-tools'

interface Options {
  include?: FilterPattern
  exclude?: FilterPattern
  rollupPlugins?: InputPluginOption[]
  transformManifest?: (manifest: IExtensionManifest) => IExtensionManifest
}

export default function plugin ({
  include,
  exclude,
  rollupPlugins = [],
  transformManifest = manifest => manifest
}: Options): Plugin {
  const filter = createFilter(include, exclude)

  return {
    name: 'default-extensions-loader',
    resolveId (source) {
      if (filter(source)) {
        return source
      }
      return undefined
    },
    async load (id) {
      // load extension directory as a module that loads the extension
      if (!filter(id)) {
        return
      }

      // Load extension resources
      const basename = path.basename(id)
      if (basename === 'package.json') {
        const content = await fsPromise.readFile(id)
        let parsed = parseJson<IExtensionManifest>(id, content.toString('utf-8'))
        const nlsFile = path.resolve(path.dirname(id), 'package.nls.json')
        if (fs.existsSync(nlsFile)) {
          parsed = localizeManifest(parsed, parseJson(id, (await fsPromise.readFile(nlsFile)).toString()))
        }
        return {
          code: dataToEsm(transformManifest(parsed), {
            compact: true,
            namedExports: false,
            preferConst: false
          })
        }
      }

      const extensionResourceMatch = /^(.*)\.extensionResource$/.exec(id)
      if (extensionResourceMatch != null) {
        const resourcePath = extensionResourceMatch[1]!
        if (resourcePath.endsWith('.js')) {
          const code = await buildExtensionCode(resourcePath, rollupPlugins)
          return {
            code: `export default ${JSON.stringify(code)};`,
            map: { mappings: '' }
          }
        }
        const content = await fsPromise.readFile(resourcePath)
        if (isBinaryFileSync(content)) {
          return {
            code: `export default Uint8Array.from(window.atob(${JSON.stringify(content.toString('base64'))}), v => v.charCodeAt(0));`,
            map: { mappings: '' }
          }
        } else {
          return {
            code: `export default ${JSON.stringify(compressResource(id, content.toString('utf-8')))};`,
            map: { mappings: '' }
          }
        }
      }

      // load extension directory as a module that loads the extension
      const stat = await fsPromise.stat(id)
      if (stat.isDirectory()) {
        // Load the extension directory as a module importing the required files and registering the extension
        const manifestPath = path.resolve(id, 'package.json')
        const manifest = transformManifest(parseJson<IExtensionManifest>(id, (await fsPromise.readFile(manifestPath)).toString('utf8')))
        try {
          const extensionResources = await extractResourcesFromExtensionManifest(manifest, async (resourcePath) => {
            return (await fsPromise.readFile(path.join(id, resourcePath)))
          })
          const syncPaths = extensionResources.filter(resource => resource.sync).map(r => r.path)
          const asyncPaths = extensionResources.filter(resource => !resource.sync).map(r => r.path)
          return `
import manifest from '${manifestPath}'
import { registerExtension, onExtHostInitialized } from '${url.fileURLToPath(new URL('../extensions.js', import.meta.url))}'
${syncPaths.map((resourcePath, index) => (`
import resource_${index} from '${path.resolve(id, resourcePath)}.extensionResource'`)).join('\n')}

onExtHostInitialized(() => {
  const { registerFile, registerSyncFile } = registerExtension(manifest)
${asyncPaths.map(resourcePath => (`
  registerFile('${resourcePath}', async () => await import('${path.resolve(id, resourcePath)}.extensionResource'))`)).join('\n')}
${syncPaths.map((resourcePath, index) => (`
  registerSyncFile('${resourcePath}', resource_${index}, '${lookupMimeType(resourcePath)}')`)).join('\n')}
})
        `
        } catch (err) {
          console.error(err, (err as Error).stack)
          throw err
        }
      }

      return undefined
    }
  }
}
