const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const version=require('../package.json').version;
assert.equal(version,'1.2.1');
assert.equal(require('../package-lock.json').packages[''].version,version);
const out=path.join(root,'release-assets');
fs.mkdirSync(out,{recursive:true});
const json=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const files=[];
for(const [platform,expected] of [
  ['windows',[`Shixu-Desktop-${version}-win-x64.exe`]],
  ['macos',['arm64','x64'].flatMap(arch=>['dmg','zip'].map(ext=>`Shixu-Desktop-${version}-mac-${arch}.${ext}`))]
]){
  const dir=path.join(root,'artifacts',platform);
  const checksums=new Map(fs.readFileSync(path.join(dir,'SHA256SUMS.txt'),'utf8').trim().split(/\r?\n/).map(line=>line.trim().split(/\s+/,2)).map(([sha,name])=>[name,sha]));
  assert.equal(checksums.size,expected.length);
  for(const name of expected){
    const file=path.join(dir,name),sha256=hash(file);
    assert.equal(sha256,checksums.get(name),`Checksum mismatch: ${name}`);
    assert.ok(fs.statSync(file).size>1000000);
    fs.copyFileSync(file,path.join(out,name));
    fs.copyFileSync(file+'.blockmap',path.join(out,name+'.blockmap'));
    files.push({name,size:fs.statSync(file).size,sha256});
  }
  const startup=json(path.join(dir,'startup-smoke.json'));
  assert.equal(startup.version,version);
  assert.equal(startup.started,true);
  assert.equal(startup.examplesAddedOnlyAfterUserAction,true);
  assert.ok(startup.aliveForMs>=5000);
  for(const field of ['projects','tasks','experiments'])assert.equal(startup[field],0);
  const packages=json(path.join(dir,'package-verification.json'));
  assert.equal(packages.length,platform==='windows'?1:2);
  for(const report of packages){assert.equal(report.version,version);assert.equal(report.checkedSourceFiles,19);}
  for(const name of ['startup-smoke.json','package-verification.json'])fs.copyFileSync(path.join(dir,name),path.join(out,platform+'-'+name));
  if(platform==='windows'){
    const installed=json(path.join(dir,'installer-validation.json'));
    for(const field of ['installed','started','uninstalled'])assert.equal(installed[field],true);
    fs.copyFileSync(path.join(dir,'installer-validation.json'),path.join(out,'windows-installer-validation.json'));
  }
}
fs.copyFileSync(path.join(root,'docs','INSTALLER-ACCEPTANCE-ZH-CN.md'),path.join(out,'INSTALLATION-zh-CN.md'));
fs.writeFileSync(path.join(out,'BUILD-VALIDATION.json'),JSON.stringify({version,sourceCommit:process.env.GITHUB_SHA,buildUrl:`${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,tests:58,defaultLocale:'en',firstRun:'empty',files,limitations:['Windows publisher signing is not configured.','macOS apps are ad-hoc signed, not Developer ID signed or notarized.','Native Intel Mac startup is not tested.']},null,2)+'\n');
const manifest=fs.readdirSync(out).sort().map(name=>`${hash(path.join(out,name))}  ${name}`);
fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),manifest.join('\n')+'\n');
console.log(`Prepared ${files.length} installers and ${manifest.length+1} release assets for ${version}.`);
