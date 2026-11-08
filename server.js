import express from 'express';
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<title>Petrux AI</title>
<script src="https://js.paystack.co/v1/inline.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;-webkit-tap-highlight-color:transparent}
html,body{width:100%;overflow-x:hidden}
body{background:#fff;color:#111;display:flex;flex-direction:column;height:100dvh;min-height:100dvh;overflow:hidden}
header{flex-shrink:0;padding:10px 10px 10px 8px;display:flex;justify-content:space-between;align-items:center;gap:6px;border-bottom:1px solid #eee;background:#fff;z-index:10;width:100%;padding-top:max(10px,env(safe-area-inset-top))}
.hl{display:flex;align-items:center;gap:8px;min-width:0;flex:1}
#menuBtn{background:none;border:none;width:38px;height:38px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer}
#menuBtn span{width:20px;height:2.5px;background:#111;border-radius:2px;display:block}
.hl div{min-width:0;flex:1}
header h1{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
header p{font-size:11px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hr{display:flex;gap:6px;align-items:center;flex-shrink:0}
#themeBtn{background:#111;color:#fff;border:none;padding:9px 11px;border-radius:20px;cursor:pointer;font-weight:bold;font-size:13px;white-space:nowrap}
#proBtn{background:#FFD700;color:#111;border:none;padding:9px 11px;border-radius:20px;cursor:pointer;font-weight:bold;font-size:13px;white-space:nowrap;display:flex;align-items:center;gap:3px;line-height:1}
#proBadge{background:#FFD700;color:#111;font-size:10px;padding:2px 6px;border-radius:10px;margin-left:4px;font-weight:bold;white-space:nowrap}
#sidebarOverlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000}
#sidebar{position:fixed;top:0;left:-280px;width:260px;max-width:85vw;height:100dvh;background:#fff;z-index:1001;transition:.25s;padding:16px;display:flex;flex-direction:column;overflow-y:auto}
#sidebar.open{left:0}
#sidebar button{width:100%;text-align:left;background:#f7f7f8;border:none;padding:12px;border-radius:10px;margin-bottom:8px;font-size:15px;cursor:pointer}
#chat{flex:1;overflow-y:auto;overflow-x:hidden;padding:16px 12px 10px;max-width:760px;width:100%;margin:0 auto}
.welcome{text-align:center;margin-top:18px;padding:0 6px}
.welcome h2{font-size:24px;line-height:1.3}
.welcome p{color:#888;margin-top:8px;font-size:14px;line-height:1.5}
.suggest{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:16px}
.suggest button{padding:9px 12px;border-radius:20px;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:13px;max-width:100%}
.msg{max-width:92%;padding:12px 14px;border-radius:16px;margin-bottom:12px;line-height:1.6;font-size:15px;white-space:pre-wrap;word-break:break-word}
.user{background:#10a37f;color:#fff;margin-left:auto}
.ai{background:#f7f7f8;border:1px solid #eee;margin-right:auto}
.actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
.actions button{background:#fff;border:1px solid #ddd;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:12px}
#inputArea{flex-shrink:0;padding:10px 10px max(10px,env(safe-area-inset-bottom));max-width:760px;width:100%;margin:0 auto;background:#fff;border-top:1px solid #eee;z-index:10}
#tabs{display:flex;gap:6px;justify-content:center;margin-bottom:9px;flex-wrap:wrap}
#tabs button{padding:8px 14px;border-radius:20px;border:1px solid #ddd;background:#f0f0f0;cursor:pointer;font-size:13px}
#tabs button.active{background:#10a37f;color:#fff}
#inputBox{display:flex;gap:8px;align-items:center;width:100%}
#inputWrap{flex:1;min-width:0;display:flex;align-items:center;background:#f0f2f5;padding:4px 4px 4px 14px;border-radius:30px;border:1px solid #e0e0e0}
#input{flex:1;min-width:0;border:none;outline:none;font-size:15px;background:transparent;padding:10px 0}
#micBtn{background:none;border:none;width:38px;height:38px;flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:17px}
#sendBtn{background:#00a884;color:#fff;border:none;width:46px;height:46px;flex-shrink:0;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:17px}
#proModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;align-items:center;justify-content:center;padding:16px}
#proBox{background:#fff;border-radius:18px;padding:20px;max-width:380px;width:100%;text-align:center;max-height:90dvh;overflow-y:auto}
#proBox h2{font-size:22px}
#proBox ul{text-align:left;margin:14px 0;line-height:1.9;font-size:14px}
#payBtn{background:#10a37f;color:#fff;border:none;padding:14px;width:100%;border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer;margin-top:8px}
#closePro{background:#eee;border:none;padding:10px;width:100%;border-radius:12px;margin-top:8px;cursor:pointer}
body.dark{background:#212121;color:#eee}
body.dark header,body.dark #inputArea{background:#212121;border-color:#333}
body.dark .ai{background:#2f2f2f;border-color:#444}
body.dark #inputWrap{background:#2f2f2f;border-color:#444}
body.dark #input{color:#fff}
body.dark .suggest button{background:#2f2f2f;color:#eee;border-color:#444}
body.dark #menuBtn span{background:#eee}
body.dark #sidebar{background:#2f2f2f;color:#eee}
body.dark #sidebar button{background:#444;color:#eee}
body.dark #tabs button{background:#2f2f2f;color:#eee;border-color:#444}
body.dark .actions button{background:#444;color:#eee;border-color:#555}
body.dark #proBox{background:#2f2f2f;color:#eee}
body.dark #closePro{background:#444;color:#eee}
@media(max-width:360px){header h1{font-size:15px}header p{font-size:10px}#proBtn,#themeBtn{padding:8px 9px;font-size:12px}.welcome h2{font-size:21px}}
</style>
</head>
<body>
<header>
  <div class="hl">
    <button id="menuBtn" onclick="openMenu()"><span></span><span></span><span></span></button>
    <div><h1>Petrux AI <span id="proBadge" style="display:none">PRO</span></h1><p>Created by Peter Oriorowho</p></div>
  </div>
  <div class="hr"><button id="proBtn" onclick="openPro()">⭐ Pro</button><button id="themeBtn" onclick="toggleTheme()">Dark</button></div>
</header>
<div id="sidebarOverlay" onclick="closeMenu()"></div>
<div id="sidebar">
  <button onclick="closeMenu()" style="text-align:center;width:36px;align-self:flex-end;border-radius:50%">X</button>
  <h2>Petrux AI</h2>
  <p style="color:#888;font-size:12px;margin:4px 0 16px">Created by Peter Oriorowho</p>
  <button onclick="newChat()">✏️ New Chat</button>
  <button onclick="goMode('chat')">💬 Chat</button>
  <button onclick="goMode('music')">🎵 Music</button>
  <button onclick="goMode('image')">🖼️ Image</button>
  <button onclick="openPro()" style="background:#FFD700;font-weight:bold">⭐ Upgrade to PRO - ₦1,200 One-Time</button>
  <button onclick="toggleTheme();closeMenu()">🌙 Dark / Light</button>
  <p style="margin-top:auto;font-size:12px;color:#888">Petrux AI - v4 PRO<br>Created by Peter Oriorowho<br>Nekede, Imo State</p>
</div>
<div id="chat"><div class="welcome" id="welcome"><h2>What can I help with?</h2><p>Ask me anything — business, school, songs, images, coding</p><div class="suggest"><button onclick="quickAsk('Explain how to start a business in Nigeria with 50k')">Start business with 50k</button><button onclick="quickAsk('Write a love song for me')">Write a love song</button><button onclick="quickAsk('Teach me how to make money online as a student in Nigeria')">Make money online</button></div><p style="margin-top:12px;font-size:13px">FREE • v4 PRO • Tap ⭐ Pro to unlock Lifetime PRO</p></div></div>
<div id="inputArea"><div id="tabs"><button id="tabChat" class="active" onclick="setMode('chat')">💬 Chat</button><button id="tabMusic" onclick="setMode('music')">🎵 Music</button><button id="tabImage" onclick="setMode('image')">🖼️ Image</button></div><div id="inputBox"><div id="inputWrap"><input id="input" placeholder="Ask Petrux anything..."><button id="micBtn" onclick="toggleVoice()">🎤</button></div><button id="sendBtn" onclick="sendMsg()">➤</button></div><div style="font-size:12px;color:#888;text-align:center;margin-top:6px" id="voiceNote">Tap Mic to talk | v4 PRO ₦1,200 One-Time</div></div>
<div id="proModal"><div id="proBox"><h2>⭐ Petrux PRO</h2><p style="color:#888;margin-top:6px">Pay once, enjoy forever</p><h2 style="font-size:30px;margin:8px 0">₦1,200 <span style="font-size:14px;color:#888">one-time • Lifetime</span></h2><ul><li>✅ Unlimited Chat & Images</li><li>✅ Longer, smarter answers</li><li>✅ Priority - faster replies</li><li>✅ PRO ⭐ badge forever</li><li>✅ Support Peter Oriorowho</li></ul><input id="proEmail" placeholder="Enter your email" style="width:100%;padding:12px;border-radius:10px;border:1px solid #ddd;margin-bottom:8px"><button id="payBtn" onclick="payPro()">Pay ₦1,200 with Paystack</button><button id="closePro" onclick="closePro()">Close</button><p style="font-size:11px;color:#888;margin-top:10px">Secure payment by Paystack • Card, Transfer, Opay, Bank</p></div></div>
<script>
var PAYSTACK_LINK = "";
var PAYSTACK_KEY = "pk_live_0005323d7c6a32424119b099aea2790c6ddb54e6";
var PRO_AMOUNT = 120000;
if(localStorage.getItem('petrux_theme')==='dark'){document.body.classList.add('dark');document.getElementById('themeBtn').textContent='Light';}
if(localStorage.getItem('petrux_pro')==='yes'){document.getElementById('proBadge').style.display='inline';document.getElementById('proBtn').textContent='PRO ⭐';}
var mode='chat', lastUserMsg='', isSpeaking=false, isListening=false, recognition=null;
function openMenu(){document.getElementById('sidebar').classList.add('open');document.getElementById('sidebarOverlay').style.display='block';}
function closeMenu(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').style.display='none';}
function newChat(){closeMenu();document.getElementById('chat').innerHTML='<div class="welcome" id="welcome"><h2>What can I help with?</h2><p>Ask me anything</p><p style="color:#888;margin-top:8px">v4 PRO</p></div>';}
function goMode(m){closeMenu();setMode(m);}
function toggleTheme(){var d=document.body.classList.toggle('dark');localStorage.setItem('petrux_theme',d?'dark':'light');document.getElementById('themeBtn').textContent=d?'Light':'Dark';}
function setMode(m){mode=m;document.getElementById('tabChat').className='';document.getElementById('tabMusic').className='';document.getElementById('tabImage').className='';document.getElementById('tab'+(m==='chat'?'Chat':m==='music'?'Music':'Image')).className='active';document.getElementById('input').placeholder=m==='chat'?'Ask Petrux anything...':m==='music'?'What song do you want?':'What image do you want?';}
function openPro(){closeMenu();if(localStorage.getItem('petrux_pro')==='yes'){alert('You are already PRO ⭐ Thank you!');return;}document.getElementById('proModal').style.display='flex';}
function closePro(){document.getElementById('proModal').style.display='none';}
function unlockPro(){localStorage.setItem('petrux_pro','yes');document.getElementById('proBadge').style.display='inline';document.getElementById('proBtn').textContent='PRO ⭐';closePro();alert('Welcome to Petrux PRO ⭐! Payment successful. You now have Lifetime PRO. Thank you!');}
function payPro(){var email=document.getElementById('proEmail').value.trim();if(!email||!email.includes('@')){alert('Please enter your email first');return;}if(PAYSTACK_LINK&&PAYSTACK_LINK.indexOf('paystack.com')>-1){window.open(PAYSTACK_LINK,'_blank');alert('Complete your ₦1,200 payment on Paystack, then come back.');return;}if(!PAYSTACK_KEY||PAYSTACK_KEY==='YOUR_PAYSTACK_KEY'){alert('Peter has not added his Paystack link/key yet. Please come back soon!');return;}var handler=PaystackPop.setup({key:PAYSTACK_KEY,email:email,amount:PRO_AMOUNT,currency:'NGN',ref:'PETRUX-'+Date.now(),callback:function(res){unlockPro();},onClose:function(){}});handler.openIframe();}
function toggleVoice(){var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert('Voice not supported. Use Chrome.');return;}if(isListening&&recognition){recognition.stop();return;}recognition=new SR();recognition.lang='en-NG';recognition.onstart=function(){isListening=true;document.getElementById('voiceNote').textContent='Listening... Speak now...';};recognition.onresult=function(e){document.getElementById('input').value=e.results[0][0].transcript;sendMsg();};recognition.onend=function(){isListening=false;document.getElementById('voiceNote').textContent='Tap Mic to talk | v4 PRO';};recognition.start();}
function speakBtn(btn){var box=btn.parentElement.parentElement;var text=box.getAttribute('data-full')||box.innerText;if(isSpeaking){window.speechSynthesis.cancel();isSpeaking=false;btn.textContent='Read Aloud';return;}var u=new SpeechSynthesisUtterance(text.replace(/[*#_]/g,'').slice(0,2000));u.lang='en-NG';u.onend=function(){isSpeaking=false;btn.textContent='Read Aloud';};isSpeaking=true;btn.textContent='Stop';window.speechSynthesis.speak(u);}
function addMsg(role,text,show){var w=document.getElementById('welcome');if(w)w.remove();var c=document.getElementById('chat');var d=document.createElement('div');d.className='msg '+role;if(role==='ai'){d.innerHTML=text.replace(/\\*\\*(.*?)\\*\\*/g,'<b>$1</b>');if(show){var a=document.createElement('div');a.className='actions';var b1=document.createElement('button');b1.textContent='📋 Copy';b1.onclick=function(){try{navigator.clipboard.writeText(this.parentElement.parentElement.getAttribute('data-full'));}catch(e){}this.textContent='Copied!';};var b2=document.createElement('button');b2.textContent='🔊 Read Aloud';b2.onclick=function(){speakBtn(this);};var b3=document.createElement('button');b3.textContent='🔄 Regenerate';b3.onclick=function(){regenerate();};a.appendChild(b1);a.appendChild(b2);a.appendChild(b3);d.appendChild(a);d.setAttribute('data-full',text);}}else{d.textContent=text;}c.appendChild(d);c.scrollTop=c.scrollHeight;return d;}
function regenerate(){if(!lastUserMsg)return;var ms=document.querySelectorAll('#chat .msg.ai');if(ms.length)ms[ms.length-1].remove();callAI(lastUserMsg);}
function quickAsk(q){document.getElementById('input').value=q;sendMsg();}
function sendMsg(){var i=document.getElementById('input');var t=i.value.trim();if(!t)return;lastUserMsg=t;addMsg('user',t);i.value='';callAI(t);}
function localBrain(q){var s=q.toLowerCase();var pro=localStorage.getItem('petrux_pro')==='yes';var tag=pro?' [PRO ⭐ Answer] ':'';if(s.includes('hi')||s.includes('hello')||s.includes('hey'))return tag+"Hi! I'm Petrux AI, created by Peter Oriorowho. I'm doing well, thank you! How can I help you today?";if(s.includes('business')||s.includes('50k'))return tag+"**How to start a business in Nigeria with 50k:**\\n\\n1. Pick one thing: Pure water, data reselling, food, or thrift clothes.\\n2. Buy small: Use 30k to buy goods, keep 20k for transport.\\n3. Sell where people are: School gate, market, church, WhatsApp.\\n4. Save profit: Don't eat your capital.\\n5. Grow slowly.";if(s.includes('money')||s.includes('online'))return tag+"**How to make money online as a student in Nigeria:**\\n\\n1. Learn a skill (FREE): Copywriting, Canva design, CapCut editing.\\n2. Sell on WhatsApp / Fiverr.\\n3. Data reselling.\\n4. Tutoring JAMB / WAEC students.";if(s.includes('song')||s.includes('music')||s.includes('love'))return tag+"**Title: My Heart For You**\\n\\n(Verse 1)\\nFrom the first day I saw your smile,\\nMy heart has been walking a thousand miles.\\n\\n(Chorus)\\nOh, my love, you are my light,\\nYou make my darkness turn to bright.";if(s.includes('who are you')||s.includes('your name')||s.includes('who created')||s.includes('created you'))return "I am Petrux AI, created by Peter Oriorowho from Nekede, Imo State. I am here to help you learn, write, sing, and build your business. Ask me anything!";if(s.includes('peter')||s.includes('creator')||s.includes('created'))return "Peter Oriorowho is my creator. He built Petrux AI to help students and young Nigerians learn, earn, and create. He is from Nekede, Imo State.";return tag+"Great question about: '"+q+"'\\n\\n1. What is the goal?\\n2. Break it down into small steps.\\n3. Start today with the smallest step.\\n4. Tell me more details and I will give you a full plan.\\n\\nI am Petrux AI, created by Peter Oriorowho.";}
async function callAI(text){var typing=addMsg('ai','Petrux is typing...');try{if(mode==='image'){var imgUrl="https://image.pollinations.ai/prompt/"+encodeURIComponent(text)+"?nologo=true&width=512&height=512&seed="+Date.now();typing.remove();var m=addMsg('ai','Here is your image for: '+text,true);var im=document.createElement('img');im.src=imgUrl;im.style.width='100%';im.style.borderRadius='12px';im.style.marginTop='10px';m.appendChild(im);return;}if(mode==='music'){typing.remove();addMsg('ai',localBrain('song '+text),true);return;}var prompt="You are Petrux AI, created by Peter Oriorowho. Friendly, helpful, simple English. "+text;var controller=new AbortController();setTimeout(function(){controller.abort();},8000);var res=await fetch("https://text.pollinations.ai/"+encodeURIComponent(prompt),{signal:controller.signal});if(!res.ok)throw new Error('bad');var reply=await res.text();if(!reply||reply.length<5)throw new Error('empty');typing.remove();addMsg('ai',reply,true);}catch(e){typing.remove();addMsg('ai',localBrain(text),true);}}
document.getElementById('input').addEventListener('keypress',function(e){if(e.key==='Enter')sendMsg();});
</script>
</body>
</html>`);
});

app.get('*', (req, res) => res.redirect('/'));

app.listen(PORT, () => console.log('Petrux AI running on port ' + PORT));
