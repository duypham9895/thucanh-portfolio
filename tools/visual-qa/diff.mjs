import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'node:fs';
const [,,aPath,bPath,outPath] = process.argv;
const a = PNG.sync.read(fs.readFileSync(aPath));
const b = PNG.sync.read(fs.readFileSync(bPath));
if (a.width !== b.width || a.height !== b.height) {
  console.log(JSON.stringify({ fatal:'DIMENSION MISMATCH', a:[a.width,a.height], b:[b.width,b.height] }));
  process.exit(2);
}
const diff = new PNG({ width:a.width, height:a.height });
const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold:0.1, includeAA:false });
fs.writeFileSync(outPath, PNG.sync.write(diff));
// largest connected diff region (rough): scan rows/cols with any diff
const rows = new Set(), cols = new Set();
for (let y=0;y<a.height;y++) for (let x=0;x<a.width;x++){
  const i=(y*a.width+x)*4;
  if (diff.data[i]!==0 || diff.data[i+1]!==0 || diff.data[i+2]!==0){ rows.add(y); cols.add(x); }
}
const rr=[...rows].sort((p,q)=>p-q);
console.log(JSON.stringify({
  dims:[a.width,a.height], diffPixels:n, totalPixels:a.width*a.height,
  pct:+(100*n/(a.width*a.height)).toFixed(4),
  diffRowSpan: rr.length ? [rr[0], rr[rr.length-1]] : null,
  diffRowCount: rr.length
}));
