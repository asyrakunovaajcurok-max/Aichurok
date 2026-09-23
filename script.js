(() => {
  'use strict';

  /* ---------------------------------------------------------------
     Год в футере
  --------------------------------------------------------------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------
     Полоса прогресса чтения
  --------------------------------------------------------------- */
  const progressLine = document.getElementById('progressLine');
  function updateProgress(){
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (scrolled / max) * 100 : 0;
    if (progressLine) progressLine.style.width = pct + '%';
  }
  document.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ---------------------------------------------------------------
     Навбар: тень при скролле + мобильное меню
  --------------------------------------------------------------- */
  const topnav = document.getElementById('topnav');
  function updateNavShadow(){
    if (!topnav) return;
    if (window.scrollY > 12) topnav.classList.add('scrolled');
    else topnav.classList.remove('scrolled');
  }
  document.addEventListener('scroll', updateNavShadow, { passive: true });
  updateNavShadow();

  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks){
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('[data-close]').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  /* ---------------------------------------------------------------
     Скролл-анимации (IntersectionObserver)
  --------------------------------------------------------------- */
  const revealTargets = document.querySelectorAll('.reveal');
  const skillFills = document.querySelectorAll('.skill-fill');

  skillFills.forEach(fill => {
    const target = fill.getAttribute('data-fill') || '0';
    fill.style.setProperty('--target-width', target + '%');
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  revealTargets.forEach(el => io.observe(el));

  /* ---------------------------------------------------------------
     "Обо мне" — сворачиваемый блок
  --------------------------------------------------------------- */
  const aboutToggle = document.getElementById('aboutToggle');
  const aboutBody = document.getElementById('aboutBody');
  if (aboutToggle && aboutBody){
    aboutToggle.addEventListener('click', () => {
      const expanded = aboutToggle.getAttribute('aria-expanded') === 'true';
      aboutToggle.setAttribute('aria-expanded', String(!expanded));
      if (expanded){
        aboutBody.style.maxHeight = '0px';
      } else {
        aboutBody.style.maxHeight = aboutBody.scrollHeight + 'px';
      }
    });
    // recalc on resize if open
    window.addEventListener('resize', () => {
      if (aboutToggle.getAttribute('aria-expanded') === 'true'){
        aboutBody.style.maxHeight = aboutBody.scrollHeight + 'px';
      }
    });
  }

  /* ---------------------------------------------------------------
     Хранилище: локальное сохранение добавленных материалов
     (данные хранятся только в браузере посетителя сайта)
  --------------------------------------------------------------- */
  const STORE_PREFIX = 'aichurok_site_';

  function loadList(key){
    try{
      const raw = localStorage.getItem(STORE_PREFIX + key);
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
  }
  function saveList(key, list){
    try{ localStorage.setItem(STORE_PREFIX + key, JSON.stringify(list)); }
    catch(e){ /* хранилище недоступно — просто не сохраняем */ }
  }

  function fileToDataUrl(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ---------------------------------------------------------------
     Универсальные карточные списки (курсы / проекты / достижения / галерея)
  --------------------------------------------------------------- */
  const simpleSections = ['courses', 'projects', 'achievements', 'gallery'];
  const listElements = {};

  simpleSections.forEach(key => {
    listElements[key] = document.getElementById(key + 'List');
  });

  function renderSimpleList(key){
    const el = listElements[key];
    if (!el) return;
    const items = loadList(key);
    el.innerHTML = '';
    if (!items.length){
      el.classList.add('is-empty');
      return;
    }
    el.classList.remove('is-empty');
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'item-card';

      const delBtn = document.createElement('button');
      delBtn.className = 'item-delete';
      delBtn.type = 'button';
      delBtn.innerHTML = '&times;';
      delBtn.setAttribute('aria-label', 'Удалить');
      delBtn.addEventListener('click', () => {
        const current = loadList(key).filter(i => i.id !== item.id);
        saveList(key, current);
        renderSimpleList(key);
      });
      card.appendChild(delBtn);

      if (item.photo){
        const img = document.createElement('img');
        img.src = item.photo;
        img.alt = item.heading || '';
        card.appendChild(img);
      }

      const body = document.createElement('div');
      body.className = 'item-card-body';
      if (item.heading){
        const h = document.createElement('p');
        h.className = 'item-card-heading';
        h.textContent = item.heading;
        body.appendChild(h);
      }
      if (item.text){
        const t = document.createElement('p');
        t.className = 'item-card-text';
        t.textContent = item.text;
        body.appendChild(t);
      }
      if (body.childNodes.length) card.appendChild(body);

      el.appendChild(card);
    });
  }

  simpleSections.forEach(renderSimpleList);

  function addSimpleItem(key, data){
    const items = loadList(key);
    items.push(Object.assign({ id: 'i' + Date.now() + Math.random().toString(16).slice(2) }, data));
    saveList(key, items);
    renderSimpleList(key);
  }

  /* ---------------------------------------------------------------
     Модальное окно "Добавить текст"
  --------------------------------------------------------------- */
  const editorOverlay = document.getElementById('editorOverlay');
  const editorTitle = document.getElementById('editorTitle');
  const editorHeading = document.getElementById('editorHeading');
  const editorText = document.getElementById('editorText');
  const editorSave = document.getElementById('editorSave');
  const editorCancel = document.getElementById('editorCancel');
  let currentEditorTarget = null;

  function openEditor(sectionKey){
    currentEditorTarget = sectionKey;
    editorHeading.value = '';
    editorText.value = '';
    editorTitle.textContent = 'Новая запись';
    editorOverlay.classList.add('open');
    setTimeout(() => editorHeading.focus(), 50);
  }
  function closeEditor(){
    editorOverlay.classList.remove('open');
    currentEditorTarget = null;
  }
  if (editorCancel) editorCancel.addEventListener('click', closeEditor);
  if (editorOverlay) editorOverlay.addEventListener('click', (e) => {
    if (e.target === editorOverlay) closeEditor();
  });
  if (editorSave) editorSave.addEventListener('click', () => {
    if (!currentEditorTarget) return;
    const heading = editorHeading.value.trim();
    const text = editorText.value.trim();
    if (!heading && !text){ closeEditor(); return; }
    addSimpleItem(currentEditorTarget, { heading, text });
    closeEditor();
  });

  document.querySelectorAll('[data-add-text]').forEach(btn => {
    btn.addEventListener('click', () => openEditor(btn.getAttribute('data-add-text')));
  });

  /* ---------------------------------------------------------------
     Загрузка фото (для карточных секций и сертификатов)
  --------------------------------------------------------------- */
  const photoInput = document.getElementById('photoInput');
  let pendingPhotoTarget = null; // { type: 'simple'|'certificate'|'article', key, articleId }

  document.querySelectorAll('[data-add-photo]').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingPhotoTarget = { type: 'simple', key: btn.getAttribute('data-add-photo') };
      photoInput.value = '';
      photoInput.click();
    });
  });

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files && photoInput.files[0];
    if (!file || !pendingPhotoTarget) return;
    try{
      const dataUrl = await fileToDataUrl(file);
      if (pendingPhotoTarget.type === 'simple'){
        addSimpleItem(pendingPhotoTarget.key, { photo: dataUrl });
      } else if (pendingPhotoTarget.type === 'certificate'){
        addCertificate(dataUrl);
      } else if (pendingPhotoTarget.type === 'article'){
        updateArticle(pendingPhotoTarget.articleId, { photo: dataUrl });
        renderArticles();
      }
    } catch(e){ /* игнорируем ошибку чтения файла */ }
    pendingPhotoTarget = null;
  });

  /* ---------------------------------------------------------------
     Сертификаты
  --------------------------------------------------------------- */
  const certificatesList = document.getElementById('certificatesList');

  function renderCertificates(){
    if (!certificatesList) return;
    const items = loadList('certificates');
    certificatesList.innerHTML = '';
    if (!items.length){
      certificatesList.classList.add('is-empty');
      return;
    }
    certificatesList.classList.remove('is-empty');
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'item-card';

      const delBtn = document.createElement('button');
      delBtn.className = 'item-delete';
      delBtn.type = 'button';
      delBtn.innerHTML = '&times;';
      delBtn.setAttribute('aria-label', 'Удалить сертификат');
      delBtn.addEventListener('click', () => {
        const current = loadList('certificates').filter(i => i.id !== item.id);
        saveList('certificates', current);
        renderCertificates();
      });
      card.appendChild(delBtn);

      const img = document.createElement('img');
      img.src = item.photo;
      img.alt = 'Сертификат';
      card.appendChild(img);

      certificatesList.appendChild(card);
    });
  }
  renderCertificates();

  function addCertificate(dataUrl){
    const items = loadList('certificates');
    items.push({ id: 'c' + Date.now() + Math.random().toString(16).slice(2), photo: dataUrl });
    saveList('certificates', items);
    renderCertificates();
  }

  document.querySelectorAll('[data-add-photo="certificates"]').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingPhotoTarget = { type: 'certificate' };
      photoInput.value = '';
      photoInput.click();
    });
  });

  /* ---------------------------------------------------------------
     Статьи (редактируемые прямо на странице)
  --------------------------------------------------------------- */
  const articlesList = document.getElementById('articlesList');
  const addArticleBtn = document.getElementById('addArticleBtn');

  function loadArticles(){ return loadList('articles'); }
  function saveArticles(list){ saveList('articles', list); }

  function updateArticle(id, patch){
    const items = loadArticles();
    const idx = items.findIndex(a => a.id === id);
    if (idx === -1) return;
    items[idx] = Object.assign({}, items[idx], patch);
    saveArticles(items);
  }

  function renderArticles(){
    if (!articlesList) return;
    const items = loadArticles();
    articlesList.innerHTML = '';
    if (!items.length){
      articlesList.classList.add('is-empty');
      return;
    }
    articlesList.classList.remove('is-empty');

    items.forEach(article => {
      const card = document.createElement('div');
      card.className = 'article-card';

      const delBtn = document.createElement('button');
      delBtn.className = 'item-delete';
      delBtn.type = 'button';
      delBtn.innerHTML = '&times;';
      delBtn.setAttribute('aria-label', 'Удалить статью');
      delBtn.style.position = 'absolute';
      const photoWrap = document.createElement('div');
      photoWrap.style.position = 'relative';

      if (article.photo){
        const img = document.createElement('img');
        img.className = 'article-photo';
        img.src = article.photo;
        img.alt = article.heading || 'Фото к статье';
        img.title = 'Нажмите, чтобы заменить фото';
        img.addEventListener('click', () => {
          pendingPhotoTarget = { type: 'article', articleId: article.id };
          photoInput.value = '';
          photoInput.click();
        });
        photoWrap.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'article-photo-placeholder';
        placeholder.textContent = '+ Добавить фото к статье';
        placeholder.addEventListener('click', () => {
          pendingPhotoTarget = { type: 'article', articleId: article.id };
          photoInput.value = '';
          photoInput.click();
        });
        photoWrap.appendChild(placeholder);
      }
      photoWrap.appendChild(delBtn);
      card.appendChild(photoWrap);

      delBtn.addEventListener('click', () => {
        const current = loadArticles().filter(a => a.id !== article.id);
        saveArticles(current);
        renderArticles();
      });

      const body = document.createElement('div');
      body.className = 'article-body';

      const heading = document.createElement('h3');
      heading.className = 'article-heading';
      heading.contentEditable = 'true';
      heading.textContent = article.heading || 'Заголовок статьи';
      heading.addEventListener('blur', () => updateArticle(article.id, { heading: heading.textContent.trim() }));
      body.appendChild(heading);

      const text = document.createElement('p');
      text.className = 'article-text';
      text.contentEditable = 'true';
      text.textContent = article.text || 'Нажмите, чтобы написать текст статьи...';
      text.addEventListener('blur', () => updateArticle(article.id, { text: text.textContent.trim() }));
      body.appendChild(text);

      card.appendChild(body);

      const actions = document.createElement('div');
      actions.className = 'article-actions';
      const hint = document.createElement('span');
      hint.className = 'article-hint';
      hint.textContent = 'Кликните по тексту, чтобы редактировать';
      actions.appendChild(hint);
      card.appendChild(actions);

      articlesList.appendChild(card);
    });
  }
  renderArticles();

  if (addArticleBtn){
    addArticleBtn.addEventListener('click', () => {
      const items = loadArticles();
      items.push({
        id: 'a' + Date.now() + Math.random().toString(16).slice(2),
        heading: 'Новая статья',
        text: 'Нажмите, чтобы написать текст статьи...',
        photo: ''
      });
      saveArticles(items);
      renderArticles();
    });
  }

})();
