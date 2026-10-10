const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),input=process.argv[2];
assert(input,'Provide a reviewed JSON file.');
const review=JSON.parse(fs.readFileSync(input,'utf8'));
assert.equal(review.kind,'sihai-display-review');
const statuses=new Map(JSON.parse(fs.readFileSync(path.join(root,'data/status.json'),'utf8')).map(s=>[s.ID,s]));
const output=path.join(root,'data/approved-status-descriptions.js'),context={window:{}};
if(fs.existsSync(output))vm.runInNewContext(fs.readFileSync(output,'utf8'),context);
const entries=context.window.SZO_APPROVED_STATUS_DESCRIPTIONS||{};
const selected=review.statusReviews.filter(s=>s.approved===true);
for(const entry of selected){
 const current=statuses.get(entry.id);assert(current,'Unknown status '+entry.id);
 for(const key of ['ID','Name','Group','Order','Param1','Param2'])assert.equal(entry.source[key],current[key],entry.id+': stale '+key);
 assert.equal(entry.name,current.Name);assert.equal(typeof entry.description,'string');assert(entry.description.trim());
 entries[entry.id]={name:entry.name,lines:entry.description.trim().split(/\r?\n/).filter(s=>s.trim()),source:entry.source,reviewedAt:review.createdAt};
}
fs.writeFileSync(output,'window.SZO_APPROVED_STATUS_DESCRIPTIONS='+JSON.stringify(entries,null,2)+';\n');
console.log('Imported '+selected.length+' approved statuses; unrelated fields and drafts ignored.');
