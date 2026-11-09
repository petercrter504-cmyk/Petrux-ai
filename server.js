const express = require('express');
const app = express();
app.use(express.json());
const K = process.env.GROQ_API_KEY || "";
const P = process.env.PORT || 3000;
const PAYSTACK_KEY = "pk_live_0005323d7c6a32424119b099aea2790c6ddb54e6";

const H = [
'<html><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0;font-family:Arial;background:#f5f5f5;max-width:480px;margin:auto">',
'<header style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#fff;position:sticky;top:0"><div><b>Petrux AI</b><br><small>Created by Peter Oriorowho</small></div><button onclick="openPro()" style="background:#FFD700;border:none;padding:10px 16px;border-radius:20px;font-weight:900">PRO</button></header>',
'<div style="display:flex;gap:6px;padding:10px"><button onclick="showTab(\'chat\')" style="flex:1;padding:10px;border-radius:20px;border:none;background:#00b894;color:#fff;font-weight:900">Chat</button><button onclick="showTab(\'img\')" style="flex:1;padding:10px;border-radius:20px;border:none;background:#6c5ce7;color:#fff;font-weight:900">Image</button><button onclick="showTab(\'music\')" style="flex:1;padding:10px;border-radius:20px;border:none;background:#e17055;color:#fff;font-weight:900">Music Lyrics</button></div>',
'<div id=tabChat><div id=c style="padding:12px;height:calc(100vh - 300px);overflow:auto"></div><button onclick="clearChat()" style="margin:0 12px 10px;padding:8px 14px;border:none;background:#eee;border-radius:20px">Clear Chat</button></div>',
'<div id=tabImg style="display:none;padding:12px"><input id=imgP style="width:100%;padding:14px;border-radius:15px;border:1px solid #ddd" placeholder="Describe image..."><button onclick="genImg()" style="width:100%;background:#6c5ce7;color:#fff;border:none;padding:14px;border-radius:20px;margin-top:8px;font-weight:900">Generate Image</button><div id=imgOut style="margin-top:10px"></div></div>',
'<div id=tabMusic style="display:none;padding:12px"><input id=musP style="width:100%;padding:14px;border-radius:15px;border:1px solid #ddd" placeholder="What song? e.g. Afrobeats about Lagos love"><button onclick="genLyrics()" style="width:100%;background:#e17055;color:#fff;border:none;padding:14px;border-radius:20px;margin-top:8px;font-weight:900">Generate Lyrics</button><div id=musOut style="background:#fff;padding:14px;border-radius:14px;margin-top:10px;white-space:pre-wrap"></div><button onclick="copyLyrics()" style="width:100%;background:#333;color:#fff;border:none;padding:12px;border-radius:20px;margin-top:8px">Copy Lyrics</button></div>',
'<div style="padding:10px;background:#fff;position:fixed;bottom:0;left:0;right:0;max-width:480px;margin:auto;box-shadow:0 -2px 10px #0002">',
'<div style="display:flex;gap:8px"><input id=i style="flex:1;padding:14px;border-radius:25px;border:1px solid #ddd;font-size:16px" placeholder="Ask Petrux...">',
'<button id=micBtn onclick="toggleMic()" style="width:50px;height:50px;border-radius:50%;background:#6c5ce7;color:#fff;border:none;font-size:22px">Mic</button>',
'<button id=voiceBtn onclick="toggleVoice()" style="width:50px;height:50px;border-radius:50%;background:#00b894;color:#fff;border:none;font-size:22px">Voice</button></div>',
'<button onclick="s()" style="width:100%;background:#00b894;color:#fff;border:none;padding:14px;border-radius:25px;margin-top:8px;font-weight:900">SEND</button>',
'<center><small id=proStatus>v37 - Fixed</small><br><small id=micStatus>Mic: OFF | Voice: ON</small><br><small id=memStatus></small></center></div>',
'<div id=proModal style="display:none;position:fixed;inset:0;background:#0008;z-index:99;align-items:center;justify-content:center;padding:20px"><div style="background:#fff;border-radius:20px;padding:20px;width:100%;max-width:380px">',
'<h2 style="margin:0">Petrux PRO</h2><p>Unlock unlimited</p>',
'<div onclick="goPay(1000)" style="border:2px solid #00b894;padding:12px;border-radius:12px;margin:8px 0"><b>Weekly - N1,000</b></div>',
'<div onclick="goPay(3000)" style="border:2px solid #FFD700;padding:12px;border-radius:12px;margin:8px 0"><b>Monthly - N3,000</b></div>',
'<div onclick="goPay(25000)" style="border:2px solid #6c5ce7;padding:12px;border-radius:12px;margin:8px 0"><b>Lifetime - N25,000</b></div>',
'<button onclick="closePro()" style="width:100%;padding:12px;border:none;background:#eee;border-radius:20px;margin-top:8px">Close</button></div></div>',
'<script>',
'let last="",pro=localStorage.getItem("pro")||"",micOn=false,rec=null;',
'let voiceOn=localStorage.getItem("voiceOn")!=="OFF";',
'let memory={};try{memory=JSON.parse(localStorage.getItem("petrux_memory")||"{}")}catch(e){memory={}}',
'let history=[];try{history=JSON.parse(localStorage.getItem("petrux_history")||"[]")}catch(e){history=[]}',
'if(pro)document.getElementById("proStatus").innerText="PRO ACTIVE - "+pro;',
'updateStatus();showOld();',
'function updateStatus(){document.getElementById("micStatus").innerText="Mic: "+(micOn?"ON":"OFF")+" | Voice: "+(voiceOn?"ON":"OFF");document.getElementById("voiceBtn").style.background=voiceOn?"#00b894":"#999";document.getElementById("memStatus").innerText=memory.name?("Remembering: "+memory.name):"Memory: Tell me your name"}',
'function showOld(){let c=document.getElementById("c");c.innerHTML="";history.slice(-20).forEach(function(h){if(h&&h.text)addBubble(h.text,h.role=="user")})}',
'function addBubble(text,isUser){let c=document.getElementById("c");let d=document.createElement("div");d.style.cssText="background:"+(isUser?"#00b894;color:#fff":"#fff")+";padding:12px;border-radius:15px;margin:8px 0";d.innerText=text;c.appendChild(d);c.scrollTop=99999;
