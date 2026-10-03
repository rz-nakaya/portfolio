// ハルカゼ精工 共通スクリプト
(function () {
  "use strict";

  // サイトのルート(corporate-site/)への相対パス。各ページの <body data-root="../"> から取得
  var root = document.body.getAttribute("data-root") || "./";

  /* ---------- スマホのメニュー開閉 ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var gnav = document.getElementById("gnav");
  if (toggle && gnav) {
    var setOpen = function (open) {
      gnav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    };
    toggle.addEventListener("click", function () {
      setOpen(!gnav.classList.contains("open"));
    });
    gnav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && gnav.classList.contains("open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ---------- お知らせ(TOPと一覧で共通のデータを表示) ---------- */
  var news = window.HARUKAZE_NEWS || [];
  var cats = window.HARUKAZE_NEWS_CATEGORIES || {};

  function formatDate(iso) {
    return iso.replace(/-/g, ".");
  }

  function renderNews(list, items) {
    list.innerHTML = "";
    if (!items.length) {
      var empty = document.createElement("li");
      empty.className = "news-empty";
      empty.textContent = "該当するお知らせはありません。";
      list.appendChild(empty);
      return;
    }
    items.forEach(function (n) {
      var li = document.createElement("li");
      var row = document.createElement(n.url ? "a" : "div");
      row.className = "item";
      if (n.url) row.href = root + n.url;
      var time = document.createElement("time");
      time.dateTime = n.date;
      time.textContent = formatDate(n.date);
      var cat = document.createElement("span");
      cat.className = "cat " + n.category;
      cat.textContent = cats[n.category] || n.category;
      var title = document.createElement("span");
      title.className = "title";
      title.textContent = n.title;
      row.append(time, cat, title);
      li.appendChild(row);
      list.appendChild(li);
    });
  }

  document.querySelectorAll("[data-news]").forEach(function (list) {
    var limit = parseInt(list.getAttribute("data-news"), 10) || news.length;
    var sorted = news.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    renderNews(list, sorted.slice(0, limit));

    var filter = document.querySelector("[data-news-filter]");
    if (filter) {
      filter.addEventListener("click", function (e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        filter.querySelectorAll("button").forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        var key = btn.getAttribute("data-cat");
        renderNews(list, key === "all" ? sorted : sorted.filter(function (n) { return n.category === key; }));
      });
    }
  });

  /* ---------- 導入事例の絞り込み ---------- */
  var caseFilter = document.querySelector("[data-case-filter]");
  if (caseFilter) {
    var cards = document.querySelectorAll("[data-industry]");
    var count = document.querySelector("[data-case-count]");
    var apply = function (key) {
      var shown = 0;
      cards.forEach(function (c) {
        var hit = key === "all" || c.getAttribute("data-industry") === key;
        c.hidden = !hit;
        if (hit) shown++;
      });
      if (count) count.textContent = shown + "件の事例を表示しています";
    };
    caseFilter.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      caseFilter.querySelectorAll("button").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      apply(btn.getAttribute("data-key"));
    });
    apply("all");
  }

  /* ---------- お問い合わせフォーム(入力→確認→完了。実際には送信しない) ---------- */
  var form = document.getElementById("contact-form");
  if (form) {
    var views = {
      input: document.getElementById("view-input"),
      confirm: document.getElementById("view-confirm"),
      done: document.getElementById("view-done")
    };
    var steps = document.querySelectorAll(".steps li");
    var summary = document.getElementById("error-summary");
    var confirmList = document.getElementById("confirm-list");

    // 採用ページから来た場合はご用件を「採用について」にしておく
    var params = new URLSearchParams(location.search);
    if (params.get("type") === "recruit") form.elements.topic.value = "採用について";

    var rules = [
      { name: "topic", label: "ご用件", check: function (v) { return v ? "" : "ご用件を選んでください。"; } },
      { name: "company", label: "会社名", check: function (v) { return v.trim() ? "" : "会社名を入力してください。個人の方は「個人」とご入力ください。"; } },
      { name: "name", label: "お名前", check: function (v) { return v.trim() ? "" : "お名前を入力してください。"; } },
      { name: "email", label: "メールアドレス", check: function (v) {
          if (!v.trim()) return "メールアドレスを入力してください。";
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "メールアドレスの形式が正しくありません(例: name@example.co.jp)。";
        } },
      { name: "tel", label: "電話番号", check: function (v) {
          return !v.trim() || /^[0-9０-９\-－ ()]{10,15}$/.test(v.trim()) ? "" : "電話番号は数字とハイフンで入力してください(例: 0000-00-0000)。";
        } },
      { name: "message", label: "ご相談内容", check: function (v) { return v.trim() ? "" : "ご相談内容を入力してください。"; } }
    ];

    var setError = function (name, msg) {
      var el = form.elements[name];
      var err = document.getElementById("err-" + name);
      if (el) el.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg;
    };

    var validateField = function (rule) {
      var msg = rule.check(form.elements[rule.name].value);
      setError(rule.name, msg);
      return msg;
    };

    rules.forEach(function (rule) {
      form.elements[rule.name].addEventListener("blur", function () { validateField(rule); });
    });

    var agree = form.elements.agree;
    var checkAgree = function () {
      var msg = agree.checked ? "" : "個人情報の取り扱いへの同意が必要です。";
      document.getElementById("err-agree").textContent = msg;
      return msg;
    };

    var show = function (key) {
      Object.keys(views).forEach(function (k) { views[k].hidden = k !== key; });
      var idx = { input: 0, confirm: 1, done: 2 }[key];
      steps.forEach(function (li, i) {
        li.classList.toggle("done", i < idx);
        if (i === idx) li.setAttribute("aria-current", "step");
        else li.removeAttribute("aria-current");
      });
      var target = views[key].querySelector("h2, [tabindex='-1']") || views[key];
      window.scrollTo({ top: document.querySelector(".steps").getBoundingClientRect().top + window.scrollY - 100 });
      if (target.focus) target.focus({ preventScroll: true });
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var errors = rules.map(validateField).filter(Boolean);
      var agreeErr = checkAgree();
      if (agreeErr) errors.push(agreeErr);
      if (errors.length) {
        summary.hidden = false;
        summary.textContent = "入力内容に" + errors.length + "件の不備があります。赤く表示された項目をご確認ください。";
        var first = form.querySelector("[aria-invalid='true']") || agree;
        first.focus();
        return;
      }
      summary.hidden = true;
      confirmList.innerHTML = "";
      var rows = rules.map(function (r) { return [r.label, form.elements[r.name].value.trim() || "(未入力)"]; });
      var file = form.elements.drawing.files[0];
      rows.splice(5, 0, ["図面ファイル", file ? file.name : "(添付なし)"]);
      rows.forEach(function (row) {
        var dt = document.createElement("dt");
        dt.textContent = row[0];
        var dd = document.createElement("dd");
        dd.textContent = row[1];
        confirmList.append(dt, dd);
      });
      show("confirm");
    });

    document.getElementById("btn-back").addEventListener("click", function () { show("input"); });
    document.getElementById("btn-send").addEventListener("click", function () {
      // デモのため送信はしない。ここで実際の送信処理(フォームサービスへのPOST等)を行う想定
      form.reset();
      rules.forEach(function (r) { setError(r.name, ""); });
      show("done");
    });
  }
})();
