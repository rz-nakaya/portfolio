// ヘッダーの「WORKS」メニュー。パソコンはマウスを乗せると開き、スマホはタップで開閉する
(function () {
  var drop = document.querySelector("[data-drop]");
  if (!drop) return;
  var btn = drop.querySelector("button");
  var timer;

  function setOpen(open) {
    drop.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  }

  if (window.matchMedia("(hover: hover)").matches) {
    drop.addEventListener("mouseenter", function () {
      clearTimeout(timer);
      setOpen(true);
    });
    // マウスが少しはみ出しただけで閉じないよう、閉じるまでに間を置く
    drop.addEventListener("mouseleave", function () {
      timer = setTimeout(function () { setOpen(false); }, 200);
    });
  }

  btn.addEventListener("click", function () {
    setOpen(!drop.classList.contains("open"));
  });

  drop.addEventListener("focusout", function (e) {
    if (!drop.contains(e.relatedTarget)) setOpen(false);
  });

  document.addEventListener("click", function (e) {
    if (!drop.contains(e.target)) setOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drop.classList.contains("open")) {
      setOpen(false);
      btn.focus();
    }
  });
})();
