// Build clean, typeset pages from the checked transcription sidecars.
// Photographs and photo-coordinate OCR remain development references, never reader backgrounds.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = async path => JSON.parse(await readFile(join(root, path), 'utf8'));
const index = await read('handbook-pictures/handbook-index.json');
const metrics = await read('scripts/handbook-font-metrics.json');
const W = 776, H = 1110, LEFT = 84, RIGHT = 692;
const median = values => { const sorted = [...values].sort((a,b)=>a-b); return sorted[Math.floor(sorted.length / 2)] ?? 0; };
const textWidth = (text, size = 1, bold = false) => [...text].reduce((total, c) => total + (metrics[bold ? 'bold' : 'regular'][c] ?? .55), 0) * size;
const headings = /^(?:[IVX]+\.\s|[A-H]\.\s(?:College|HIGH SCHOOL|Elementary|Admission|Credentials|Registration|Probationary|Fees|Major Offenses|Serious Offenses|Less Serious Offenses|Special Provisions|Campus|Educational|Provisions|Selection)|Article\s|TABLE OF CONTENTS|BOARD OF TRUSTEES|Incomplete Grades$|On Dropping Subjects$|Retention Policies$|Rules on Scholarships$|Units Load Requirements$|Special Provisions$|Grades$|BSN Grading System$|Rules in the Computation|Computation|Membership in Campus Organization|In General$|.*Grading System$|.*Promotion and Retention Policies$)/i;
function flowRows(text) {
  let level = 0;
  return text.split('\n').flatMap(line => {
    if (!line.trim()) { level += .65; return []; }
    const y = level++;
    if (line.startsWith('|')) return line.slice(1,-1).split('|').map((text,i) => ({ text, flowLevel:y, indent:i*198, cell:true, bold:y===5 }));
    const center = line.startsWith('# '), bold = center || line.startsWith('## ');
    return [{ text:line.replace(/^#{1,2} /,'').trim(), flowLevel:y, indent: /^\s/.test(line) ? 34 : 0, bold, align:center?'center':'left' }];
  });
}
function makeLayout(d, label) {
  if (d.fixedLayout) return { width:W, height:H, reviewed:d.reviewed, seal:d.seal, folio:/^\d+$/.test(label)?label:undefined, lines:d.rows.map((r,i)=>({ ...r, id:`line-${i+1}` })) };
  let rows = d.flowText ? flowRows(d.flowText) : d.rows.filter(r => r.text.trim() !== label).map(r=>({...r,box:{...r.box}}));
  if (!d.flowText) {
    const labels=rows.filter(r=>/^(?:\d+|[a-z])\.$/i.test(r.text));
    rows=rows.filter(r=>!labels.includes(r));
    for(const marker of labels) {
      const candidates=rows.filter(r=>r.box.x>=marker.box.x-.005);
      const nearest=candidates.sort((a,b)=>Math.abs(a.level-marker.level)-Math.abs(b.level-marker.level))[0];
      if(!nearest || Math.abs(nearest.level-marker.level)>.025) throw Error(`Unattached list label on ${label}: ${marker.text}`);
      nearest.text=marker.text+' '+nearest.text;
      nearest.box.x=marker.box.x;
    }
  }
  const long = rows.filter(r=>r.box?.width>.28 && r.text.length>35);
  const left = long.length ? Math.min(...long.map(r=>r.box.x)) : d.left;
  const right = long.length ? median(long.map(r=>r.box.x+r.box.width)) : d.right;
  // Straighten the changing left margin caused by camera perspective.
  const firstHalf=long.filter(r=>r.level<median(long.map(t=>t.level))), lastHalf=long.filter(r=>r.level>=median(long.map(t=>t.level)));
  const a = median(firstHalf.map(r=>r.box.x)), b = median(lastHalf.map(r=>r.box.x));
  const ay=median(firstHalf.map(r=>r.level)), by=median(lastHalf.map(r=>r.level));
  const drift = by===ay ? 0 : (b-a)/(by-ay);
  const photoScale = 608 / Math.max(.3,right-left);
  const levels = [...new Set(rows.map(r => r.flowLevel ?? r.level))].sort((a,b)=>a-b);
  const gaps=levels.slice(1).map((v,i)=>v-levels[i]).filter(v=>v>.007 && v<.04);
  const gap=median(gaps) || .015;
  const groups=[];
  for (const r of rows) {
    const level=r.flowLevel??r.level, last=groups.at(-1);
    const previous=last?.rows.at(-1);
    if (last && (d.flowText ? Math.abs(level-last.level)<.01 : Math.abs(level-last.level)<.005 && previous.box.x+previous.box.width<=r.box.x+.015)) last.rows.push(r);
    else groups.push({ level, rows:[r] });
  }
  let cursor=0;
  const lines=[];
  for (const [g,group] of groups.entries()) {
    if(g) cursor += d.flowText ? group.level-groups[g-1].level : Math.max(1, Math.min(2.8,(group.level-groups[g-1].level)/gap));
    let cells=group.rows.sort((a,b)=>(a.indent??a.box.x)-(b.indent??b.box.x));
    // Vision splits widely justified lines into several boxes. Rejoin the printed
    // line; tables use explicit flow cells and retain their column boundaries.
    if (!d.flowText && cells.length > 1) {
      const first=cells[0], last=cells.at(-1);
      cells=[{...first,text:cells.map(r=>r.text).join(' '),box:{...first.box,width:last.box.x+last.box.width-first.box.x}}];
    }
    for (const [i,r] of cells.entries()) {
      const bold=r.bold??headings.test(r.text), centered=r.align==='center' || (!d.flowText && bold && r.box.x > left+.09 && r.text.length>20);
      let indent = r.indent ?? Math.max(0,Math.round((r.box.x-(a+drift*(r.level-ay)))*photoScale/20)*20);
      if (centered) indent=0;
      indent=Math.min(d.flowText ? 520 : 100,indent);
      const next=cells[i+1];
      const nextIndent=next ? next.indent??Math.max(0,Math.round((next.box.x-(a+drift*(next.level-ay)))*photoScale/20)*20) : 608;
      const width= centered ? 608 : Math.max(25, Math.min(608-indent, nextIndent-indent-5));
      lines.push({id:`line-${lines.length+1}`,text:r.text,x:LEFT+indent,y:cursor,width,bold,align:centered?'center':r.align??'left',originalBox:r.box});
    }
  }
  let fontSize = Math.min(21,924/Math.max(1,(cursor+1)*1.25));
  for (const line of lines) if(line.text) fontSize=Math.min(fontSize,line.width/textWidth(line.text,1,line.bold)*.985);
  fontSize=Math.round(fontSize*10)/10;
  const lineStep=fontSize*1.25;
  for(const line of lines) { line.y=Math.round(70+line.y*lineStep);line.fontSize=fontSize; }
  return {width:W,height:H,reviewed:d.reviewed,folio:/^\d+$/.test(label)?label:undefined,lines};
}
function bounds(lines) {
  const x=Math.max(0,Math.min(...lines.map(l=>l.x))-5),y=Math.max(0,Math.min(...lines.map(l=>l.y))-2);
  const right=Math.min(W,Math.max(...lines.map(l=>l.x+l.width))+5),bottom=Math.min(H,Math.max(...lines.map(l=>l.y+l.fontSize*1.25))+2);
  return {x:x/W,y:y/H,width:(right-x)/W,height:(bottom-y)/H};
}
const tokens = text => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
function findLines(text,layout) {
  const full=[], owners=[];
  for(const line of layout.lines) {
    // List labels can be separate OCR boxes or part of a line. They are layout,
    // not words in a quoted policy paragraph.
    const text=line.text.replace(/^\s*(?:\d+|[a-z])\.\s*/i,'');
    for(const word of tokens(text)) {full.push(word);owners.push(line);}
  }
  const target=tokens(text);if(/^\d+$/.test(target[0]))target.shift();
  for(let i=0;i<=full.length-target.length;i++) if(target.every((t,j)=>full[i+j]===t)) return [...new Set(owners.slice(i,i+target.length))];
  // No guessed box: refuse an evidence record that no longer matches the typeset text.
  return [];
}
const pages=[];
for(const [i,entry] of index.pages.entries()) {
  const bytes=await readFile(join(root,'handbook-pictures',entry.file));
  const hash=createHash('sha256').update(bytes).digest('hex');
  const key=`scan-${String(i+1).padStart(3,'0')}-${hash.slice(0,12)}`;
  const d=await read(`handbook-data/digitized/${entry.label}.json`);
  if(d.imageSha256!==hash) throw Error(`Transcription image mismatch: ${entry.file}`);
  const layout=makeLayout(d,entry.label), review=await read(`handbook-data/review/${entry.file}.json`);
  const passages=review.passages.map((p,j)=>({ id:`${key}-p${j+1}`,text:p.text.trim(),topic:p.topic,verified:p.verified===true }));
  for(const p of passages.filter(p=>p.verified)) {
    const matching=findLines(p.text,layout);
    if(!matching.length)throw Error(`Reviewed answer differs from digitized page ${entry.label}: ${p.topic}`);
    p.box=bounds(matching);
  }
  if(entry.label==='3') {
    const courseLines=layout.lines.filter(l=>l.y>=411 && l.y<=990);
    passages.unshift({id:`${key}-courses`,text:courseLines.map(l=>l.text).join('\n'),topic:'Courses offered degrees programs majors',verified:true,box:bounds(courseLines)});
  }
  for(const l of layout.lines) delete l.originalBox;
  pages.push({id:key,imageKey:key,label:entry.label,title:entry.title,chapter:entry.chapter,isDemo:false,aspectRatio:W/H,layout,passages});
}
const edition=index.edition, version=createHash('sha256').update(JSON.stringify({edition,pages})).digest('hex').slice(0,20);
await writeFile(join(root,'src/data/handbook.json'),JSON.stringify({edition,version,pages},null,2)+'\n');
console.log(`Built ${pages.length} digitized pages; ${pages.filter(p=>p.layout.reviewed).length} page transcriptions checked; ${pages.flatMap(p=>p.passages.filter(t=>t.verified)).length} answer passages with matching digital highlights.`);
