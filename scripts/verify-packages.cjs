const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const asar=require('@electron/asar');
const root=path.resolve(__dirname,'..');
const metadata=require('../package.json');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const expected=['electron/main.js','electron/preload.js','electron/autostart.js','renderer/index.html','renderer/index.en.html','renderer/dock.html','renderer/dock.en.html','renderer/research-core.js','renderer/research-ui.js','renderer/evidence-ui.js','renderer/lab-core.js','renderer/lab-ui.js','renderer/plant-examples.js','renderer/dock-layout.js','renderer/locale.js','renderer/i18n.js','renderer/translations.js','renderer/autostart-ui.js','renderer/lab.css'];
function verify(file){
  if(!fs.existsSync(file))throw Error('Package missing: '+file);
  const bundled=JSON.parse(asar.extractFile(file,'package.json').toString());
  if(bundled.version!==metadata.version||bundled.main!==metadata.main)throw Error('Bundled package metadata differs from source');
  for(const name of expected){
    const source=fs.readFileSync(path.join(root,name)),packed=asar.extractFile(file,name);
    if(sha(source)!==sha(packed))throw Error('Packaged source mismatch: '+name);
  }
  const files=asar.listPackage(file);
  if(files.some(name=>/[\\/](?:\.git|\.env|tasks\.json|shixu-data\.json|shixu-settings\.json)(?:[\\/]|$)/.test(name)))throw Error('Unexpected private data in app archive');
  const report={archive:path.relative(root,file),version:bundled.version,checkedSourceFiles:expected.length,archiveSha256:sha(fs.readFileSync(file)),checkedAt:new Date().toISOString()};
  console.log(JSON.stringify(report,null,2));return report;
}
const files=process.argv.slice(2);
if(!files.length)throw Error('Supply one or more app.asar paths');
const reports=files.map(file=>verify(path.resolve(root,file)));
const reportDir=path.join(root,process.platform==='darwin'?'mac':'win');fs.mkdirSync(reportDir,{recursive:true});
fs.writeFileSync(path.join(reportDir,'package-verification.json'),JSON.stringify(reports,null,2)+'\n');
