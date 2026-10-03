(() => {
  // スマホ用メニューの開閉
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('global-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    });
  }

  // WEB予約フォーム(デモ): 入力 → 確認 → 完了。実際には送信しない
  const form = document.querySelector('[data-reserve-form]');
  if (!form) return;

  const steps = form.querySelectorAll('[data-step]');
  const stepLabels = document.querySelectorAll('[data-step-label]');
  const error = form.querySelector('[data-form-error]');
  const confirmList = form.querySelector('[data-confirm-list]');

  const show = (name) => {
    steps.forEach((el) => { el.hidden = el.dataset.step !== name; });
    stepLabels.forEach((el) => {
      const current = el.dataset.stepLabel === name;
      el.classList.toggle('is-current', current);
      if (current) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
    const target = form.querySelector(`[data-step="${name}"]`);
    const focusable = target.querySelector('.done-message, input, button');
    if (focusable) focusable.focus();
  };

  const validate = () => {
    let ok = true;
    form.querySelectorAll('[required]').forEach((el) => {
      const invalid = !el.value.trim();
      el.setAttribute('aria-invalid', String(invalid));
      if (invalid) ok = false;
    });
    error.hidden = ok;
    return ok;
  };

  const buildConfirm = () => {
    confirmList.replaceChildren();
    form.querySelectorAll('[data-step="input"] .field').forEach((field) => {
      const label = field.querySelector('label').firstChild.textContent.trim();
      const input = field.querySelector('input, select, textarea');
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = input.value.trim() || '(未入力)';
      row.append(dt, dd);
      confirmList.append(row);
    });
  };

  form.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-go]');
    if (!btn) return;
    const next = btn.dataset.go;
    if (next === 'confirm') {
      if (!validate()) return;
      buildConfirm();
    }
    show(next);
  });

  form.addEventListener('submit', (e) => e.preventDefault());
})();
