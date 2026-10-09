// Reproducible annotations for the provided Revised 2023 photos.
// Verified passages below were transcribed while viewing their original photos.
import { readFile, writeFile, readdir, mkdir, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
const source = 'handbook-pictures', raw = 'tmp/handbook-review', review = 'handbook-data/review';
await mkdir(review, { recursive: true });
for (const file of await readdir(raw)) if (/^hb.*\.jpg\.json$/.test(file)) await copyFile(join(raw, file), join(review, file), constants.COPYFILE_EXCL).catch(error => { if (error.code !== 'EEXIST') throw error; });
const titles = {
  1:'Contents continued',2:'History and mission',3:'Vision, administration and courses',4:'Courses and admission policies',5:'Admission policies',6:'Admission credentials',7:'Registration procedures',8:'Probationary status and fees',9:'Class attendance',10:'Grading systems',11:'Incomplete grades and dropping subjects',12:'Retention policies and grading',13:'Promotion and retention',14:'Scholarship rules',15:'College honor graduates',16:'Honors computation and eligibility',17:'High school honors',18:'Elementary honors',19:'Graduation requirements and discipline',20:'Major offenses',21:'Major and serious offenses',22:'Serious offenses',23:'Serious and less serious offenses',24:'Less serious offenses',25:'General behavior and student responsibilities',26:'Classroom behavior',27:'Library and corridor rules',28:'Academic functions and examinations',29:'Examinations and school credentials',30:'Campus organizations',31:'Organization membership and field trips',32:'Field trips and anti-sexual harassment provisions',33:'Tobacco and data privacy provisions',34:'Drugs and anti-bullying provisions',35:'Anti-bullying provisions',36:'Reporting bullying incidents',
};
function chapter(n) { if(n<2)return 'Contents';if(n<4)return 'About the college';if(n<9)return 'Admission and registration';if(n===9)return 'Class attendance';if(n<14)return 'Grading and retention';if(n<19)return 'Scholarships and honors';if(n<25)return 'Graduation and discipline';if(n<29)return 'Code of conduct';return 'Other school rules and policies'; }
const pages=[{file:'hb-front.jpg',label:'cover',title:'Student handbook Revised 2023',chapter:'Cover'},{file:'hb-toc1.jpg',label:'contents',title:'Table of contents',chapter:'Contents'},...Array.from({length:36},(_,i)=>({file:`hb${i+1}.jpg`,label:String(i+1),title:titles[i+1],chapter:chapter(i+1)})),{file:'hb-insideback.jpg',label:'inside-back',title:'Inside back cover',chapter:'Closing pages'},{file:'hb-back.jpg',label:'back-cover',title:'Back cover',chapter:'Cover'}];
await writeFile(join(source,'handbook-index.json'),JSON.stringify({edition:'Laguna College Student Handbook · Revised 2023',exclude:['laguna-college-seal.png'],pages},null,2)+'\n');
const specs = {
  9: [
    ['Attendance absence limits', /^1\. A student who has incurred/, /term or semester shall be dropped/, '1. A student who has incurred absences of more than 20% of the required total number of class and laboratory periods in a given term or semester shall be dropped from the course or subject.'],
    ['Absence excuse slip medical certificate', /^No student who has been absent/, /certificate countersigned by the school physician/, '2. No student who has been absent from classes for three (3) consecutive days shall be admitted without presenting to the instructor concerned an excuse slip duly signed by his/her parent or guardian. The excuse slip must be countersigned by his/her principal, dean or Guidance Counselor. In case of absence due to sickness for 3 days or more, the student should present a medical certificate countersigned by the school physician.'],
    ['Punctuality lateness tardiness', /^A student is required to be punctual/, /an absence\./, '3. A student is required to be punctual and regular in his class attendance. He/She must be in the classroom on time. Tardiness of more than 10 minutes without justifiable reason shall be considered an absence.'],
  ],
  25: [
    ['School rules student responsibilities respect dress', /^Section 1\. Students shall at all times be neat/, /courteous in their conduct/, 'Section 1. Students shall at all times be neat, clean, decent in their clothing, orderly, respectful, and courteous in their conduct.'],
    ['Respect language student responsibilities', /^Section 2\. Students shall refrain from using/, /Administration of the College/, 'Section 2. Students shall refrain from using language and committing acts that are disrespectful, vulgar, or indecent, or which in any manner may cause or tend to disturb other students, faculty members, employees, or officials of the Administration of the College.'],
    ['Morally offensive objects pictures literature', /^Section 3\. Students shall not bring/, /morally offensive/, 'Section 3. Students shall not bring into the College objects, pictures, or literature that are morally offensive.'],
    ['Alcohol drugs school premises', /^Section 4\. Students shall not bring/, /influence of liquor or drug/, 'Section 4. Students shall not bring into the premises of the College any alcoholic drink, or any prohibited drug or opiate, or enter the College premises under the influence of liquor or drug.'],
  ],
  27: [
    ['Library silence', /^Silence must be observed/, /^Silence must be observed/, '1. Silence must be observed at all times.'],
    ['Library books open stack shelves', /^The main library is an/, /Avoid hiding books/, '2. The main library is an "open stack" library. Thus, the students may gain access to the library books anytime and properly return them to the shelves or the circulation desk. Avoid hiding books so that others may also gain access.'],
    ['Library borrowing identification ID cards', /^Readers must show their ID/, /office of the Chief Librarian/, '3. Readers must show their ID card at the desk and library cards upon borrowing and at the request of the librarian. Visiting researchers should have identification papers and must register with the office of the Chief Librarian.'],
    ['Library book borrowing renewal period', /^For those with circulation privileges/, /^demand\./, '4. For those with circulation privileges, a book is allowed out for one week. Renewal may be granted if the book is not in demand.'],
    ['Library reserve books loan overnight return', /^Reserve books, Open Reserves/, /returned at 9:00 the following morning/, '5. Reserve books, Open Reserves - Books used as accompanying reading for course work have unlimited use in the reading room. This collection is located in open shelves in the Reserved Section and may be there without being signed out. Close-Reserves - Books in demand prescribed for courses are charged out at the loan desk and limited from one to two hours and overnight use. Books borrowed overnight may be checked out at 6:00 P.M. and should be returned at 9:00 the following morning.'],
    ['Corridors loitering disturbance', /^Section 1\. Students shall not loiter/, /corridors during class hours/, 'Section 1. Students shall not loiter or make any disturbance in the corridors during class hours.'],
    ['Corridors stairways keep right', /^Section 2\. Students shall keep to the right/, /corridors and stairways/, 'Section 2. Students shall keep to the right when walking in the corridors and stairways.'],
  ],
  28: [
    ['Academic functions noise', /^Section 1\. Students shall refrain from making/, /^academic functions\./, 'Section 1. Students shall refrain from making unnecessary noise and causing commotion of any kind during academic functions.'],
    ['Academic functions leaving hall', /^Section 2\. Students shall refrain from leaving/, /during a speech or performance/, 'Section 2. Students shall refrain from leaving the hall during a speech or performance.'],
    ['Social functions clothing dress', /^Section 1\. Students shall attend social functions/, /appropriate for the occasion/, 'Section 1. Students shall attend social functions in clothing appropriate for the occasion.'],
    ['Social functions behavior', /^Section 2\. Students shall behave properly/, /^functions\./, 'Section 2. Students shall behave properly during social functions.'],
    ['Social functions gate crash', /^Section 3\. Students shall not/, /^Section 3\. Students shall not/, 'Section 3. Students shall not "gate crash" a social function.'],
    ['Outside campus conduct reputation', /^Section 1\. Students shall at all times refrain/, /acts that may embarrass the College/, 'Section 1. Students shall at all times refrain from committing acts that may embarrass the College or reflect dishonor upon it.'],
    ['Examination schedules', /^Examination schedules are published/, /semester or school year\./, 'Examination schedules are published at the start of the semester or school year.'],
  ],
};
function union(lines){ const x=Math.max(0,Math.min(...lines.map(p=>p.box.x))-.008),y=Math.max(0,Math.min(...lines.map(p=>p.box.y))-.004);const right=Math.min(1,Math.max(...lines.map(p=>p.box.x+p.box.width))+.008),bottom=Math.min(1,Math.max(...lines.map(p=>p.box.y+p.box.height))+.004); return {x,y,width:right-x,height:bottom-y}; }
let count=0;
for(const [number,definitions] of Object.entries(specs)){
  const file=`hb${number}.jpg.json`, data=JSON.parse(await readFile(join(review,file),'utf8'));
  if(data.passages.some(p=>p.verified)) { count+=data.passages.filter(p=>p.verified).length; continue; }
  const main=data.passages.filter(p=>Number(number)===28?p.box.x<.74:p.box.x>(Number(number)===27?.16:.2)).sort((a,b)=>a.box.y-b.box.y);
  const paragraphs=[];
  for(const [topic,start,end,text] of definitions){
    const first=main.findIndex(p=>start.test(p.text));
    const relative=main.slice(first).findIndex(p=>end.test(p.text));
    if(first<0||relative<0)throw new Error(`Cannot locate reviewed paragraph: page ${number}, ${topic}`);
    paragraphs.push({text,topic,box:union(main.slice(first,first+relative+1)),verified:true});
  }
  data.passages=[...paragraphs,...data.passages];
  await writeFile(join(review,file),JSON.stringify(data,null,2)+'\n');
  count+=paragraphs.length;
}
console.log(`Prepared 40 original page images, with ${count} manually reviewed complete passages. Remaining OCR is draft.`);
// Vision can estimate a line box slightly beyond a photographed image edge.
for(const file of await readdir(review)) {
  const data=JSON.parse(await readFile(join(review,file),'utf8'));
  data.passages=data.passages.map(p=>{
    if(p.verified) return p;
    const x=Math.max(0,p.box.x),y=Math.max(0,p.box.y),right=Math.min(1,p.box.x+p.box.width),bottom=Math.min(1,p.box.y+p.box.height);
    return {...p,box:{x,y,width:right-x,height:bottom-y}};
  }).filter(p=>p.box.width>0&&p.box.height>0);
  await writeFile(join(review,file),JSON.stringify(data,null,2)+'\n');
}
