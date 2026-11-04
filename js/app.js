/* Cloud Tunnel — sirf ek tunnel: data phone <-> Drive, beech me koi server nahi.
   Halka rakha gaya hai taaki 1GB RAM phone par bhi chale. */
'use strict';

/* ---------- Performance mode: kamzor phone = lite ---------- */
(function perfMode(){
  var weak = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
             (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
             (navigator.connection && navigator.connection.saveData);
  if (weak) document.body.classList.add('lite');
  window.__LITE = !!weak;
  document.addEventListener('DOMContentLoaded', function(){
    var el = document.getElementById('perfInfo');
    if (el) el.textContent = weak ? 'Lite mode (kamzor phone ke liye halka)' : 'Full mode';
  });
})();

/* ---------- State ---------- */
var items = []; // {id, name, size, type:'photo'|'video'|'file', source:'local'|'drive', file?, url?, thumb?, driveId?, mime, accountEmail?}
var filter = 'all';
var accounts = []; // Drive accounts: {email, name, token, exp, usage, limit, state:'ok'|'expired'}
var activeEmail = ''; // uploads kis account me jayenge
try { activeEmail = localStorage.getItem('ct_active_account') || ''; } catch(e){}
var currentViewerItem = null;

function $(id){ return document.getElementById(id); }
function toast(msg){ var t=$('toast'); t.textContent=msg; t.classList.remove('hidden'); setTimeout(function(){t.classList.add('hidden')},2600); }
function fmtSize(b){ if(!b&&b!==0) return ''; if(b<1024) return b+' B'; if(b<1048576) return (b/1024).toFixed(0)+' KB'; if(b<1073741824) return (b/1048576).toFixed(1)+' MB'; return (b/1073741824).toFixed(2)+' GB'; }
function kindOf(name, mime){ if((mime&&mime.indexOf('video')===0)||/\.(mp4|mkv|webm|mov|avi)$/i.test(name)) return 'video'; if((mime&&mime.indexOf('image')===0)||/\.(jpg|jpeg|png|gif|webp|heic)$/i.test(name)) return 'photo'; return 'file'; }

/* ---------- Navigation ---------- */
document.querySelectorAll('.nav-btn').forEach(function(b){
  b.addEventListener('click', function(){
    document.querySelectorAll('.nav-btn').forEach(function(x){x.classList.remove('active')});
    document.querySelectorAll('.page').forEach(function(x){x.classList.remove('active')});
    b.classList.add('active');
    $('page-'+b.dataset.page).classList.add('active');
  });
});
function goPage(p){ document.querySelector('.nav-btn[data-page="'+p+'"]').click(); }

/* ---------- Local files ---------- */
$('btnAddLocal').addEventListener('click', function(){ $('fileInput').click(); });
$('btnAddFolder').addEventListener('click', function(){ $('folderInput').click(); });
function addLocalFiles(fileList){
  var added = 0;
  Array.prototype.forEach.call(fileList, function(f){
    items.unshift({
      id: 'l' + Date.now() + Math.random().toString(36).slice(2,7),
      name: f.name, size: f.size, type: kindOf(f.name, f.type), source: 'local',
      file: f, url: (f.type.indexOf('image')===0 || f.type.indexOf('video')===0) ? URL.createObjectURL(f) : null
    });
    added++;
  });
  if (added) toast(added + ' file jod di gayi');
  render();
}
$('fileInput').addEventListener('change', function(e){ addLocalFiles(e.target.files); e.target.value=''; });
$('folderInput').addEventListener('change', function(e){ addLocalFiles(e.target.files); e.target.value=''; });

if (navigator.storage && navigator.storage.estimate){
  navigator.storage.estimate().then(function(s){
    if (s && s.quota) $('phoneUsage').textContent = fmtSize(s.usage||0) + ' / ' + fmtSize(s.quota);
  }).catch(function(){});
}

/* ---------- Render ---------- */
function visibleItems(){
  return items.filter(function(it){
    if (filter==='all') return true;
    if (filter==='photo') return it.type==='photo';
    if (filter==='video') return it.type==='video';
    if (filter==='local') return it.source==='local';
    if (filter==='drive') return it.source==='drive';
    return true;
  });
}
function render(){
  var list = visibleItems();
  var grid = $('galleryGrid'); grid.innerHTML = '';
  var fl = $('fileList'); fl.innerHTML = '';
  $('galleryEmpty').style.display = list.length ? 'none' : 'block';

  var q = ($('searchInput').value || '').toLowerCase();
  var fileItems = items.filter(function(it){ return !q || it.name.toLowerCase().indexOf(q) !== -1; });
  $('filesEmpty').style.display = fileItems.length ? 'none' : 'block';

  list.slice(0, 120).forEach(function(it){ // ek saath zyada tiles nahi — halka rahe
    var d = document.createElement('div'); d.className = 'tile';
    var inner;
    if (it.source==='local') inner = '<span class="badge">📱 Phone</span>';
    else inner = '<span class="badge">☁️ <span style="color:' + colorFor(it.accountEmail) + '">●</span> ' + shortName(it.accountEmail) + '</span>';
    if (it.type==='photo' && (it.thumb || it.url)) inner += '<img loading="lazy" src="' + (it.thumb || it.url) + '" alt="">';
    else if (it.type==='video' && it.url && it.source==='local') inner += '<video src="' + it.url + '" preload="metadata" muted></video><span class="play">▶</span>';
    else if (it.type==='video') inner += '<span class="play" style="color:#333;text-shadow:none">🎬</span>';
    else inner += '<span class="play" style="color:#333;text-shadow:none">📄</span>';
    d.innerHTML = inner;
    d.addEventListener('click', function(){ openViewer(it); });
    grid.appendChild(d);
  });

  fileItems.slice(0, 200).forEach(function(it){
    var r = document.createElement('button'); r.className = 'file-row';
    var ico = it.type==='photo' ? '🖼️' : (it.type==='video' ? '🎬' : '📄');
    r.innerHTML = '<span class="file-ico">' + ico + '</span><span class="file-meta"><span class="file-name"></span><span class="file-sub">' +
      (it.source==='local' ? '📱 Phone' : '☁️ ' + it.accountEmail) + ' • ' + fmtSize(it.size) + '</span></span>' +
      (it.source==='local' ? '<span class="file-act" title="Drive me bhejo">☁️⬆️</span>' : '<span class="file-act">›</span>');
    r.querySelector('.file-name').textContent = it.name;
    r.addEventListener('click', function(ev){
      if (ev.target.classList.contains('file-act') && it.source==='local'){ uploadToDrive(it); return; }
      openViewer(it);
    });
    fl.appendChild(r);
  });
}
$('filterChips').addEventListener('click', function(e){
  if (!e.target.classList.contains('chip')) return;
  document.querySelectorAll('.chip').forEach(function(c){c.classList.remove('active')});
  e.target.classList.add('active'); filter = e.target.dataset.filter; render();
});
$('searchInput').addEventListener('input', render);

/* ---------- Viewer ---------- */
function openViewer(it){
  currentViewerItem = it;
  $('viewerName').textContent = it.name;
  var body = $('viewerBody'); body.innerHTML = '';
  $('viewerUpload').style.display = it.source==='local' ? 'block' : 'none';
  if (it.source==='drive' && it.driveId){
    var f = document.createElement('iframe');
    f.src = 'https://drive.google.com/file/d/' + it.driveId + '/preview';
    f.allow = 'autoplay; fullscreen'; body.appendChild(f);
  } else if (it.type==='photo' && it.url){
    var img = document.createElement('img'); img.src = it.url; body.appendChild(img);
  } else if (it.type==='video' && it.url){
    var v = document.createElement('video'); v.src = it.url; v.controls = true; v.autoplay = true; body.appendChild(v);
  } else {
    body.innerHTML = '<p style="color:#fff;font-size:14px;padding:20px;text-align:center">Is file ka preview yaha nahi khul sakta.</p>';
  }
  $('viewer').classList.remove('hidden');
}
$('viewerClose').addEventListener('click', function(){ $('viewer').classList.add('hidden'); $('viewerBody').innerHTML=''; });
$('viewerUpload').addEventListener('click', function(){ if (currentViewerItem) uploadToDrive(currentViewerItem); });
$('viewerDelete').addEventListener('click', function(){
  if (!currentViewerItem) return;
  if (!confirm('Delete kar dun? ' + currentViewerItem.name)) return;
  deleteItem(currentViewerItem);
  $('viewer').classList.add('hidden'); $('viewerBody').innerHTML='';
});

function deleteItem(it){
  if (it.source==='local'){
    items = items.filter(function(x){ return x.id !== it.id; });
    if (it.url) URL.revokeObjectURL(it.url);
    toast('List se hata diya (phone ki asal file gallery se delete hogi)');
    render();
  } else {
    var a = acctByEmail(it.accountEmail);
    if (!a){ toast('Ye account ab juda nahi hai'); return; }
    ensureToken(a, function(tok){
      if (!tok){ toast('Us account ka login khatm — Settings se Reconnect karo'); return; }
      fetch('https://www.googleapis.com/drive/v3/files/' + it.driveId, {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashed: true })
      }).then(function(r){
        if (r.ok){ items = items.filter(function(x){ return x.id !== it.id; }); toast('Drive ke Trash me bhej diya'); render(); }
        else toast('Delete nahi hua, dobara try karo');
      }).catch(function(){ toast('Net band lagta hai, baad me try karo'); });
    });
  }
}

