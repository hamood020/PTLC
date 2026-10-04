(function(){
"use strict";
const C=window.PTLC_CONFIG||{},URL=C.url,KEY=C.key,API=URL+"/rest/v1",AUTH=URL+"/auth/v1";
const page=document.body?.dataset?.page||"",ACCESS="icv_access_token",REFRESH="icv_refresh_token",USERNAME="icv_username",PROFILE="icv_profile";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
const money=v=>n(v).toLocaleString("en-US",{maximumFractionDigits:0})+" ر.ع";
const num=v=>n(v).toLocaleString("en-US",{maximumFractionDigits:0});
const pct=v=>{const x=Number(v);return Number.isFinite(x)?(x*100).toFixed(1)+"%":"—"};
const avg=(rows,k)=>{const a=rows.map(x=>Number(x[k])).filter(Number.isFinite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:0};
const sum=(rows,k)=>rows.reduce((s,x)=>s+n(x[k]),0);
const unique=(rows,k)=>[...new Set(rows.map(x=>x[k]).filter(v=>v!==null&&v!==undefined&&v!==""))].sort((a,b)=>String(a).localeCompare(String(b),"ar"));
const status=s=>{s=s||"غير منطبق";const c=s==="مستوفي"?"ok":s==="غير مستوفي"?"bad":s==="متأخر"?"warn":"neutral";return '<span class="status '+c+'">'+esc(s)+'</span>'};
function store(a,r,u){localStorage.setItem(ACCESS,a);if(r)localStorage.setItem(REFRESH,r);if(u)localStorage.setItem(USERNAME,u)}
function clearAuth(){[ACCESS,REFRESH,USERNAME,PROFILE].forEach(k=>localStorage.removeItem(k))}
async function refresh(){
 const r=localStorage.getItem(REFRESH);if(!r)throw Error("انتهت جلسة الدخول.");
 const res=await fetch(AUTH+"/token?grant_type=refresh_token",{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify({refresh_token:r})});
 const d=await res.json().catch(()=>({}));if(!res.ok||!d.access_token)throw Error("انتهت جلسة الدخول.");
 store(d.access_token,d.refresh_token||r,localStorage.getItem(USERNAME));return d.access_token
}
async function api(path,opt={},retry=true){
 let token=localStorage.getItem(ACCESS);if(!token)throw Error("لا توجد جلسة دخول.");
 const h=Object.assign({apikey:KEY,Authorization:"Bearer "+token},opt.headers||{});
 let body=opt.body;if(body&&typeof body!=="string"){h["Content-Type"]="application/json";body=JSON.stringify(body)}
 let res=await fetch(API+path,Object.assign({},opt,{body,headers:h}));
 if((res.status===401||res.status===403)&&retry){token=await refresh();h.Authorization="Bearer "+token;res=await fetch(API+path,Object.assign({},opt,{body,headers:h}))}
 const text=await res.text();let d=null;try{d=text?JSON.parse(text):null}catch{d=text}
 if(!res.ok)throw Error((d&&d.message)||(d&&d.hint)||(d&&d.error_description)||(d&&d.error)||("HTTP "+res.status));return d
}
async function signIn(username,password){
 const email=username.includes("@")?username:username+C.emailSuffix;
 const res=await fetch(AUTH+"/token?grant_type=password",{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify({email,password})});
 const d=await res.json().catch(()=>({}));if(!res.ok||!d.access_token)throw Error(d.error_description||"اسم المستخدم أو كلمة المرور غير صحيحة.");
 store(d.access_token,d.refresh_token,username.replace(C.emailSuffix,""));return d
}
async function profile(){
 const p=await api("/rpc/get_my_profile",{method:"POST",body:{}});
 const x=Array.isArray(p)?p[0]:p;if(!x||x.is_active===false)throw Error("الحساب غير نشط أو لا يملك صلاحية دخول.");
 localStorage.setItem(PROFILE,JSON.stringify(x));return x
}
async function boot(){
 if(page==="login")return null;
 try{return await profile()}catch(e){clearAuth();if(!location.pathname.endsWith("/login.html"))location.replace("./login.html");throw e}
}
function nav(){document.querySelectorAll(".nav a").forEach(a=>a.classList.toggle("active",a.dataset.page===page))}
function downloadCSV(rows,name){
 if(!rows.length)return;const cols=Object.keys(rows[0]);const lines=[cols,...rows.map(r=>cols.map(c=>String(r[c]??"").replace(/"/g,'""')))].map(r=>r.map(v=>'"'+v+'"').join(","));
 const b=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name||"export.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)
}
function init(){nav();window.PTLC={api,signIn,profile,boot,refresh,clearAuth,store,$,esc,n,money,num,pct,avg,sum,unique,status,downloadCSV,role:()=>{try{return JSON.parse(localStorage.getItem(PROFILE)||"{}").role||""}catch{return""}}};window.PTLC.ready=boot()}
window.addEventListener("DOMContentLoaded",init);
})();