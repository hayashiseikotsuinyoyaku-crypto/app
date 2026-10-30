// テスト用の顔の点（478点）。使う点だけそれらしい場所に置く。opt で目の大きさ・口角・頬・あごの幅を変えられる
module.exports=function synth(opt){opt=Object.assign({eye:1,mouthUp:0,cheekUp:0,jaw:1,roll:0,shift:0,scale:1,brow:0},opt||{});
  const W=1000,H=1250,P=new Array(478).fill(0).map(()=>({x:500,y:600,z:0}));
  const set=(i,x,y,z)=>{P[i]={x,y,z:z||0}};   // 顔の座標（px・目の真ん中が原点、IPD=200px）
  const eye=(ix,cx,cy)=>{ix.forEach((i,j)=>{const a=j/ix.length*Math.PI*2;set(i,cx-Math.cos(a)*60*(cx<0?1:-1),cy-Math.sin(a)*22*opt.eye)})};
  const RE=[33,246,161,160,159,158,157,173,133,155,154,153,145,144,163,7],LE=[263,466,388,387,386,385,384,398,362,382,381,380,374,373,390,249];
  eye(RE,-100,0);eye(LE,100,0);set(33,-160,0);set(133,-40,0);set(263,160,0);set(362,40,0);set(159,-100,-22*opt.eye);set(145,-100,22*opt.eye);set(386,100,-22*opt.eye);set(374,100,22*opt.eye);
  [70,63,105,66,107].forEach((i,j)=>set(i,-170+j*30,-60-opt.brow));[300,293,334,296,336].forEach((i,j)=>set(i,170-j*30,-60-opt.brow));
  set(61,-80,230-opt.mouthUp);set(291,80,230-opt.mouthUp);set(13,0,225);set(14,0,235);set(0,0,210);set(17,0,255);
  set(50,-150,150-opt.cheekUp);set(280,150,150-opt.cheekUp);set(116,-170,90-opt.cheekUp);set(345,170,90-opt.cheekUp);
  set(234,-260,40);set(454,260,40);set(172,-200*opt.jaw,260);set(397,200*opt.jaw,260);set(152,0,380);set(10,0,-260);set(1,0,120,-30);set(2,0,150);
  const c=Math.cos(opt.roll*Math.PI/180),s=Math.sin(opt.roll*Math.PI/180),k=opt.scale;
  return P.map(p=>({x:(500+opt.shift+(p.x*c-p.y*s)*k)/W,y:(560+(p.x*s+p.y*c)*k)/H,z:p.z*k/W}))};