/* ---------- Google Drive ---------- */
/* Ye app ki public pehchan hai (password/secret nahi) — code me khule aam rehti hai. */
var DEFAULT_CLIENT_ID = '392053295262-36cour4pq1hr3i6hq2e5u2jbi30g7b77.apps.googleusercontent.com';
function clientId(){ return (localStorage.getItem('ct_client_id') || DEFAULT_CLIENT_ID || '').trim(); }
$('btnSaveClientId').addEventListener('click', function(){
  var v = $('clientIdInput').value.trim();
  if (!v){ $('clientIdStatus').textContent = 'Pehle Client ID daalo'; return; }
  localStorage.setItem('ct_client_id', v);
  $('clientIdStatus').textContent = 'Save ho gaya. Ab Drive connect karo.';
});
if (clientId()){ $('clientIdInput').value = clientId(); $('clientIdStatus').textContent = 'Client ID save hai.'; }

function loadGis(cb){
  if (window.google && google.accounts) return cb();
  var s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.onload = cb; s.onerror = function(){ toast('Google login load nahi hua, net check karo'); };
  document.head.appendChild(s);
}
/* ---------- Multi-account helpers ---------- */
var ACC_COLORS = ['#2563eb','#16a34a','#d97706','#9333ea','#dc2626','#0891b2','#db2777','#65a30d'];
function acctByEmail(email){ for (var i=0;i<accounts.length;i++) if (accounts[i].email===email) return accounts[i]; return null; }
function shortName(email){ return email ? email.split('@')[0] : 'Drive'; }
function colorFor(email){ var a = acctByEmail(email); var i = a ? accounts.indexOf(a) : 0; return ACC_COLORS[i % ACC_COLORS.length]; }
function activeAccount(){ return acctByEmail(activeEmail) || accounts[0] || null; }
function setActive(email){ activeEmail = email; try{ localStorage.setItem('ct_active_account', email); }catch(e){} updateDriveUI(); }
function saveAccounts(){ try{ localStorage.setItem('ct_accounts_v1', JSON.stringify(accounts.map(function(a){ return {email:a.email, name:a.name, token:a.token, exp:a.exp}; }))); }catch(e){} }

