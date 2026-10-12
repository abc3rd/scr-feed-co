import { createQrImage } from '../src/lib/qrImage.js';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const directory = process.argv[2];
if (!directory) throw new Error('Supply a temporary output directory.');
mkdirSync(directory,{recursive:true});
const origin='https://scr-feed-manager-production.up.railway.app';
const payloads=[`${origin}/join?src=counter`,JSON.stringify({protocol:'ucp/1',command:'encode',text:'Hello, SCR!'}),'SCR feed — café'];
for(let i=0;i<12;i++)payloads.push(`${origin}/m/${createHash('sha256').update(`SCR barn QR v1:verification-user-${i}`).digest('hex')}`);
const cases=[];
for(let i=0;i<payloads.length;i++){
 const image=await createQrImage(payloads[i]);const path=join(directory,`qr-${i}.png`);
 writeFileSync(path,Buffer.from(image.src.split(',')[1],'base64'));
 cases.push({path,payload:payloads[i],width:image.width});
}
writeFileSync(join(directory,'cases.json'),JSON.stringify(cases));
console.log(`Generated ${cases.length} symbols using the production encoder.`);
