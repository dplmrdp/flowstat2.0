export function switchScreen(n) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  document.getElementById('screen-' + n).classList.add('active');
}

export function showToast(m) {
  var t = document.getElementById('toast');
  t.textContent = m;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2000);
}