function updateDriveUI(){
  var n = accounts.length;
  var st = $('driveStatus'); if (st) st.textContent = n ? (n + ' account jude hain ✅') : 'Not connected';
  var du = $('driveUsage');
  if (du){
    if (!n) du.textContent = 'Not connected';
    else {
      var u=0, l=0; accounts.forEach(function(a){ u += a.usage||0; l += a.limit||0; });
      du.textContent = fmtSize(u) + ' / ' + fmtSize(l) + ' (' + n + ' account)';
    }
  }
  var dc = $('btnDisconnectDrive'); if (dc) dc.classList.toggle('hidden', !n);
  var bc = $('btnConnectDrive'); if (bc) bc.textContent = n ? '+ Dusra account jodo' : 'Drive connect karo';
  var bc2 = $('btnConnectDrive2'); if (bc2) bc2.textContent = n ? '+ Ek aur account jodo' : 'Drive connect karo';
  var listEl = $('accountsList'); if (!listEl) return;
  listEl.innerHTML = '';
  if (!n){ listEl.innerHTML = '<p class="hint">Abhi koi Drive account nahi juda. Neeche wale button se apni Gmail jodo — jitne account chaho, jod sakte ho.</p>'; return; }
  var act = activeAccount();
  accounts.forEach(function(a){
    var row = document.createElement('div'); row.className = 'acct-row';
    var sub = a.state==='expired' ? 'Login khatm — Reconnect karo' : (fmtSize(a.usage||0) + ' / ' + fmtSize(a.limit||0) + ' bhara hai');
    row.innerHTML = '<span class="acct-dot" style="background:' + colorFor(a.email) + '"></span>' +
      '<span class="acct-meta"><span class="acct-email"></span><span class="acct-sub">' + sub + '</span></span>';
    row.querySelector('.acct-email').textContent = a.email;
    if (a.state==='expired'){
      var rb = document.createElement('button'); rb.className='mini-btn'; rb.textContent='Reconnect';
      rb.addEventListener('click', function(){ reconnectAccount(a.email); });
      row.appendChild(rb);
    } else if (act && act.email===a.email){
      var on = document.createElement('span'); on.className='mini-on'; on.textContent='Upload: yahi ✓'; row.appendChild(on);
    } else {
      var sb = document.createElement('button'); sb.className='mini-btn'; sb.textContent='Upload yahi';
      sb.addEventListener('click', function(){ setActive(a.email); toast('Upload ab ' + a.email + ' me jayega'); });
      row.appendChild(sb);
    }
    var xb = document.createElement('button'); xb.className='mini-btn danger'; xb.textContent='✕';
    xb.addEventListener('click', function(){ if (confirm(a.email + ' hata dun?')) removeAccount(a.email); });
    row.appendChild(xb);
    listEl.appendChild(row);
  });
}

