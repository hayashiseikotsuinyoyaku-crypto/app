// ぴかっto！フェイスの計算（施術前・後）
const fs=require('fs'),vm=require('vm'),synth=require('./face_synth.js');
const src=fs.readFileSync(__dirname+'/../kao.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const ctx={module:{}};vm.createContext(ctx);vm.runInContext(src+';this.FM=FM',ctx);const FM=ctx.FM;
const ok=(c,m)=>{console.log((c?'OK: ':'NG: ')+m);if(!c)process.exitCode=1};
const W=1000,H=1250,m0=FM.measure(synth(),W,H);
ok(Math.abs(m0.eyeAreaR-m0.eyeAreaL)<0.2&&m0.eyeOpenR>30&&m0.eyeOpenR<45,'目の大きさ・開き（左右同じ）: '+JSON.stringify([m0.eyeAreaR,m0.eyeOpenR]));
ok(Math.abs(m0.mouthR)<0.3&&Math.abs(m0.mouthTilt)<0.2,'口角（口の真ん中と同じ高さ）・口の傾き0: '+m0.mouthR);
ok(Math.abs(m0.yaw)<1&&Math.abs(m0.roll)<0.1,'正面・傾きなし');
// 写真の大きさ・顔の傾き・位置が違っても同じ数字
const m1=FM.measure(synth({roll:8,scale:0.7,shift:60}),W,H);
ok(['eyeAreaR','eyeOpenL','mouthR','cheekL','jawW','ratio'].every(k=>Math.abs(m1[k]-m0[k])<0.4)&&Math.abs(m1.roll-8)<0.2,'大きさ・傾き・位置が違っても同じ数字（傾きは roll に出る）');
// 施術後：目が大きく・口角と頬が上がり・あごが細い
const mA=FM.measure(synth({eye:1.12,mouthUp:8,cheekUp:10,jaw:0.95,brow:4}),W,H),D=FM.diff(m0,mA);
const g=k=>D.find(x=>x.k===k);
ok(g('eyeAreaR').ch>8&&g('eyeAreaR').better&&g('eyeOpenL').better,'目の大きさ・開き：＋（良くなった）: '+g('eyeAreaR').ch+'%');
ok(g('mouthR').ab&&g('mouthR').ch===4&&g('mouthR').better,'口角：差で出す（IPD100で+4）');
ok(g('cheekR').ch<0&&g('cheekR').better&&g('jawW').better&&g('jawW').ch<0,'頬が上がる（数字は小さく）・フェイスラインの幅が小さく');
ok(g('faceW').better===null,'顔の幅は良い・悪いを付けない');
const G=FM.highlights(D);console.log(G);
ok(G.some(t=>/両方の目が大きくなりました/.test(t))&&G.some(t=>/両方の口角が上がりました/.test(t))&&G.some(t=>/頬が上がりました/.test(t))&&G.length<=5,'変わったところ（大きい順・5つまで）');
// 左右差が小さくなる
const B2=FM.measure(synth(),W,H);B2.mouthR-=3;const A2=Object.assign({},B2,{mouthR:B2.mouthR+2.5});const D2=FM.diff(B2,A2);
ok(D2.find(x=>x.k==='mouthR-mouthL').better===true,'口角の左右差が小さくなった');
// 撮るときの確かめ
ok(FM.check(synth(),W,H).ok,'正面・まっすぐ → OK');
ok(/近づいて/.test(FM.check(synth({scale:0.4}),W,H).msg),'小さい → 近づいて');
ok(/傾き/.test(FM.check(synth({roll:7}),W,H).msg),'傾き7度 → まっすぐに');
ok(/真顔/.test(FM.check(synth(),W,H,{categories:[{categoryName:'mouthSmileLeft',score:0.6}]}).msg),'笑っている → 真顔で');
ok(!FM.check(null,W,H).ok,'顔なし');
