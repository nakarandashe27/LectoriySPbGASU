// Local preview only. Static files and video paths are explicitly confined.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=__dirname;
const media=vm.runInNewContext(fs.readFileSync(path.join(root,'slides.js'),'utf8')+'; MEDIA;');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  let url;
  try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
  const match=url.match(/^\/media\/([a-z]+)\.mp4$/);
  let file;
  if(match&&media[match[1]])file=path.resolve(root,'..',media[match[1]]);
  else {
    file=path.resolve(root,'.'+(url==='/'?'/index.html':url));
    if(!file.startsWith(root+path.sep)||!['.html','.css','.js','.jpg','.png','.webp','.svg','.mp4','.woff2'].includes(path.extname(file))){res.writeHead(404);return res.end();}
  }
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found');}
    const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
    let start=0,end=stat.size-1,status=200;
    if(req.headers.range){const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!range){res.writeHead(416);return res.end();}start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),end):end;if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return res.end();}status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;}
    headers['Content-Length']=end-start+1;
    res.writeHead(status,headers);
    if(req.method==='HEAD')return res.end();
    const stream=fs.createReadStream(file,{start,end});
    res.on('close',()=>stream.destroy());
    stream.on('error',()=>res.destroy()).pipe(res);
  });
});
const port=Number(process.env.PORT||4173);
server.listen(port,'127.0.0.1',()=>console.log(`Presentation preview: http://localhost:${port}`));