function requestToken(opts, cb){
  loadGis(function(){
    var done = false;
    function fin(err, resp){ if (done) return; done = true; cb(err, resp); }
    try {
      var tc = google.accounts.oauth2.initTokenClient({
        client_id: clientId(),
        scope: 'https://www.googleapis.com/auth/drive',
        callback: function(resp){ if (resp && resp.access_token) fin(null, resp); else fin(new Error('token nahi mila')); },
        error_callback: function(){ fin(new Error('gis error')); }
      });
      tc.requestAccessToken({ prompt: opts.prompt || '', login_hint: opts.hint || undefined });
    } catch(e){ fin(e); }
  });
}
function ensureToken(a, cb){
  if (a.token && a.exp && (a.exp - Date.now() > 60000)) return cb(a.token);
  requestToken({ hint: a.email, prompt: '' }, function(err, resp){
    if (err || !resp){ a.state = 'expired'; saveAccounts(); updateDriveUI(); cb(null); return; }
    a.token = resp.access_token; a.exp = Date.now() + ((resp.expires_in || 3500) * 1000); a.state = 'ok';
    saveAccounts(); updateDriveUI(); cb(a.token);
  });
}
function finishConnect(token, expiresIn){
  fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', { headers: { 'Authorization': 'Bearer ' + token } }).then(function(r){ return r.json(); }).then(function(d){
    var email = d && d.user && d.user.emailAddress;
    if (!email){ toast('Account pehchana nahi gaya, dobara try karo'); return; }
    var a = acctByEmail(email);
    if (!a){ a = { email: email, usage: 0, limit: 0 }; accounts.push(a); }
    a.name = (d.user && d.user.displayName) || email;
    a.token = token; a.exp = Date.now() + ((expiresIn || 3500) * 1000); a.state = 'ok';
    if (d.storageQuota){ a.usage = +d.storageQuota.usage || 0; a.limit = +d.storageQuota.limit || 0; }
    if (!activeEmail) setActive(email);
    saveAccounts(); updateDriveUI(); loadDriveFiles(a);
    toast(email + ' jud gaya ✅');
  }).catch(function(){ toast('Account jodne me dikkat aayi'); });
}
function connectDrive(){
  if (!clientId()){ goPage('settings'); toast('Pehle Settings me Client ID daalo'); return; }
  requestToken({ prompt: 'select_account' }, function(err, resp){
    if (err){ toast('Login nahi hua'); return; }
    finishConnect(resp.access_token, resp.expires_in);
  });
}
function reconnectAccount(email){
  requestToken({ prompt: 'select_account', hint: email }, function(err, resp){
    if (err){ toast('Login nahi hua'); return; }
    finishConnect(resp.access_token, resp.expires_in);
  });
}
$('btnConnectDrive').addEventListener('click', connectDrive);
$('btnConnectDrive2').addEventListener('click', connectDrive);
$('btnDisconnectDrive').addEventListener('click', function(){
  accounts.forEach(function(a){ if (a.token && window.google && google.accounts && google.accounts.oauth2 && google.accounts.oauth2.revoke){ try { google.accounts.oauth2.revoke(a.token, function(){}); } catch(e){} } });
  accounts = []; activeEmail = '';
  items = items.filter(function(x){ return x.source !== 'drive'; });
  try { localStorage.setItem('ct_active_account', ''); } catch(e){}
  saveAccounts(); updateDriveUI(); render(); toast('Saare Drive account disconnect ho gaye');
});
function removeAccount(email){
  var a = acctByEmail(email);
  if (a && a.token && window.google && google.accounts && google.accounts.oauth2 && google.accounts.oauth2.revoke){ try { google.accounts.oauth2.revoke(a.token, function(){}); } catch(e){} }
  accounts = accounts.filter(function(x){ return x.email !== email; });
  items = items.filter(function(x){ return !(x.source==='drive' && x.accountEmail===email); });
  if (activeEmail === email) activeEmail = accounts.length ? accounts[0].email : '';
  try { localStorage.setItem('ct_active_account', activeEmail); } catch(e){}
  saveAccounts(); updateDriveUI(); render(); toast(email + ' hata diya');
}

