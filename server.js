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
  <p style="margin-top:auto;font-size:12px;color:#888">Petrux AI - v5 SMART BRAIN<br>Created by Peter Oriorowho</p>
</div>
<div id="chat"><div class="welcome" id="welcome"><h2>What can I help with?</h2><p>Ask me anything — English, Maths, Science, History, Business 😄</p><div class="suggest"><button onclick="quickAsk('What is a noun?')">What is a noun?</button><button onclick="quickAsk('What is 2+2?')">What is 2+2?</button><button onclick="quickAsk('Tell me a funny joke')">Tell me a funny joke 😂</button></div><p style="margin-top:12px;font-size:13px">FREE • v5 SMART BRAIN • Tap ⭐ Pro to unlock Lifetime PRO</p></div></div>
<div id="inputArea"><div id="tabs"><button id="tabChat" class="active" onclick="setMode('chat')">💬 Chat</button><button id="tabMusic" onclick="setMode('music')">🎵 Music</button><button id="tabImage" onclick="setMode('image')">🖼️ Image</button></div><div id="inputBox"><div id="inputWrap"><input id="input" placeholder="Ask Petrux anything..."><button id="micBtn" onclick="toggleVoice()">🎤</button></div><button id="sendBtn" onclick="sendMsg()">➤</button></div><div style="font-size:12px;color:#888;text-align:center;margin-top:6px" id="voiceNote">Tap Mic to talk | v5 SMART BRAIN ₦1,200 One-Time</div></div>
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
function newChat(){closeMenu();document.getElementById('chat').innerHTML='<div class="welcome" id="welcome"><h2>What can I help with?</h2><p>Ask me anything 😄</p></div>';}
function goMode(m){closeMenu();setMode(m);}
function toggleTheme(){var d=document.body.classList.toggle('dark');localStorage.setItem('petrux_theme',d?'dark':'light');document.getElementById('themeBtn').textContent=d?'Light':'Dark';}
function setMode(m){mode=m;document.getElementById('tabChat').className='';document.getElementById('tabMusic').className='';document.getElementById('tabImage').className='';document.getElementById('tab'+(m==='chat'?'Chat':m==='music'?'Music':'Image')).className='active';document.getElementById('input').placeholder=m==='chat'?'Ask Petrux anything...':m==='music'?'What song do you want?':'What image do you want?';}
function openPro(){closeMenu();if(localStorage.getItem('petrux_pro')==='yes'){alert('You are already PRO ⭐ Thank you!');return;}document.getElementById('proModal').style.display='flex';}
function closePro(){document.getElementById('proModal').style.display='none';}
function unlockPro(){localStorage.setItem('petrux_pro','yes');document.getElementById('proBadge').style.display='inline';document.getElementById('proBtn').textContent='PRO ⭐';closePro();alert('Welcome to Petrux PRO ⭐! Payment successful. You now have Lifetime PRO. Thank you!');}
function payPro(){var email=document.getElementById('proEmail').value.trim();if(!email||!email.includes('@')){alert('Please enter your email first');return;}if(PAYSTACK_LINK&&PAYSTACK_LINK.indexOf('paystack.com')>-1){window.open(PAYSTACK_LINK,'_blank');alert('Complete your ₦1,200 payment on Paystack, then come back.');return;}if(!PAYSTACK_KEY||PAYSTACK_KEY==='YOUR_PAYSTACK_KEY'){alert('Peter has not added his Paystack link/key yet. Please come back soon!');return;}var handler=PaystackPop.setup({key:PAYSTACK_KEY,email:email,amount:PRO_AMOUNT,currency:'NGN',ref:'PETRUX-'+Date.now(),callback:function(res){unlockPro();},onClose:function(){}});handler.openIframe();}
function toggleVoice(){var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert('Voice not supported. Use Chrome.');return;}if(isListening&&recognition){recognition.stop();return;}recognition=new SR();recognition.lang='en-NG';recognition.onstart=function(){isListening=true;document.getElementById('voiceNote').textContent='Listening... Speak now...';};recognition.onresult=function(e){document.getElementById('input').value=e.results[0][0].transcript;sendMsg();};recognition.onend=function(){isListening=false;document.getElementById('voiceNote').textContent='Tap Mic to talk | v5 SMART BRAIN';};recognition.start();}
function speakBtn(btn){var box=btn.parentElement.parentElement;var text=box.getAttribute('data-full')||box.innerText;if(isSpeaking){window.speechSynthesis.cancel();isSpeaking=false;btn.textContent='Read Aloud';return;}var u=new SpeechSynthesisUtterance(text.replace(/[*#_]/g,'').slice(0,2000));u.lang='en-NG';u.onend=function(){isSpeaking=false;btn.textContent='Read Aloud';};isSpeaking=true;btn.textContent='Stop';window.speechSynthesis.speak(u);}
function addMsg(role,text,show){var w=document.getElementById('welcome');if(w)w.remove();var c=document.getElementById('chat');var d=document.createElement('div');d.className='msg '+role;if(role==='ai'){d.innerHTML=text.replace(/\\*\\*(.*?)\\*\\*/g,'<b>$1</b>');if(show){var a=document.createElement('div');a.className='actions';var b1=document.createElement('button');b1.textContent='📋 Copy';b1.onclick=function(){try{navigator.clipboard.writeText(this.parentElement.parentElement.getAttribute('data-full'));}catch(e){}this.textContent='Copied!';};var b2=document.createElement('button');b2.textContent='🔊 Read Aloud';b2.onclick=function(){speakBtn(this);};var b3=document.createElement('button');b3.textContent='🔄 Regenerate';b3.onclick=function(){regenerate();};a.appendChild(b1);a.appendChild(b2);a.appendChild(b3);d.appendChild(a);d.setAttribute('data-full',text);}}else{d.textContent=text;}c.appendChild(d);c.scrollTop=c.scrollHeight;return d;}
function regenerate(){if(!lastUserMsg)return;var ms=document.querySelectorAll('#chat .msg.ai');if(ms.length)ms[ms.length-1].remove();callAI(lastUserMsg);}
function quickAsk(q){document.getElementById('input').value=q;sendMsg();}
function sendMsg(){var i=document.getElementById('input');var t=i.value.trim();if(!t)return;lastUserMsg=t;addMsg('user',t);i.value='';callAI(t);}
function tryMath(q){var clean=q.toLowerCase().replace(/what is|calculate|solve|equals|\\?|percent of|% of/g,'').replace(/x/g,'*').replace(/÷/g,'/').trim();if(s=>0){}if(q.toLowerCase().includes('% of')||q.toLowerCase().includes('percent')){var m=q.match(/([0-9.]+)\\s*%?\\s*(?:of|percent)/i);var n=q.match(/of\\s*([0-9.]+)/i);if(m&&n){var p=parseFloat(m[1]);var v=parseFloat(n[1]);return "Easy! 😄\\n\\n**"+p+"% of "+v+" = "+(p*v/100)+"**\\n\\nYou multiply "+p+" divided by 100, times "+v+".";}}if(!/^[0-9\\s\\+\\-\\*\\/\\(\\)\\.\\%\\^]+$/.test(clean))return null;if(!/[\\+\\-\\*\\/\\%]/.test(clean))return null;try{var val=Function('"use strict";return ('+clean.replace(/\\^/g,'**')+')')();if(typeof val!=='number'||!isFinite(val))return null;return "Easy! 😄\\n\\n**"+q+" = "+(Math.round(val*100)/100)+"**\\n\\nWant me to solve another one? Send any maths like 15*4, 100/5, or 20% of 500.";}catch(e){return null;}}
function smartBrain(q){var s=q.toLowerCase().trim();var math=tryMath(q);if(math)return math;
var KB=[
['noun',"**What is a Noun?** 😄\\n\\nA noun is a naming word. It is the name of a person, place, animal, or thing.\\n\\n**Examples:**\\n- Person: Peter, teacher, mother\\n- Place: Lagos, school, market\\n- Animal: dog, lion, goat\\n- Thing: book, phone, chair\\n\\n**Example in a sentence:** *Peter bought a new book.*\\nPeter = noun (person), book = noun (thing).\\n\\nWant me to give you 10 more examples, or test you?"],
['verb',"**What is a Verb?** 😄\\n\\nA verb is an action word. It shows what someone does.\\n\\n**Examples:** run, eat, sing, play, write, dance, sleep.\\n\\n**Example:** *Mary sings beautifully.* — sings is the verb.\\n\\nWant examples in sentences?"],
['adjective',"**What is an Adjective?** 😄\\n\\nAn adjective is a describing word. It describes a noun.\\n\\n**Examples:** big, small, beautiful, tall, happy, red.\\n\\n**Example:** *A beautiful girl* — beautiful describes girl."],
['adverb',"**What is an Adverb?**\\n\\nAn adverb describes a verb. It tells how, when, or where.\\n\\n**Examples:** quickly, slowly, happily, yesterday.\\n**Example:** *He runs quickly.*"],
['pronoun',"**What is a Pronoun?**\\n\\nA pronoun replaces a noun to avoid repetition.\\n\\n**Examples:** he, she, it, they, we, you, I.\\n**Example:** *Peter is good. He is kind.* — He replaces Peter."],
['preposition',"**What is a Preposition?**\\n\\nA preposition shows position or direction.\\n\\n**Examples:** in, on, under, above, beside, behind.\\n**Example:** *The book is on the table.*"],
['conjunction',"**What is a Conjunction?**\\n\\nA conjunction joins words or sentences.\\n\\n**Examples:** and, but, or, because, so.\\n**Example:** *I like rice and beans.*"],
['photosynthesis',"**What is Photosynthesis?** 🌱\\n\\nPhotosynthesis is how plants make their own food using sunlight.\\n\\nPlants take: Sunlight + Water + Carbon Dioxide → and make Glucose (food) + Oxygen.\\n\\nThat is why plants are green, and why we get fresh air!\\n\\nWant me to explain it for JAMB / WAEC?"],
['gravity',"**What is Gravity?** 🌍\\n\\nGravity is the force that pulls everything towards the Earth.\\n\\nThat is why when you throw a ball up, it comes back down. Isaac Newton discovered it when an apple fell from a tree!"],
['water',"**What is Water?** 💧\\n\\nWater is H2O — 2 hydrogen atoms + 1 oxygen atom.\\n\\nWe need water to live. We drink it, cook with it, and plants need it to grow. About 70% of the Earth is water!"],
['electricity',"**What is Electricity?** ⚡\\n\\nElectricity is the flow of tiny particles called electrons through a wire.\\n\\nIt powers your phone, light, fan, and TV. It is made in power stations and carried by wires to our homes."],
['computer',"**What is a Computer?** 💻\\n\\nA computer is an electronic machine that takes input, processes it, and gives output.\\n\\n**Examples:** phone, laptop, tablet. You type (input), it thinks (process), it shows result (output)."],
['internet',"**What is the Internet?** 🌐\\n\\nThe internet is a worldwide network that connects millions of computers and phones.\\n\\nIt lets you chat, watch videos, learn, and do business with people all over the world."],
['nigeria',"**Nigeria** 🇳🇬\\n\\nNigeria is a country in West Africa. It is the most populous country in Africa, with over 220 million people.\\n\\nCapital: Abuja. Biggest city: Lagos. Currency: Naira (₦). Languages: English + over 500 local languages like Yoruba, Igbo, Hausa."],
['abuja',"The capital of Nigeria is **Abuja**. Lagos is the biggest city and commercial capital, but Abuja is the official capital where the President lives."],
['lagos',"Lagos is the biggest city in Nigeria and the commercial capital. It is famous for business, music, markets, and entertainment. Former capital of Nigeria before Abuja."],
['solar system',"**The Solar System** ☀️\\n\\nOur Solar System has 8 planets going round the Sun:\\n\\nMercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.\\n\\nWe live on Earth — the only planet known to have life!"],
['earth',"**Earth** 🌍\\n\\nEarth is our planet. It is the 3rd planet from the Sun. It takes 365 days to go round the Sun (1 year) and 24 hours to spin once (1 day). About 70% is water."],
['human body',"**The Human Body** 🧍\\n\\nYour body has: Head, brain, heart, lungs, stomach, bones, muscles, blood.\\n\\nThe heart pumps blood, the lungs help you breathe, the brain controls everything."],
['blood',"**Blood** 🩸\\n\\nBlood carries oxygen and food around your body.\\n\\nAn adult has about
