/* Отправка заявок со всех форм сайта (вместо серверов Тильды).
   Заявка уходит на посредника (Google Apps Script), он пересылает её в Telegram. */
(function () {
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbx-LKi5KFHfxcNaSjlMiFpEziJG_AwUHmvTM49cuuzq0rRIxuWpqAgJCjx70cASXXd1/exec';
  var SUCCESS_URL = '/sps/';
  var SKIP = /^(tildaspec-|formservices|form-spec-|Checkbox$)/;

  function container(btn) {
    return btn.closest('.t-form') || btn.closest('.tn-atom__form') || btn.closest('.t-popup') || btn.closest('.t-rec');
  }

  function showError(box, btn, text) {
    var err = box.querySelector('.leads-err');
    if (!err) {
      err = document.createElement('div');
      err.className = 'leads-err';
      err.style.cssText = 'color:#e53935;font:14px/1.4 Arial,sans-serif;margin-top:10px;text-align:center;';
      btn.parentNode.insertBefore(err, btn.nextSibling);
    }
    err.textContent = text;
  }

  function mark(el, bad) {
    var vis = el.type === 'hidden' ? (el.closest('.t-input-block, .t-input-group') || el.parentNode).querySelector('input[type=tel], input:not([type=hidden])') : el;
    if (vis) vis.style.boxShadow = bad ? '0 0 0 2px #e53935' : '';
  }

  function collect(box) {
    var fields = [], errors = [], seenRadio = {};
    var els = box.querySelectorAll('input[name], textarea[name], select[name]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i], name = el.name, req = el.getAttribute('data-tilda-req') === '1';
      if (el.type === 'radio') {
        if (seenRadio[name]) continue;
        seenRadio[name] = 1;
        var checked = box.querySelector('input[type=radio][name="' + name.replace(/"/g, '\\"') + '"]:checked');
        if (req && !checked) errors.push('Ответьте на все вопросы');
        if (checked) fields.push([name, checked.value]);
        continue;
      }
      if (el.type === 'checkbox') {
        if (req && !el.checked) { errors.push('Подтвердите согласие с политикой конфиденциальности'); mark(el, true); }
        if (!SKIP.test(name) && el.checked) fields.push([name, el.value || 'да']);
        continue;
      }
      if (SKIP.test(name)) continue;
      var v = (el.value || '').trim();
      var rule = el.getAttribute('data-tilda-rule');
      var bad = req && !v;
      if (!bad && v && rule === 'phone' && v.replace(/\D/g, '').length < 10) bad = true;
      if (!bad && v && rule === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) bad = true;
      mark(el, bad);
      if (bad) errors.push(rule === 'phone' ? 'Укажите телефон полностью' : 'Заполните обязательные поля');
      else if (v) fields.push([name, v.slice(0, 1000)]);
    }
    return { fields: fields, errors: errors };
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.t-submit, button[type=submit]');
    if (!btn) return;
    var box = container(btn);
    if (!box || !box.querySelector('input[name]')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (btn.getAttribute('data-sending')) return;
    var res = collect(box);
    if (res.errors.length) { showError(box, btn, res.errors[0]); return; }
    if (!res.fields.length) { showError(box, btn, 'Заполните форму'); return; }
    var formName = box.querySelector('input[name="tildaspec-formname"]');
    var payload = {
      page: document.title.replace(/\s*\|.*$/, ''),
      url: location.href,
      form: formName ? formName.value : '',
      fields: res.fields
    };
    btn.setAttribute('data-sending', '1');
    btn.style.opacity = '0.6';
    showError(box, btn, '');
    var done = function () { location.href = SUCCESS_URL; };
    fetch(ENDPOINT, {
      method: 'POST', mode: 'no-cors', keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(done, function () {
      btn.removeAttribute('data-sending');
      btn.style.opacity = '';
      showError(box, btn, 'Не удалось отправить. Позвоните нам: +7 (917) 916-23-17');
    });
  }, true);
})();
