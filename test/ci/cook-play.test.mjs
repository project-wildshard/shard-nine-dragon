// Ring 2, J186: the actual cold cook takes 25.78 s locally. Both native
// worlds use only cooked server files for grapple, landing and restore.
// Use the shipped cooker/encoder, then only extracted server-pack bytes.
// This complete publish/serve/play journey never joins hooks or Ring 3.
import '@wildshard/engine/scripts/sim-node-loader.mjs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';
import {test} from 'node:test';

const {readServerPackBook,serverPackFile}=await import('@wildshard/engine/game/shardfile/serverPack');
const {loadHeadlessProduct}=await import('@wildshard/engine/host/headlessProduct');
const {createTrustedHeadlessAdapter}=await import('@wildshard/engine/host/headlessRuntime');
const {outputDescriptor,serverReadsFile}=await import('@wildshard/engine/game/shardfile/outputDescriptor');
const {loadRapier}=await import('@wildshard/engine/physics/rapier');
const require=createRequire(import.meta.url);

test('the real cooked Nine earns grapple and resumes using only served server files',{timeout:180_000},async()=>{
 const parent=process.env.WS_PROOF_SCRATCH??tmpdir();mkdirSync(parent,{recursive:true});
 const root=mkdtempSync(join(parent,'nine-cook-')),worlds=[];
 const previous=process.env.WILDSHARD_SPAWN_PART_CACHE;
 process.env.WILDSHARD_SPAWN_PART_CACHE=join(root,'cold-parts');
 try{
  const {cookShard,servedAsIs}=await import('@wildshard/engine/game/shardCook');
  const bin=join(dirname(require.resolve('@wildshard/sharddev/package.json')),'bin/wildshard.mjs'),tar=join(root,'dunes.tar');
  const done=spawnSync(process.execPath,[bin,'pack',resolve('out/nine-dragon-stack'),'--out',tar],{encoding:'utf8',timeout:30_000});
  assert.ifError(done.error);assert.equal(done.status,0,done.stderr);
  const cooked=join(root,'cooked'),unpacked=join(root,'server-files');
  // Loose HTTP encoding is an explicit host policy, not a fake part encoder.
  const report=await cookShard(readFileSync(tar),cooked,{now:()=>performance.now(),wireBytes:(url,bytes)=>servedAsIs(url,bytes)?bytes.length:
   brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:4}}).length});
  assert.equal(report.slug,'nine-dragon-stack');assert.ok(report.parts.count>0);
  const raw=JSON.parse(readFileSync(join(cooked,report.server.index),'utf8'));
  const pack=readServerPackBook({book:'server',build:'nine-proof',shards:{[report.slug]:raw}}).shards[report.slug];
  for(const part of [pack,...pack.more??[]]){
   const body=brotliDecompressSync(readFileSync(join(cooked,part.url)));
   assert.equal(body.length,part.bytes);assert.equal(createHash('sha256').update(body).digest('hex'),part.hash);
   for(const [name] of part.files){const target=join(unpacked,name);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,serverPackFile(part,body,name));}
  }
  // No uncooked product, shard source or client part enters either runtime.
  const product=await loadHeadlessProduct(unpacked),shard=product.shardfile,descriptor=outputDescriptor(shard);
  const assets=new Map(descriptor.index.files.filter(file=>serverReadsFile(file,shard.terrain?.collider)&&
   (file.name===undefined||file.kind==='wasm'||file.kind==='tile')).map(file=>
   [file.commons===true?`commons:${file.hash}`:file.hash,readFileSync(join(unpacked,file.path))]));
  const engineRequire=createRequire(require.resolve('@wildshard/engine/package.json'));
  const rapier=await loadRapier(readFileSync(engineRequire.resolve('@dimforge/rapier3d-simd/rapier_wasm3d_bg.wasm')));
  const create=async snapshot=>{const world=await createTrustedHeadlessAdapter({shard,assets,product,rapier},snapshot);worlds.push(world);return world;};
  const world=await create(),{default:grapple}=await import('./nine-content.mjs');
  await grapple(product,world);
  const resumed=await create(world.commit().snapshot);
  for(let tick=0;tick<5;tick++){
   const commands=[{kind:'player',moveX:0,moveZ:-1,yaw:0}];world.step(commands);resumed.step(commands);
   assert.deepEqual(resumed.commit(),world.commit(),'The cooked world must continue identically');
  }
  console.log(`real Nine cook: ${report.seconds.toFixed(2)} s, ${report.server.files} server files, ${report.parts.count} client parts; grapple earned, five restored ticks`);
 }finally{
  for(const world of worlds)await world.dispose();
  if(previous===undefined)delete process.env.WILDSHARD_SPAWN_PART_CACHE;else process.env.WILDSHARD_SPAWN_PART_CACHE=previous;
  rmSync(root,{recursive:true,force:true});
 }
});
