const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),version=require('../package.json').version;
assert.equal(require('../package-lock.json').packages[''].version,version);
const files=[path.join(root,'win',`Shixu-Desktop-${version}-win-x64.exe`),...['x64','arm64'].flatMap(a=>['dmg','zip'].map(e=>path.join(root,'mac',`Shixu-Desktop-${version}-mac-${a}.${e}`)))];
for(const file of files)assert.ok(fs.existsSync(file)&&fs.statSync(file).size>1000000,'Missing package: '+file);
const manifest=files.map(file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')+'  '+path.basename(file)).join('\n')+'\n';
for(const platform of ['win','mac'])fs.writeFileSync(path.join(root,platform,'SHA256SUMS.txt'),manifest);
console.log('Validated five package files and wrote checksum manifests for '+version);
