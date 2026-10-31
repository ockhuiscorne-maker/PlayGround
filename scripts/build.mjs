// Copy the static source in web/ into dist/ so the deployment directory is
// always a clean, self-contained build with an index.html at its root.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'web')
const output = join(root, 'dist')

if (!existsSync(join(source, 'index.html'))) {
  throw new Error(`Missing static source: ${join(source, 'index.html')}`)
}

rmSync(output, { recursive: true, force: true })
mkdirSync(output, { recursive: true })
cpSync(source, output, { recursive: true })
writeFileSync(
  join(output, 'build.json'),
  JSON.stringify({ builtAt: new Date().toISOString(), source: 'web' }, null, 2) + '\n'
)

if (!existsSync(join(output, 'index.html'))) {
  throw new Error(`Build did not produce ${join(output, 'index.html')}`)
}

console.log(`Built static site into ${output}`)