function driveFetchA(tok, url){
  return fetch(url, { headers: { 'Authorization': 'Bearer ' + tok } }).then(function(r){ return r.json(); });
}
function loadDriveAboutA(a){
  ensureToken(a, function(tok){
    if (!tok) return;
    driveFetchA(tok, 'https://www.googleapis.com/drive/v3/about?fields=storageQuota').then(function(d){
      if (d.storageQuota){ a.usage = +d.storageQuota.usage || 0; a.limit = +d.storageQuota.limit || 0; updateDriveUI(); }
    }).catch(function(){});
  });
}
function loadDriveFiles(a){
  ensureToken(a, function(tok){
    if (!tok){ toast(a.email + ' ka login khatm — Settings se Reconnect karo'); return; }
    items = items.filter(function(x){ return !(x.source==='drive' && x.accountEmail===a.email); });
    var q = encodeURIComponent('trashed=false');
    var fields = encodeURIComponent('files(id,name,mimeType,size,modifiedTime,thumbnailLink)');
    driveFetchA(tok, 'https://www.googleapis.com/drive/v3/files?q=' + q + '&orderBy=modifiedTime desc&pageSize=60&fields=' + fields).then(function(d){
      if (!d.files) return;
      d.files.forEach(function(f){
        items.unshift({
          id: 'd' + a.email + ':' + f.id, driveId: f.id, accountEmail: a.email, name: f.name,
          size: f.size ? +f.size : 0, type: kindOf(f.name, f.mimeType), source: 'drive',
          thumb: f.thumbnailLink ? f.thumbnailLink.replace(/=s\d+$/, '=s360') : null, mime: f.mimeType
        });
      });
      render();
    }).catch(function(){});
  });
}

