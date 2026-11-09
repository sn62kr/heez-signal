// 랜딩 두 장(radar · soldout)이 같이 쓴다. 방문 · 버튼 · 신청을 Supabase 에 넣기만 한다(docs/validation.md · migrations/20261110120000_landing.sql).
// 내 컴퓨터에서 파일로 열거나 localhost · ?preview=1 이면 아무것도 보내지 않는다 — 화면만 본다.
(function () {
  'use strict';

  var SUPABASE_URL = 'https://mwbmvsfxleangruuzaif.supabase.co';
  // 공개 키(앱과 같은 것). 이 키로는 두 표에 넣기만 된다 — 읽기 · 고치기 · 지우기는 RLS 가 막는다
  var SUPABASE_KEY = 'sb_publishable_UshzceOM_oqV9W7xBx39NQ_cjWcwFnM';

  var page = document.body.getAttribute('data-page');
  var params = new URLSearchParams(location.search);
  var preview = location.protocol === 'file:' ||
    location.hostname === 'localhost' || location.hostname === '127.0.0.1' ||
    params.has('preview') || SUPABASE_KEY.indexOf('REPLACE') !== -1;

  function clip(v, n) {
    if (v == null) return null;
    v = String(v).trim();
    return v ? v.slice(0, n) : null;
  }

  var utm = {
    utm_source: clip(params.get('utm_source'), 64),
    utm_campaign: clip(params.get('utm_campaign'), 64),
    utm_content: clip(params.get('utm_content'), 64)
  };

  function newSession() {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint8Array(12);
      crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }
    return (Date.now().toString(16) + Math.random().toString(16).slice(2)).slice(0, 24);
  }
  var session = newSession();

  function insert(table, row) {
    if (preview) {
      console.log('[미리보기 — 보내지 않음]', table, row);
      return Promise.resolve(true);
    }
    return fetch(SUPABASE_URL + '/rest/v1/' + table, {
      method: 'POST',
      keepalive: true,
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row)
    }).then(function (res) { return res.ok; }, function () { return false; });
  }

  function track(kind) {
    return insert('lp_events', {
      page: page, kind: kind, session: session,
      utm_source: utm.utm_source, utm_campaign: utm.utm_campaign, utm_content: utm.utm_content
    });
  }

  if (preview) document.documentElement.setAttribute('data-preview', '');
  if (preview && params.has('open')) document.getElementById('signup').hidden = false; // 미리보기에서 신청 칸까지 보기
  track('view');

  // 가짜 버튼: 누르면 지금 단계를 밝히고 신청 칸을 연다
  var panel = document.getElementById('signup');
  Array.prototype.forEach.call(document.querySelectorAll('[data-cta]'), function (btn) {
    btn.addEventListener('click', function () {
      track('cta');
      panel.hidden = false;
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var first = panel.querySelector('[data-first]');
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 350);
    });
  });

  var LIMITS = { name: 60, contact: 80, region: 60, trade: 60, store: 120, sources: 300, product_count: 20, note: 500 };
  var form = document.getElementById('signup-form');
  var status = document.getElementById('signup-status');
  var done = document.getElementById('signup-done');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.elements.website && form.elements.website.value) return; // 사람 눈엔 안 보이는 칸 — 채워졌으면 봇
    var missing = Array.prototype.filter.call(form.querySelectorAll('[required]'), function (el) {
      return el.type === 'checkbox' ? !el.checked : !String(el.value).trim();
    });
    if (missing.length) {
      var onlyConsent = missing.length === 1 && missing[0].name === 'consent';
      status.textContent = onlyConsent ? '개인정보 수집 · 이용에 동의해 주셔야 신청할 수 있어요.' : '빈 칸을 채워 주세요.';
      missing[0].focus();
      return;
    }
    if (String(form.elements.contact.value).trim().length < 5) {
      status.textContent = '연락처를 다시 확인해 주세요.';
      form.elements.contact.focus();
      return;
    }

    var row = {
      page: page, consent: true, session: session,
      utm_source: utm.utm_source, utm_campaign: utm.utm_campaign, utm_content: utm.utm_content
    };
    Object.keys(LIMITS).forEach(function (k) {
      if (form.elements[k]) {
        var v = clip(form.elements[k].value, LIMITS[k]);
        if (v) row[k] = v;
      }
    });

    var button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = '';
    insert('leads', row).then(function (ok) {
      if (ok) {
        track('submit');
        form.hidden = true;
        done.hidden = false;
        done.focus();
      } else {
        button.disabled = false;
        status.textContent = '보내지 못했어요. 잠시 뒤 다시 눌러 주시거나 sn62kr@gmail.com 으로 알려 주세요.';
      }
    });
  });
})();
