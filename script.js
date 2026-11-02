/* Kadirkhil High School — alumni (Supabase + localStorage), blog (localStorage),
 * donation modal (Google Form embed with bKash trxid validator).
 *
 * IMPORTANT: include supabase.js BEFORE this script if you want Supabase enabled.
 */

(() => {
  // ---------- Footer year ----------
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = formatNumber(new Date().getFullYear());

  // ---------- Config ----------
  const KEY_ALUMNI = 'khs.alumni.v1';
  const KEY_POSTS  = 'khs.posts.v1';

  // Google Form URLs — fill in once you've built them in Google Forms.
  const FORM_REGISTRATION_URL = ''; // Alumni "full registration + bKash donation" form
  const FORM_DONATION_URL    = ''; // Donation-only form (optional; leave '' if you want registration+donation combined)
  const DONATION_GOAL_BDT    = 500000; // displayed in the modal
  const DONATION_PURPOSES = [
    'সাধারণ তহবিল',
    'শিক্ষার্থীদের বৃত্তি',
    'ভবন ও অবকাঠামো',
    'খেলাধুলার সরঞ্জাম',
    'গ্রন্থাগারের বই',
    'অন্যান্য (ফর্মে উল্লেখ করুন)'
  ];

  // ---------- Storage helpers ----------
  const read = (key) => {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  };
  const write = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  // ---------- Supabase helpers (lazy) ----------
  const cfg = window.KHS_SUPABASE || {};
  const useSupabase = !!(cfg.USE_SUPABASE && cfg.URL && cfg.ANON_KEY);

  function getSupabase() {
    if (!useSupabase) return null;
    if (window.supabase) return window.supabase.createClient(cfg.URL, cfg.ANON_KEY);
    return null;
  }

  async function supabaseList() {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { data, error } = await sb
      .from(cfg.TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    // normalise to the legacy shape used by the renderer
    return (data || []).map(r => ({
      id: r.id,
      name: r.full_name,
      year: r.grad_year,
      email: r.email,
      profession: r.profession,
      location: r.location,
      message: r.message,
      createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now()
    }));
  }

  async function supabaseInsert(entry) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { error } = await sb.from(cfg.TABLE).insert({
      full_name:  entry.name,
      grad_year:  Number(entry.year) || null,
      email:      entry.email || null,
      profession: entry.profession || null,
      location:   entry.location || null,
      message:    entry.message || null
    });
    if (error) throw error;
  }

  // =====================================================================
  // Alumni page (Supabase when configured, localStorage fallback)
  // =====================================================================
  const alumniForm   = document.getElementById('alumni-form');
  const alumniList   = document.getElementById('alumni-list');
  const alumniCount  = document.getElementById('alumni-count');
  const alumniSearch = document.getElementById('alumni-search');
  const exportBtn    = document.getElementById('export-alumni');
  const formStatus   = document.getElementById('form-status');

  if (alumniForm) {
    let alumni = useSupabase ? [] : read(KEY_ALUMNI);

    const showStatus = (msg, kind) => {
      if (!formStatus) return;
      formStatus.textContent = msg;
      formStatus.className = 'status' + (kind ? ' ' + kind : '');
    };

    const render = (filter = '', source = alumni) => {
      const q = filter.trim().toLowerCase();
      const filtered = q
        ? source.filter(a =>
            [a.name, a.year, a.profession, a.location, a.email, a.message]
              .filter(Boolean).join(' ').toLowerCase().includes(q))
        : source;

      alumniCount.textContent = formatNumber(source.length);

      if (filtered.length === 0) {
        alumniList.innerHTML = source.length === 0
          ? '<p class="muted empty">এখনো কোনো নিবন্ধন নেই। উপরের ফর্মে প্রথম হিসেবে নিবন্ধন করুন।</p>'
          : '<p class="muted empty">এই অনুসন্ধানে কোনো তথ্য পাওয়া যায়নি।</p>';
        return;
      }

      const sorted = [...filtered].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      alumniList.innerHTML = sorted.map(a => `
        <div class="alumni-card" data-id="${a.id}">
          <div class="name">${escapeHtml(a.name)}</div>
          <div class="meta">
            <span>${escapeHtml(formatYear(a.year))} সালের ব্যাচ</span>
            ${a.profession ? `<span>· ${escapeHtml(a.profession)}</span>` : ''}
            ${a.location   ? `<span>· ${escapeHtml(a.location)}</span>` : ''}
          </div>
          ${a.email ? `<div class="meta"><a href="mailto:${escapeAttr(a.email)}">${escapeHtml(a.email)}</a></div>` : ''}
          ${a.message ? `<div class="msg">${escapeHtml(a.message)}</div>` : ''}
          <button type="button" class="delete" data-action="delete"
                  aria-label="${escapeAttr(a.name)} কে তালিকা থেকে সরান">সরান</button>
        </div>
      `).join('');
    };

    const refreshFromSource = async () => {
      if (useSupabase) {
        try {
          alumni = await supabaseList();
          render(alumniSearch ? alumniSearch.value : '', alumni);
        } catch (err) {
          console.warn('Supabase read failed, falling back to localStorage', err);
          alumni = read(KEY_ALUMNI);
          render(alumniSearch ? alumniSearch.value : '', alumni);
          showStatus('লাইভ প্রাক্তন শিক্ষার্থী ডিরেক্টরি লোড করা যায়নি — সংরক্ষিত তথ্য দেখানো হচ্ছে।', 'err');
        }
      } else {
        alumni = read(KEY_ALUMNI);
        render(alumniSearch ? alumniSearch.value : '', alumni);
      }
    };

    alumniForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showStatus('', null);

      const fd = new FormData(alumniForm);
      const entry = {
        id: 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: (fd.get('name') || '').trim(),
        year: Number(fd.get('year')) || '',
        email: (fd.get('email') || '').trim(),
        profession: (fd.get('profession') || '').trim(),
        location: (fd.get('location') || '').trim(),
        message: (fd.get('message') || '').trim(),
        createdAt: Date.now(),
      };

      if (!entry.name || !entry.year) {
        showStatus('নাম ও পাশের সন দেওয়া আবশ্যক।', 'err');
        return;
      }

      // Always keep a local copy so the directory never feels empty
      const local = read(KEY_ALUMNI);
      local.push(entry);
      write(KEY_ALUMNI, local);

      if (useSupabase) {
        try {
          await supabaseInsert(entry);
          showStatus(`স্বাগতম, ${entry.name}! প্রাক্তন শিক্ষার্থী ডিরেক্টরিতে সংরক্ষিত হয়েছে।`, 'ok');
        } catch (err) {
          console.warn('Supabase write failed', err);
          showStatus(`স্বাগতম, ${entry.name}! স্থানীয়ভাবে সংরক্ষিত হয়েছে; পরবর্তীবার আবার চেষ্টা করা হবে।`, 'err');
        }
      } else {
        showStatus(`স্বাগতম, ${entry.name}! স্থানীয়ভাবে সংরক্ষিত হয়েছে (Supabase কনফিগার করা হয়নি)।`, 'ok');
      }

      alumniForm.reset();
      await refreshFromSource();
    });

    alumniList.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action="delete"]');
      if (!btn) return;
      const card = btn.closest('.alumni-card');
      if (!card) return;
      const id = card.dataset.id;
      const target = alumni.find(a => a.id === id);
      if (!target) return;
      if (!confirm(`${target.name} কে তালিকা থেকে সরিয়ে ফেলবেন?`)) return;

      // localStorage removal
      write(KEY_ALUMNI, read(KEY_ALUMNI).filter(a => a.id !== id));

      if (useSupabase && getSupabase() && !id.startsWith('a_')) {
        try {
          await getSupabase().from(cfg.TABLE).delete().eq('id', id);
        } catch (err) {
          console.warn('Supabase delete failed', err);
        }
      }
      await refreshFromSource();
    });

    if (alumniSearch) {
      alumniSearch.addEventListener('input', () => render(alumniSearch.value, alumni));
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        let data = alumni;
        if (useSupabase) {
          try { data = await supabaseList(); } catch (_) { /* keep cache */ }
        }
        if (!data.length) { alert('রপ্তানি করার মতো কোনো তথ্য এখনো নেই।'); return; }
        downloadJson(data, 'khs-alumni.json');
      });
    }

    // initial paint
    refreshFromSource();
  }

  // =====================================================================
  // Blog page (localStorage only — blog was not in this scope)
  // =====================================================================
  const postForm   = document.getElementById('post-form');
  const postsList  = document.getElementById('posts-list');
  const postsCount = document.getElementById('posts-count');
  const postSearch = document.getElementById('posts-search');
  const exportPosts = document.getElementById('export-posts');
  const postStatus = document.getElementById('post-status');

  if (postForm) {
    let posts = read(KEY_POSTS);

    const render = (filter = '') => {
      posts = read(KEY_POSTS);
      const q = filter.trim().toLowerCase();
      const filtered = q
        ? posts.filter(p =>
            [p.title, p.author, p.body].filter(Boolean).join(' ').toLowerCase().includes(q))
        : posts;

      postsCount.textContent = formatNumber(posts.length);

      if (filtered.length === 0) {
        postsList.innerHTML = posts.length === 0
          ? '<p class="muted empty">এখনো কোনো পোস্ট নেই। উপরে প্রথম হিসেবে প্রকাশ করুন।</p>'
          : '<p class="muted empty">এই অনুসন্ধানে কোনো পোস্ট পাওয়া যায়নি।</p>';
        return;
      }

      const sorted = [...filtered].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      postsList.innerHTML = sorted.map(p => `
        <article class="post" data-id="${p.id}">
          <h4>${escapeHtml(p.title)}</h4>
          <div class="meta">লেখক: ${escapeHtml(p.author)} &middot; ${formatDate(p.createdAt)}</div>
          <div class="body">${escapeHtml(p.body)}</div>
          <button type="button" class="delete" data-action="delete-post"
                  aria-label="${escapeAttr(p.title)} পোস্টটি মুছুন">পোস্ট মুছুন</button>
        </article>
      `).join('');
    };

    postForm.addEventListener('submit', (e) => {
      e.preventDefault();
      postStatus.textContent = '';
      postStatus.className = 'status';

      const fd = new FormData(postForm);
      const entry = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        title: (fd.get('title') || '').trim(),
        author: (fd.get('author') || '').trim(),
        body: (fd.get('body') || '').trim(),
        createdAt: Date.now(),
      };

      if (!entry.title || !entry.author || !entry.body) {
        postStatus.textContent = 'শিরোনাম, লেখকের নাম ও পোস্ট দেওয়া আবশ্যক।';
        postStatus.classList.add('err');
        return;
      }

      posts.push(entry);
      write(KEY_POSTS, posts);
      postForm.reset();
      postStatus.textContent = 'পোস্ট প্রকাশিত হয়েছে।';
      postStatus.classList.add('ok');
      render(postSearch ? postSearch.value : '');
    });

    postsList.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action="delete-post"]');
      if (!btn) return;
      const post = btn.closest('.post');
      if (!post) return;
      const id = post.dataset.id;
      const data = read(KEY_POSTS);
      const target = data.find(p => p.id === id);
      if (!target) return;
      if (!confirm(`"${target.title}" পোস্টটি মুছে ফেলবেন?`)) return;
      write(KEY_POSTS, data.filter(p => p.id !== id));
      render(postSearch ? postSearch.value : '');
    });

    if (postSearch) {
      postSearch.addEventListener('input', () => render(postSearch.value));
    }

    if (exportPosts) {
      exportPosts.addEventListener('click', () => {
        const data = read(KEY_POSTS);
        if (data.length === 0) {
          alert('রপ্তানি করার মতো কোনো পোস্ট এখনো নেই।');
          return;
        }
        downloadJson(data, 'khs-posts.json');
      });
    }

    render();
  }

  // =====================================================================
  // "Register as Alumni" modal — split into directory vs full+donation
  // =====================================================================
  const modal = document.getElementById('register-modal');
  if (modal) {
    const tabDirectory    = document.getElementById('tab-directory');
    const tabFull         = document.getElementById('tab-full');
    const panelDirectory  = document.getElementById('panel-directory');
    const panelFull       = document.getElementById('panel-full');
    const trxInput        = document.getElementById('bkash-trx');
    const trxEcho         = document.getElementById('bkash-echo');
    const formLivePreview = document.getElementById('form-live-preview');
    const goalAmount      = document.getElementById('goal-amount');
    const openers         = document.querySelectorAll('[data-open-register]');
    const closers         = modal.querySelectorAll('[data-close-modal]');
    const closeBtn        = modal.querySelector('.modal-close');
    let lastFocused = null;   // restored on close so keyboard users keep their place

    if (goalAmount) goalAmount.textContent = '৳' + Number(DONATION_GOAL_BDT).toLocaleString('bn-BD');

    const open = () => {
      lastFocused = document.activeElement;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    };
    const close = () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    };

    openers.forEach(b => b.addEventListener('click', (e) => {
      e.preventDefault();
      open();
    }));
    closers.forEach(b => b.addEventListener('click', close));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) close();
    });

    const showTab = (which) => {
      const isDir = which === 'directory';
      tabDirectory.classList.toggle('active', isDir);
      tabFull.classList.toggle('active', !isDir);
      tabDirectory.setAttribute('aria-selected', String(isDir));
      tabFull.setAttribute('aria-selected', String(!isDir));
      tabDirectory.tabIndex = isDir ? 0 : -1;
      tabFull.tabIndex = isDir ? -1 : 0;
      panelDirectory.hidden = !isDir;
      panelFull.hidden = isDir;
      refreshFullPreview();
    };
    tabDirectory.addEventListener('click', () => showTab('directory'));
    tabFull.addEventListener('click', () => showTab('full'));

    // Roving tabindex + arrow-key navigation, as expected on a tablist.
    const tabs = [tabDirectory, tabFull];
    tabs.forEach(tab => {
      tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
      tab.addEventListener('keydown', (e) => {
        const index = tabs.indexOf(tab);
        let next = null;
        if (e.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
        if (e.key === 'ArrowLeft')  next = tabs[(index - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home')        next = tabs[0];
        if (e.key === 'End')         next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        showTab(next === tabDirectory ? 'directory' : 'full');
        next.focus();
      });
    });

    // Populate donation purposes
    const purposeSel = document.getElementById('donation-purpose');
    if (purposeSel) {
      purposeSel.innerHTML = DONATION_PURPOSES.map(p => `<option>${escapeHtml(p)}</option>`).join('');
    }

    // Live preview summary for the Google Form tab
    function refreshFullPreview() {
      if (!formLivePreview) return;
      if (!FORM_REGISTRATION_URL && !FORM_DONATION_URL) {
        formLivePreview.innerHTML = `
          <div class="form-empty">
            <p><strong>ফর্ম এখনো কনফিগার করা হয়নি।</strong></p>
            <p class="muted">Google Form-এর লিংক <code>script.js</code> (বা <code>supabase.js</code>) ফাইলে
            বসানো হলে সেগুলো এখানেই দেখা যাবে।</p>
          </div>`;
        return;
      }
      const url = FORM_REGISTRATION_URL || FORM_DONATION_URL;
      // Allow embedding via iframe for hosted forms; falls back to a clear notice for non-iframeable URLs.
      formLivePreview.innerHTML = `
        <iframe class="gform" title="নিবন্ধন ও দানের ফর্ম"
                src="${escapeAttr(url)}?embedded=true"
                width="100%" height="780" frameborder="0"
                marginheight="0" marginwidth="0">লোড হচ্ছে…</iframe>
        <p class="muted form-fallback">
          ফর্মটি না লোড হলে <a href="${escapeAttr(url)}" target="_blank" rel="noopener">নতুন ট্যাবে খুলুন</a>।
        </p>`;
    }

    // bKash TrxID validator
    if (trxInput) {
      const validate = () => {
        const v = trxInput.value.trim();
        const ok = /^[A-Za-z0-9]{8,20}$/.test(v);
        if (v.length === 0) {
          trxEcho.textContent = '';
          trxEcho.className = 'trx-echo';
        } else if (ok) {
          trxEcho.textContent = `✓ bKash TrxID বৈধ মনে হচ্ছে: ${v}`;
          trxEcho.className = 'trx-echo ok';
        } else {
          trxEcho.textContent = 'TrxID ৮–২০ অক্ষর বা সংখ্যার হতে হবে (স্পেস ছাড়া)।';
          trxEcho.className = 'trx-echo err';
        }
      };
      trxInput.addEventListener('input', validate);
      validate();
    }
  }

  // =====================================================================
  // Utilities
  // =====================================================================
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function formatNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
      ? numericValue.toLocaleString('bn-BD')
      : String(value);
  }

  function formatYear(year) {
    const numericYear = Number(year);
    // Years read as ২০০৫, not ২,০০৫ — grouping separators are for counts only.
    return Number.isFinite(numericYear) && numericYear > 0
      ? numericYear.toLocaleString('bn-BD', { useGrouping: false })
      : String(year);
  }

  function formatDate(ts) {
    try {
      return new Date(ts).toLocaleDateString('bn-BD', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch { return ''; }
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
})();