/* ---------- Upload: phone -> Drive ---------- */
function addTransfer(name, pct){
  var list = $('transferList');
  if (list.querySelector('.hint')) list.innerHTML = '';
  var row = document.createElement('p'); row.className = 'hint'; row.id = 'tr-' + name.replace(/\W/g,'');
  row.textContent = name + ' — ' + pct + '%'; list.prepend(row); return row;
}
function uploadToDrive(it){
  var a = activeAccount();
  if (!a){ toast('Pehle ek Drive account jodo'); goPage('settings'); return; }
  if (!it.file){ toast('Ye file phone me nahi hai'); return; }
  ensureToken(a, function(tok){
    if (!tok){ toast('Upload wale account ka login khatm — Settings se Reconnect karo'); return; }
    doUpload(it, a, tok);
  });
}
function doUpload(it, a, tok){
  var row = addTransfer(it.name + ' → ' + shortName(a.email), 0);
  var meta = { name: it.name, mimeType: it.file.type || 'application/octet-stream' };
  var form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', it.file);
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
  xhr.setRequestHeader('Authorization', 'Bearer ' + tok);
  xhr.upload.onprogress = function(e){ if (e.lengthComputable && row) row.textContent = it.name + ' — ' + Math.round(e.loaded / e.total * 100) + '%'; };
  xhr.onload = function(){
    if (xhr.status >= 200 && xhr.status < 300){ if (row) row.textContent = it.name + ' — ' + a.email + ' me chali gayi ✅'; toast('Drive me upload ho gaya'); loadDriveFiles(a); loadDriveAboutA(a); }
    else { if (row) row.textContent = it.name + ' — upload fail'; toast('Upload nahi hua'); }
  };
  xhr.onerror = function(){ if (row) row.textContent = it.name + ' — net error'; };
  xhr.send(form);
  goPage('transfer');
}

/* ---------- Link -> Drive ---------- */
$('btnLinkToDrive').addEventListener('click', function(){
  var url = $('linkInput').value.trim();
  if (!url){ $('linkStatus').textContent = 'Pehle link daalo'; return; }
  if (!activeAccount()){ $('linkStatus').textContent = 'Pehle ek Drive account jodo'; return; }
  $('linkStatus').textContent = 'Link se file aa rahi hai…';
  fetch(url).then(function(r){ if (!r.ok) throw 0; return r.blob(); }).then(function(blob){
    var name = url.split('/').pop().split('?')[0] || 'download';
    try { name = decodeURIComponent(name); } catch(e){}
    var fake = { name: name, file: new File([blob], name, { type: blob.type }) };
    $('linkStatus').textContent = 'File mil gayi, Drive me ja rahi hai…';
    uploadToDrive(fake);
  }).catch(function(){
    $('linkStatus').textContent = 'Is website ne link rok diya. File pehle phone me download karke Gallery se Drive me bhejo.';
  });
});

/* ---------- PWA ---------- */
if ('serviceWorker' in navigator && !window.__LITE){
  window.addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
}

/* ---------- Saved Drive accounts wapas lao ---------- */
(function restoreAccounts(){
  try { (JSON.parse(localStorage.getItem('ct_accounts_v1') || '[]')).forEach(function(s){
    accounts.push({ email: s.email, name: s.name || s.email, token: s.token, exp: s.exp, usage: 0, limit: 0, state: 'ok' });
  }); } catch(e){}
  if (!activeEmail && accounts.length) activeEmail = accounts[0].email;
  updateDriveUI();
  accounts.forEach(function(a){ loadDriveFiles(a); loadDriveAboutA(a); });
})();
render();
