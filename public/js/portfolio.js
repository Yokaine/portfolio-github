window.addEventListener('DOMContentLoaded', () => {

    const themeToggle = document.getElementById('theme-toggle');
    const welcomeEl = document.getElementById('welcome');
    const form = document.getElementById('search-form');
    const usernameInput = document.getElementById('username');
    const statusEl = document.getElementById('status');
    const profileEl = document.getElementById('profile');
    const reposEl = document.getElementById('repos');
    const demoModeCheckbox = document.getElementById('demo-mode');
    const demoHint = document.getElementById('demo-hint');
    const repoControls = document.getElementById('repo-controls');
    const languageFilter = document.getElementById('language-filter');
    const languageChipsEl = document.getElementById('language-chips');
    const forksToggle = document.getElementById('forks-toggle');
    const exportButton = document.getElementById('export-html');
    const repoCountEl = document.getElementById('repo-count');

    let allRepos = [];
    let featuredRepos = new Set();
    let currentTheme = 'light';
    let currentUser = null;
    let includeForks = false;

    const SUN_ICON = `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.8 4.2l-1.4 1.4M5.6 14.4l-1.4 1.4M15.8 15.8l-1.4-1.4M5.6 5.6L4.2 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
    const MOON_ICON = `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M17 12.5A7 7 0 1 1 7.5 3a5.5 5.5 0 0 0 9.5 9.5Z" fill="currentColor"/></svg>`;

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        themeToggle.innerHTML = theme === 'dark' ? SUN_ICON : MOON_ICON;
        themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre');
    }

    function getThemeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('theme');
    }

    function setThemeInUrl(theme) {
        const url = new URL(window.location);
        url.searchParams.set('theme', theme);
        window.history.pushState({}, '', url);
    }

    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(currentTheme);
        setThemeInUrl(currentTheme);
    });

    function accentHueFromUsername(username) {
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash) % 360;
    }

    function formatDate(isoString) {
        return new Date(isoString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function setStatus(message, type = 'info') {
        statusEl.textContent = message;
        statusEl.className = type;
    }

    function clearStatus() {
        statusEl.textContent = '';
        statusEl.className = '';
    }

    function renderProfile(user) {
        currentUser = user;
        exportButton.style.display = 'inline-block';
        welcomeEl.style.display = 'none';

        document.documentElement.style.setProperty('--accent-hue', accentHueFromUsername(user.login));

        const bio = user.bio ? `<p class="bio">${user.bio}</p>` : '';
        const name = user.name || user.login;

        const stats = [];
        if (typeof user.public_repos === 'number') {
            stats.push(`<div><strong>${user.public_repos}</strong><span>projets publics</span></div>`);
        }
        if (typeof user.followers === 'number') {
            stats.push(`<div><strong>${user.followers}</strong><span>abonnés</span></div>`);
        }
        if (user.created_at) {
            const year = new Date(user.created_at).getFullYear();
            stats.push(`<div><strong>${year}</strong><span>membre depuis</span></div>`);
        }
        const statsHtml = stats.length ? `<div class="profile-stats">${stats.join('')}</div>` : '';

        profileEl.innerHTML = `
            <div class="avatar-frame">
                <img class="avatar" src="${user.avatar_url}" alt="">
            </div>
            <div class="profile-info">
                <h2>${name}</h2>
                <span class="handle">@${user.login}</span>
                ${bio}
                <a class="profile-link" href="${user.html_url}" target="_blank" rel="noopener">Voir le profil GitHub</a>
            </div>
            ${statsHtml}
        `;
    }

    function clearView() {
        profileEl.innerHTML = '';
        reposEl.innerHTML = '';
        languageChipsEl.innerHTML = '';
        repoCountEl.textContent = '';
        exportButton.style.display = 'none';
        welcomeEl.style.display = 'none';

        includeForks = false;
        forksToggle.setAttribute('aria-pressed', 'false');
        forksToggle.textContent = 'Inclure aussi les forks';
    }

    demoModeCheckbox.addEventListener('change', () => {
        demoHint.style.display = demoModeCheckbox.checked ? 'block' : 'none';
    });

    async function fetchDemoJson(path) {
        const response = await fetch(`/demo/${path}`);
        if (!response.ok) {
            throw new Error('Fichier démo introuvable');
        }
        return response.json();
    }

    async function loadDemoProfile(username) {
        clearView();
        setStatus('Chargement du profil (mode démo)...', 'loading');

        const manifest = await fetchDemoJson('manifest.json');
        const entry = manifest[username];

        if (!entry) {
            setStatus(`Aucun utilisateur démo "${username}". Voir la liste des pseudos disponibles ci-dessus.`, 'error');
            return;
        }

        if (entry.type === 'not_found') {
            setStatus(`Aucun utilisateur GitHub trouvé pour "${username}". (simulé)`, 'error');
            return;
        }

        if (entry.type === 'rate_limited') {
            setStatus("Quota de l'API GitHub dépassé. Réessayez plus tard. (simulé)", 'error');
            return;
        }

        if (entry.type === 'network_error') {
            setStatus('Erreur réseau : impossible de contacter GitHub. (simulé)', 'error');
            return;
        }

        const user = await fetchDemoJson(entry.profile);
        clearStatus();
        renderProfile(user);

        allRepos = await fetchDemoJson(entry.repos);

        if (!Array.isArray(allRepos) || allRepos.length === 0) {
            repoControls.style.display = 'none';
            reposEl.innerHTML = '<p>Ce profil ne possède aucun dépôt public.</p>';
            return;
        }

        repoControls.style.display = 'block';
        applyFiltersAndRender();
    }

    function buildStandaloneHtml(user, repos) {
        const reposHtml = repos.map(repo => {
            const description = repo.description || 'Pas de description.';
            const language = repo.language || 'Non renseigné';
            const demoLink = repo.homepage
                ? `<a href="${repo.homepage}" target="_blank" rel="noopener">Voir la démo</a>`
                : '';
            return `
                <article class="repo-card">
                    <h3>${repo.name}</h3>
                    <p>${description}</p>
                    <p>Langage : ${language}</p>
                    <a href="${repo.html_url}" target="_blank" rel="noopener">Voir le code</a>
                    ${demoLink}
                </article>
            `;
        }).join('');

        const bio = user.bio ? `<p>${user.bio}</p>` : '';
        const name = user.name || user.login;

        return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Portfolio de ${name}</title>
<style>
body { font-family: system-ui, Arial, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; background:#fafaf9; color:#16181d; }
#profile { display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem; }
#profile img { border-radius:16px; width:88px; height:88px; object-fit:cover; }
#repos { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:1rem; }
.repo-card { background:#fff; border:1px solid #e4e4e1; border-radius:12px; padding:1rem; }
.repo-card a { display:inline-block; margin-right:0.75rem; margin-top:0.5rem; }
footer { margin-top:2rem; font-size:0.8rem; color:#777; }
</style>
</head>
<body>
<h1>Portfolio de ${name}</h1>
<div id="profile">
    <img src="${user.avatar_url}" alt="Avatar de ${user.login}">
    <div>
        <h2>${name}</h2>
        ${bio}
        <a href="${user.html_url}" target="_blank" rel="noopener">Voir le profil GitHub</a>
    </div>
</div>
<section id="repos">${reposHtml}</section>
<footer>Export statique généré le ${new Date().toLocaleDateString('fr-FR')} — données figées, aucun appel à l'API GitHub.</footer>
</body>
</html>`;
    }

    function exportCurrentPortfolio() {
        if (!currentUser) return;

        const visibleRepoNames = Array.from(reposEl.querySelectorAll('.entry-name')).map(a => a.textContent.trim());
        const reposToExport = allRepos.filter(r => visibleRepoNames.includes(r.name));

        const html = buildStandaloneHtml(currentUser, reposToExport);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio-${currentUser.login}.html`;
        a.click();

        URL.revokeObjectURL(url);
    }

    exportButton.addEventListener('click', exportCurrentPortfolio);

    async function loadProfile(username) {
        clearView();
        setStatus('Chargement du profil...', 'loading');

        try {
            const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);

            if (response.status === 404) {
                setStatus(`Aucun utilisateur GitHub trouvé pour "${username}".`, 'error');
                return;
            }

            if (response.status === 403) {
                setStatus("Quota de l'API GitHub dépassé. Réessayez plus tard.", 'error');
                return;
            }

            if (!response.ok) {
                setStatus('Erreur réseau lors de la récupération du profil.', 'error');
                return;
            }

            const user = await response.json();
            clearStatus();
            renderProfile(user);
            loadRepos(username);

        } catch (error) {
            setStatus('Erreur réseau : impossible de contacter GitHub.', 'error');
        }
    }

    async function loadRepos(username) {
        try {
            const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100`);

            if (response.status === 403) {
                setStatus("Quota de l'API GitHub dépassé. Réessayez plus tard.", 'error');
                return;
            }

            if (!response.ok) {
                setStatus('Erreur réseau lors de la récupération des dépôts.', 'error');
                return;
            }

            allRepos = await response.json();

            if (!Array.isArray(allRepos) || allRepos.length === 0) {
                repoControls.style.display = 'none';
                reposEl.innerHTML = '<p>Ce profil ne possède aucun dépôt public.</p>';
                return;
            }

            repoControls.style.display = 'block';
            applyFiltersAndRender();

        } catch (error) {
            setStatus('Erreur réseau : impossible de récupérer les dépôts.', 'error');
        }
    }

    function getUsernameFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('user');
    }

    function updateUrl(username) {
        const url = new URL(window.location);
        url.searchParams.set('user', username);
        window.history.pushState({}, '', url);
    }

    function getFeaturedFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const raw = params.get('featured');
        if (!raw) return new Set();
        return new Set(raw.split(',').filter(Boolean));
    }

    function setFeaturedInUrl() {
        const url = new URL(window.location);
        if (featuredRepos.size > 0) {
            url.searchParams.set('featured', [...featuredRepos].join(','));
        } else {
            url.searchParams.delete('featured');
        }
        window.history.pushState({}, '', url);
    }

    function renderLanguageChips(repos) {
        if (repos.length === 0) {
            languageChipsEl.innerHTML = '';
            return;
        }

        const counts = {};
        repos.forEach(repo => {
            const lang = repo.language || 'Autre';
            counts[lang] = (counts[lang] || 0) + 1;
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const selected = languageFilter.value;

        const allChip = `<button type="button" class="chip ${selected === '' ? 'active' : ''}" data-lang="">Tous (${repos.length})</button>`;
        const chips = sorted.map(([lang, count]) => `
            <button type="button" class="chip ${selected === lang ? 'active' : ''}" data-lang="${lang}">${lang} (${count})</button>
        `).join('');

        languageChipsEl.innerHTML = allChip + chips;

        languageChipsEl.querySelectorAll('button[data-lang]').forEach(btn => {
            btn.addEventListener('click', () => {
                languageFilter.value = btn.dataset.lang;
                applyFiltersAndRender();
            });
        });
    }

    function renderRepoEntry(repo, index) {
        const description = repo.description ? `<p class="entry-desc">${repo.description}</p>` : '<p class="entry-desc">Pas de description.</p>';
        const language = repo.language ? `<span class="entry-lang">${repo.language}</span>` : '';
        const demoLink = repo.homepage
            ? `<a class="entry-action" href="${repo.homepage}" target="_blank" rel="noopener">Démo</a>`
            : '';
        const isFeatured = featuredRepos.has(repo.name);

        return `
            <article class="entry ${isFeatured ? 'featured' : ''}" style="--i:${index}">
                <div class="entry-top">
                    <a class="entry-name" href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a>
                    ${language}
                    <button type="button" class="star-toggle" data-repo="${repo.name}" aria-pressed="${isFeatured}" aria-label="Mettre en avant ${repo.name}">${isFeatured ? '★' : '☆'}</button>
                </div>
                ${description}
                <div class="entry-bottom">
                    <span class="entry-date">Mis à jour le ${formatDate(repo.updated_at)}</span>
                    <a class="entry-action" href="${repo.html_url}" target="_blank" rel="noopener">Code</a>
                    ${demoLink}
                </div>
            </article>
        `;
    }

    function applyFiltersAndRender() {
        const selectedLanguage = languageFilter.value;

        let base = allRepos.filter(repo => includeForks || !repo.fork);
        renderLanguageChips(base);

        let filtered = selectedLanguage
            ? base.filter(repo => repo.language === selectedLanguage)
            : base;

        filtered.sort((a, b) => {
            const aFeatured = featuredRepos.has(a.name);
            const bFeatured = featuredRepos.has(b.name);
            if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;
            return new Date(b.updated_at) - new Date(a.updated_at);
        });

        repoCountEl.textContent = filtered.length === 0
            ? 'Aucun dépôt à afficher'
            : `${filtered.length} dépôt${filtered.length > 1 ? 's' : ''} affiché${filtered.length > 1 ? 's' : ''}`;

        if (filtered.length === 0) {
            reposEl.innerHTML = '<p>Aucun dépôt à afficher avec ces filtres.</p>';
            return;
        }

        reposEl.innerHTML = filtered.map((repo, i) => renderRepoEntry(repo, i)).join('');
    }

    forksToggle.addEventListener('click', () => {
        includeForks = !includeForks;
        forksToggle.setAttribute('aria-pressed', String(includeForks));
        forksToggle.textContent = includeForks ? 'Masquer les copies de projets (forks)' : 'Inclure aussi les copies de projets (forks)';
        applyFiltersAndRender();
    });

    reposEl.addEventListener('click', (event) => {
        const btn = event.target.closest('.star-toggle');
        if (!btn) return;

        const repoName = btn.dataset.repo;
        const willBeFeatured = !featuredRepos.has(repoName);

        if (willBeFeatured) {
            featuredRepos.add(repoName);
        } else {
            featuredRepos.delete(repoName);
        }

        btn.textContent = willBeFeatured ? '★' : '☆';
        btn.setAttribute('aria-pressed', String(willBeFeatured));
        btn.classList.add('pop');

        setFeaturedInUrl();

        window.setTimeout(() => {
            applyFiltersAndRender();
        }, 180);
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const username = usernameInput.value.trim();
        if (!username) return;

        updateUrl(username);

        if (demoModeCheckbox.checked) {
            loadDemoProfile(username);
        } else {
            loadProfile(username);
        }
    });

    featuredRepos = getFeaturedFromUrl();

    currentTheme = getThemeFromUrl() || 'light';
    applyTheme(currentTheme);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === '1') {
        demoModeCheckbox.checked = true;
        demoHint.style.display = 'block';
    }

    const urlUsername = getUsernameFromUrl();
    if (urlUsername) {
        usernameInput.value = urlUsername;
        if (demoModeCheckbox.checked) {
            loadDemoProfile(urlUsername);
        } else {
            loadProfile(urlUsername);
        }
    }
});