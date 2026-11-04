import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { mergeAdminCollection, projectAdminKey } from '../src/admin-data.js'

const publisher = fileURLToPath(new URL('./publish-telegram-reviewed.mjs', import.meta.url))
test('reviewed publication preserves admin edits, displays new projects, deduplicates edits, and rejects invalid candidates before changing the site', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'arcpol-telegram-test-'))
  const write = async (name, data) => { await fs.mkdir(path.dirname(path.join(root,name)), {recursive:true}); await fs.writeFile(path.join(root,name), JSON.stringify(data)) }
  const read = async name => JSON.parse(await fs.readFile(path.join(root,name), 'utf8'))
  await write('src/site-data.json', { projects: [{ id: 1, code: 'P-001', description: 'original', timeline: [], images: [] }] })
  await write('src/telegram-projects.json', [])
  await write('src/telegram-reports.json', [])
  await write('src/admin-overrides.json', {version:1,projects:{ patches:{'company:1':{__arcpolAdminPatch:true,fields:{description:'administrator text'},unset:[]}}, deleted:[],added:[] }})
  const report = {recordKey:'private-group:1',sourceUpdateId:1,sourceMessageIds:[1],date:'2026-11-04T00:00:00Z',text:'report',photoPaths:['.local-data/attachments/report.jpg']}
  await write('.local-data/telegram-live-inbox.json', [report])
  await fs.mkdir(path.join(root,'.local-data/attachments'),{recursive:true})
  await fs.writeFile(path.join(root,'.local-data/attachments/report.jpg'), Buffer.from([255,216,255,217]))
  const decision = {recordKey:report.recordKey,approved:true,projectKey:'P-001',title:'بازدید',summary:'گزارش تصویری'}
  await write('.local-data/telegram-reviewed.json',[decision])
  await fs.mkdir(path.join(root,'scripts'))
  // A deterministic audit stand-in exercises transaction behavior; the real site audit is run separately.
  await fs.writeFile(path.join(root,'scripts/audit-public-projects.mjs'), `import fs from 'node:fs'; const data=fs.readFileSync(process.env.ARCPOL_ADMIN_OVERRIDES_FILE,'utf8'); process.exit(data.includes('REJECT')?1:0);`)
  const run = () => spawnSync(process.execPath,[publisher],{env:{...process.env,ARCPOL_TELEGRAM_ROOT:root},encoding:'utf8'})
  let result = run(); assert.equal(result.status,0,result.stderr)
  let overrides = await read('src/admin-overrides.json')
  let effective = mergeAdminCollection((await read('src/site-data.json')).projects,overrides.projects,projectAdminKey)
  assert.equal(effective[0].description,'administrator text')
  assert.equal(effective[0].timeline.length,1)
  assert.ok(!JSON.stringify(effective).includes('private-group'))
  result=run(); assert.equal(result.status,0,result.stderr); assert.match(result.stdout,/Published 0/)
  report.sourceUpdateId=2; await write('.local-data/telegram-live-inbox.json',[report]); decision.title='بازدید تازه'; await write('.local-data/telegram-reviewed.json',[decision])
  result=run(); assert.equal(result.status,0,result.stderr)
  overrides=await read('src/admin-overrides.json'); effective=mergeAdminCollection((await read('src/site-data.json')).projects,overrides.projects,projectAdminKey)
  assert.equal(effective[0].timeline.length,1); assert.equal(effective[0].timeline[0].title,'بازدید تازه')
  const second={...report,recordKey:'private-group:2',sourceUpdateId:3}; await write('.local-data/telegram-live-inbox.json',[report,second])
  await write('.local-data/telegram-reviewed.json',[decision,{...decision,recordKey:second.recordKey,projectKey:'LIVE-TEST'}])
  result=run(); assert.equal(result.status,0,result.stderr)
  overrides=await read('src/admin-overrides.json'); effective=mergeAdminCollection((await read('src/site-data.json')).projects,overrides.projects,projectAdminKey)
  assert.equal(effective.length,2); assert.equal(effective[1].timeline.length,1); assert.equal(effective[1].images.length,1)
  const prior = await fs.readFile(path.join(root,'src/admin-overrides.json'),'utf8')
  await write('.local-data/telegram-reviewed.json',[{...decision,title:'REJECT'}])
  result=run(); assert.notEqual(result.status,0)
  assert.equal(await fs.readFile(path.join(root,'src/admin-overrides.json'),'utf8'),prior)
  console.log('Isolated fixture retained at', root)
})
