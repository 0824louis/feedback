const sb = supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
const views = ['studentView', 'loginView', 'adminView'];
const RATINGS = ['satisfied', 'neutral', 'dissatisfied'];

function show(name) {
  views.forEach((v) => ($(v).hidden = v !== name));
  $('loginBtn').hidden = name !== 'studentView';
}

document.querySelectorAll('.vote').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const buttons = document.querySelectorAll('.vote');
    buttons.forEach((b) => (b.disabled = true));
    const { error } = await sb.from('votes').insert({ rating: btn.dataset.rating });
    $('msg').className = error ? 'err' : '';
    $('msg').textContent = error ? '저장에 실패했습니다. 다시 시도해 주세요.' : '투표가 완료되었습니다. 감사합니다.';
    buttons.forEach((b) => (b.disabled = false));
  });
});

$('loginBtn').onclick = () => { $('loginMsg').textContent = ''; show('loginView'); };
$('backBtn').onclick = () => show('studentView');

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { error } = await sb.auth.signInWithPassword({ email: $('email').value, password: $('password').value });
  if (error) { $('loginMsg').textContent = '로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요.'; return; }
  $('password').value = '';
  await openAdmin();
});

async function loadResults() {
  $('adminMsg').textContent = '';
  const { data, error } = await sb.from('votes').select('rating');
  if (error) { $('adminMsg').textContent = '결과를 불러오지 못했습니다.'; return; }
  render(data);
}

function render(rows) {
  const total = rows.length;
  $('total').textContent = total;
  RATINGS.forEach((r) => {
    const n = rows.filter((x) => x.rating === r).length;
    const pct = total ? Math.round((n / total) * 1000) / 10 : 0;
    $('t-' + r).textContent = `${n}표 (${pct}%)`;
    $('b-' + r).style.width = pct + '%';
  });
}

async function openAdmin() { show('adminView'); await loadResults(); }

$('refreshBtn').onclick = loadResults;

$('resetBtn').onclick = async () => {
  if (!confirm('모든 투표 결과를 초기화하시겠습니까? 삭제된 결과는 복구할 수 없습니다.')) return;
  const { error } = await sb.from('votes').delete().gte('id', 0);
  if (error) { $('adminMsg').textContent = '초기화에 실패했습니다.'; return; }
  render([]);
};

$('logoutBtn').onclick = async () => {
  await sb.auth.signOut();
  $('msg').textContent = '';
  show('studentView');
};

sb.auth.getSession().then(({ data }) => { if (data.session) openAdmin(); });
