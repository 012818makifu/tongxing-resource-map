import {cp,mkdir,rm} from "node:fs/promises";
await rm("dist",{recursive:true,force:true});
await mkdir("dist",{recursive:true});
await cp("public","dist",{recursive:true});
await mkdir("dist/vendor",{recursive:true});
for(const [src,file] of [["d3/dist/d3.min.js","d3.min.js"],["topojson-client/dist/topojson-client.min.js","topojson-client.min.js"],["taiwan-atlas/towns-10t.json","towns-10t.json"]]){
  await cp("node_modules/"+src,"dist/vendor/"+file);
}
