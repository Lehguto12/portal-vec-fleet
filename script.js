/* =========================================================
   SCRIPT.JS - CENTRAL OPERACIONAL DHL VEC FLEET
   ========================================================= */

/* ---------------------------------------------------------
   CONFIGURAÇÃO E DADOS DOS DASHBOARDS
   --------------------------------------------------------- */

/* ---------------------------------------------------------
   CONFIGURAÇÃO E DADOS DOS DASHBOARDS
   --------------------------------------------------------- */

const DEFAULT_DASHBOARDS = [
    {
        id: 'vec-geral',
        title: 'Gestão Geral VEC Fleet',
        category: 'VEC Fleet',
        platform: 'Looker Studio',
        description: 'Visão consolidada da frota, relatos diários por coordenador e status das operações de pátios.',
        // URL ATUALIZADA ABAIXO:
        url: 'https://datastudio.google.com/embed/reporting/0a73ea85-2c22-406a-be24-3fa8499ec434/page/rcG7F',
        icon: 'truck',
        badge: 'Principal',
        kpis: {
            relatos: 1282,
            topPatio: 'BRXSP23',
            lider: 'Taiz A. Potulski'
        }
    },
    // ... mantêm-se os outros dashboards
    {
        id: 'relatorio-patios',
        title: 'Relatório por Pátios & Regiões',
        category: 'VEC Fleet',
        platform: 'Looker Studio',
        description: 'Acompanhamento detalhado de entradas, saídas e movimentações por unidade operacional.',
        url: 'https://lookerstudio.google.com/embed/reporting/demo2',
        icon: 'map-pin',
        badge: 'Operacional',
        kpis: {
            relatos: 430,
            topPatio: 'BRXSP23',
            lider: 'BRSP02'
        }
    },
    {
        id: 'aderencia-planilhas',
        title: 'Planilhas de Aderência Operacional',
        category: 'Aderência & Relatórios',
        platform: 'Google Sheets',
        description: 'Medição diária de compliance e índice de aderência dos turnos às diretrizes da frota.',
        url: 'https://docs.google.com/spreadsheets/d/e/demo/pubhtml',
        icon: 'file-spreadsheet',
        badge: 'Compliance',
        kpis: {
            relatos: 100,
            topPatio: '100% Aderência',
            lider: 'Geral Turnos'
        }
    },
    {
        id: 'coordenadores-performance',
        title: 'Desempenho por Coordenador',
        category: 'VEC Fleet',
        platform: 'Looker Studio',
        description: 'Métricas individuais de preenchimento de relatos e ranking por liderança de equipe.',
        url: 'https://lookerstudio.google.com/embed/reporting/demo3',
        icon: 'award',
        badge: 'Liderança',
        kpis: {
            relatos: 350,
            topPatio: 'Sul / Sudeste',
            lider: 'Taiz A. Potulski'
        }
    },
    {
        id: 'relatorio-turnos',
        title: 'Consolidado de Turnos & Horários',
        category: 'Aderência & Relatórios',
        platform: 'Looker Studio',
        description: 'Distribuição dos relatórios por janela horária e apuração de inconsistências no fluxo.',
        url: 'https://lookerstudio.google.com/embed/reporting/demo4',
        icon: 'clock',
        badge: 'Turnos',
        kpis: {
            relatos: 402,
            topPatio: 'Turno 1 & 2',
            lider: 'Supervisão'
        }
    }
];

const DASHBOARDS_STORAGE_KEY = 'vec_dashboards_v4';
let dashboardsData = JSON.parse(localStorage.getItem(DASHBOARDS_STORAGE_KEY)) || JSON.parse(JSON.stringify(DEFAULT_DASHBOARDS));
let activeFilter = 'all';
let activeSearchQuery = '';
let currentDashboardId = null;
let currentDisplayMode = 'embed'; // 'embed' ou 'simulated'
let kioskInterval = null;
let kioskIndex = 0;


/* ---------------------------------------------------------
   INICIALIZAÇÃO DA APLICAÇÃO
   --------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    setupClock();
    renderSidebarList();
    renderDashboardsGrid();
    setupEventListeners();
    checkUrlParams();

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});


/* ---------------------------------------------------------
   RENDERIZAÇÃO DA CENTRAL (GRID & SIDEBAR)
   --------------------------------------------------------- */

function renderDashboardsGrid() {
    const gridContainer = document.getElementById('dashboards-grid');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    const filtered = dashboardsData.filter(item => {
        const matchesFilter = (activeFilter === 'all') || 
                              (item.category.trim().toLowerCase() === activeFilter.trim().toLowerCase());

        const query = activeSearchQuery.toLowerCase();
        const matchesSearch = !query || 
                              item.title.toLowerCase().includes(query) || 
                              item.description.toLowerCase().includes(query) ||
                              item.category.toLowerCase().includes(query) ||
                              (item.kpis.topPatio && item.kpis.topPatio.toLowerCase().includes(query)) ||
                              (item.kpis.lider && item.kpis.lider.toLowerCase().includes(query));

        return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
        gridContainer.innerHTML = `
            <div class="col-span-full py-12 text-center text-slate-400 bg-dark-card border border-dark-border rounded-2xl p-6">
                <i data-lucide="search-x" class="w-10 h-10 mx-auto text-amber-500 mb-3"></i>
                <p class="text-sm font-semibold">Nenhum módulo encontrado</p>
                <p class="text-xs text-slate-500 mt-1">Tente ajustar a busca ou o filtro selecionado.</p>
            </div>
        `;
    } else {
        filtered.forEach(dash => {
            const card = document.createElement('div');
            card.className = "bg-dark-card border border-dark-border rounded-2xl p-5 hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between group shadow-lg";
            card.setAttribute('data-category', dash.category);
            card.setAttribute('data-dashboard', dash.id);

            card.innerHTML = `
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            ${dash.badge || dash.category}
                        </span>
                        <div class="flex items-center space-x-1">
                            <button onclick="shareDashboardLink('${dash.id}')" title="Copiar Link Direto" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-border transition">
                                <i data-lucide="share-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>

                    <div class="flex items-start space-x-3 mb-3">
                        <div class="p-2.5 rounded-xl bg-slate-900 border border-dark-border text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                            <i data-lucide="${dash.icon || 'layout-dashboard'}" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">${dash.title}</h3>
                            <p class="text-xs text-slate-400 mt-1 line-clamp-2">${dash.description}</p>
                        </div>
                    </div>

                    <div class="my-4 pt-3 border-t border-dark-border grid grid-cols-2 gap-2 text-[11px]">
                        <div class="bg-slate-900/60 p-2 rounded-lg border border-dark-border">
                            <span class="text-slate-500 block">Destaque / Pátio</span>
                            <span class="text-slate-200 font-bold truncate block">${dash.kpis.topPatio}</span>
                        </div>
                        <div class="bg-slate-900/60 p-2 rounded-lg border border-dark-border">
                            <span class="text-slate-500 block">Liderança</span>
                            <span class="text-slate-200 font-bold truncate block">${dash.kpis.lider}</span>
                        </div>
                    </div>
                </div>

                <div class="pt-2 flex items-center justify-between gap-2">
                    <span class="text-[10px] text-slate-500 font-mono">${dash.platform}</span>
                    <button onclick="openDashboardViewer('${dash.id}')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition flex items-center space-x-1">
                        <span>Acessar Painel</span>
                        <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            `;
            gridContainer.appendChild(card);
        });
    }

    // Atualiza o rótulo do contador no topo
    const countLabel = document.getElementById('dashboard-count-label');
    if (countLabel) {
        countLabel.textContent = `Exibindo ${filtered.length} de ${dashboardsData.length} módulos`;
    }

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function renderSidebarList() {
    const listContainer = document.getElementById('sidebar-dashboards-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    dashboardsData.forEach(dash => {
        const btn = document.createElement('button');
        btn.onclick = () => openDashboardViewer(dash.id);
        btn.className = "w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-dark-hover hover:text-slate-200 transition text-left group";
        btn.innerHTML = `
            <i data-lucide="${dash.icon || 'file-text'}" class="w-4 h-4 shrink-0 text-slate-500 group-hover:text-amber-400 transition-colors"></i>
            <span class="sidebar-text truncate">${dash.title}</span>
        `;
        listContainer.appendChild(btn);
    });

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}


/* ---------------------------------------------------------
   NAVEGAÇÃO E VISUALIZADOR DE DASHBOARDS
   --------------------------------------------------------- */

function navigateTo(viewName) {
    const hubView = document.getElementById('view-hub');
    const viewerView = document.getElementById('view-viewer');

    if (viewName === 'hub') {
        hubView.classList.remove('hidden');
        viewerView.classList.add('hidden');
        document.body.classList.remove('dashboard-view-active');
        currentDashboardId = null;
    } else if (viewName === 'viewer') {
        hubView.classList.add('hidden');
        viewerView.classList.remove('hidden');
        document.body.classList.add('dashboard-view-active');
    }
}
function openDashboardViewer(dashId) {
    const dash = dashboardsData.find(d => d.id === dashId);
    if (!dash) return;

    currentDashboardId = dash.id;

    // Atualiza cabeçalho do viewer
    document.getElementById('viewer-title').textContent = dash.title;
    document.getElementById('viewer-platform-tag').textContent = dash.platform;

    // Popula a caixa de seleção de atalho no viewer
    const select = document.getElementById('viewer-select');
    if (select) {
        select.innerHTML = '';
        dashboardsData.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.title;
            if (d.id === dash.id) opt.selected = true;
            select.appendChild(opt);
        });
    }

    // Exibe o viewer antes de carregar o iframe.
    // Isso evita inicializar o dashboard enquanto o container ainda está oculto.
    navigateTo('viewer');

    requestAnimationFrame(() => {
        loadDashboardContent(dash);
    });
}

function switchViewerDashboard(dashId) {
    openDashboardViewer(dashId);
}

function loadDashboardContent(dash) {
    const iframe = document.getElementById('main-iframe');
    const loader = document.getElementById('iframe-loader');
    const fallback = document.getElementById('fallback-container');

    // Detecta se a página está rodando via arquivo local (file://)
    const isLocalFile = window.location.protocol === 'file:';

    if (isLocalFile || currentDisplayMode === 'simulated' || !dash.url || dash.url.includes('demo')) {
        iframe.classList.add('hidden');
        if (loader) loader.classList.add('hidden');
        fallback.classList.remove('hidden');
        
        // Renderiza o aviso de segurança e o botão de acesso rápido
        renderLocalFallbackNotice(dash);
    } else {
        fallback.classList.add('hidden');
        iframe.classList.remove('hidden');
        if (loader) loader.classList.remove('hidden');

        const embedUrl = normalizeLookerEmbedUrl(dash.url);

        const embedError = document.getElementById('embed-error');
        if (embedError) embedError.remove();

        clearTimeout(iframe._loadTimeout);

        iframe.onload = () => {
            clearTimeout(iframe._loadTimeout);
            if (loader) loader.classList.add('hidden');

            // Mantém o nível de zoom escolhido pelo usuário após qualquer
            // recarregamento do conteúdo do Looker.
            const currentZoom = Number(iframe.dataset.zoomLevel || 100);
            requestAnimationFrame(() => setDashboardZoom(currentZoom));
        };

        iframe.onerror = () => {
            if (loader) loader.classList.add('hidden');
            renderEmbedError(dash);
        };

        // A URL principal já está definida diretamente no HTML para reproduzir
        // a mesma estrutura mínima que foi validada no teste. Em trocas de
        // dashboard, atualizamos apenas o src do iframe.
        iframe.src = embedUrl;

        // O onload de um iframe pode disparar mesmo quando o conteúdo interno
        // apresenta uma tela vazia. Portanto, não escondemos o dashboard por
        // timeout nem transformamos um carregamento lento em falso erro.
        iframe._loadTimeout = setTimeout(() => {
            if (loader) loader.classList.add('hidden');
        }, 15000);
    }
}

function normalizeLookerEmbedUrl(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        if (parsed.hostname === 'datastudio.google.com' && parsed.pathname.startsWith('/embed/')) {
            return parsed.toString();
        }
        if (parsed.hostname === 'lookerstudio.google.com' && parsed.pathname.startsWith('/embed/')) {
            return parsed.toString();
        }
        return url;
    } catch (e) {
        return url;
    }
}

function renderEmbedError(dash) {
    const wrapper = document.getElementById('embed-wrapper');
    const iframe = document.getElementById('main-iframe');
    const loader = document.getElementById('iframe-loader');
    if (loader) loader.classList.add('hidden');
    if (iframe) iframe.classList.add('hidden');

    let error = document.getElementById('embed-error');
    if (!error) {
        error = document.createElement('div');
        error.id = 'embed-error';
        error.className = 'absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 text-center';
        wrapper.appendChild(error);
    }

    error.innerHTML = `
        <div class="max-w-lg space-y-4">
            <div class="mx-auto w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <i data-lucide="triangle-alert" class="w-7 h-7 text-red-400"></i>
            </div>
            <h3 class="text-lg font-bold text-white">Não foi possível carregar o dashboard</h3>
            <p class="text-xs text-slate-400">
                O portal conseguiu abrir o iframe, mas o Google Looker Studio não retornou o relatório.
                Verifique o compartilhamento do relatório e se este é exatamente o URL gerado em
                <b>Arquivo → Incorporar relatório → Embed URL</b>.
            </p>
            <div class="flex justify-center gap-2">
                <button onclick="refreshIframe()" class="px-4 py-2 bg-amber-500 text-black font-bold rounded-xl text-xs">Tentar novamente</button>
                <button onclick="openExternalUrl()" class="px-4 py-2 bg-slate-800 text-slate-200 font-semibold rounded-xl text-xs border border-dark-border">Abrir no Google</button>
            </div>
        </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderLocalFallbackNotice(dash) {
    const simBoard = document.getElementById('simulated-board-content');
    if (!simBoard) return;

    simBoard.innerHTML = `
        <div class="max-w-2xl mx-auto py-12 text-center space-y-6">
            <div class="p-4 rounded-full bg-amber-500/10 text-amber-400 w-16 h-16 mx-auto flex items-center justify-center border border-amber-500/20">
                <i data-lucide="external-link" class="w-8 h-8"></i>
            </div>
            
            <div class="space-y-2">
                <h3 class="text-xl font-bold text-white">${dash.title}</h3>
                <p class="text-xs text-slate-400 max-w-md mx-auto">
                    O Google Looker Studio restringe a exibição de relatórios corporativos dentro de arquivos locais (<code class="text-amber-400">file:///</code>)[cite: 5].
                </p>
            </div>

            <div class="pt-2">
                <a href="${dash.url}" target="_blank" rel="noopener noreferrer" 
                   class="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition inline-flex items-center space-x-2 shadow-lg shadow-amber-500/10">
                    <span>Abrir Relatório no Looker Studio</span>
                    <i data-lucide="arrow-up-right" class="w-4 h-4"></i>
                </a>
            </div>

            <p class="text-[11px] text-slate-500 pt-4">
                Ao publicar este portal em um servidor web (como GitHub Pages, Vercel ou Servidor Interno DHL), o relatório será incorporado diretamente nesta tela.
            </p>
        </div>
    `;

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}
function toggleViewerDisplayMode(mode) {
    currentDisplayMode = mode;
    const btnEmbed = document.getElementById('btn-mode-embed');
    const btnSim = document.getElementById('btn-mode-sim');

    if (mode === 'embed') {
        btnEmbed.className = "px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-500 text-black transition";
        btnSim.className = "px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white transition";
    } else {
        btnSim.className = "px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-500 text-black transition";
        btnEmbed.className = "px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white transition";
    }

    if (currentDashboardId) {
        const dash = dashboardsData.find(d => d.id === currentDashboardId);
        if (dash) loadDashboardContent(dash);
    }
}

function renderSimulatedContent(dash) {
    const simBoard = document.getElementById('simulated-board-content');
    if (!simBoard) return;

    simBoard.innerHTML = `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="p-4 bg-dark-card border border-dark-border rounded-xl">
                    <span class="text-xs text-slate-400">Total de Registros</span>
                    <div class="text-2xl font-bold text-amber-400 mt-1 font-mono">${dash.kpis.relatos || 0}</div>
                </div>
                <div class="p-4 bg-dark-card border border-dark-border rounded-xl">
                    <span class="text-xs text-slate-400">Pátio em Destaque</span>
                    <div class="text-2xl font-bold text-white mt-1 font-mono">${dash.kpis.topPatio || 'N/A'}</div>
                </div>
                <div class="p-4 bg-dark-card border border-dark-border rounded-xl">
                    <span class="text-xs text-slate-400">Responsável / Liderança</span>
                    <div class="text-2xl font-bold text-emerald-400 mt-1 font-mono">${dash.kpis.lider || 'N/A'}</div>
                </div>
            </div>

            <div class="bg-dark-card border border-dark-border rounded-2xl p-6 text-center space-y-3">
                <i data-lucide="bar-chart-2" class="w-12 h-12 text-amber-400 mx-auto"></i>
                <h4 class="text-base font-bold text-white">Visualização Interna Local: ${dash.title}</h4>
                <p class="text-xs text-slate-400 max-w-md mx-auto">
                    Para visualizar os gráficos dinâmicos do Looker Studio em tempo real, configure a URL oficial de Embed através do botão "Vincular URLs BI".
                </p>
                <button onclick="openConfigModal()" class="px-4 py-2 bg-amber-500 text-black font-bold rounded-xl text-xs hover:bg-amber-400 transition inline-flex items-center space-x-2">
                    <i data-lucide="settings" class="w-4 h-4"></i>
                    <span>Configurar URL deste Painel</span>
                </button>
            </div>
        </div>
    `;

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function refreshIframe() {
    const iframe = document.getElementById('main-iframe');
    if (iframe && iframe.src) {
        const loader = document.getElementById('iframe-loader');
        if (loader) loader.classList.remove('hidden');
        iframe.src = iframe.src;
    }
}

function setDashboardZoom(level) {
    const iframe = document.getElementById('main-iframe');
    const zoomContainer = document.getElementById('dashboard-zoom-container');
    const button = document.getElementById('fit-screen-btn');
    if (!iframe || !zoomContainer) return;

    const percentage = Math.max(1, Math.min(100, Number(level)));
    const scale = percentage === 80 ? 0.72 : percentage / 100;
    const inverseSize = 100 / scale;

    zoomContainer.style.position = 'relative';
    zoomContainer.style.overflow = 'hidden';
    zoomContainer.style.width = '100%';
    zoomContainer.style.height = '100%';

    iframe.style.setProperty('position', 'absolute', 'important');
    iframe.style.setProperty('top', '0', 'important');
    iframe.style.setProperty('left', '0', 'important');
    iframe.style.setProperty('right', 'auto', 'important');
    iframe.style.setProperty('bottom', 'auto', 'important');
    iframe.style.setProperty('width', percentage === 100 ? '100%' : inverseSize + '%', 'important');
    iframe.style.setProperty('height', percentage === 100 ? '100%' : inverseSize + '%', 'important');
    iframe.style.setProperty('min-width', '0', 'important');
    iframe.style.setProperty('min-height', '0', 'important');
    iframe.style.setProperty('max-width', 'none', 'important');
    iframe.style.setProperty('max-height', 'none', 'important');
    iframe.style.setProperty('transform-origin', 'top left', 'important');
    iframe.style.setProperty('transform', percentage === 100 ? 'none' : 'scale(' + scale + ')', 'important');
    iframe.style.setProperty('zoom', '1', 'important');

    iframe.dataset.zoomLevel = String(percentage);
    zoomContainer.dataset.zoomLevel = String(percentage);

    if (button) {
        button.title = 'Ajustar tamanho — atual: ' + percentage + '%';
        button.classList.toggle('bg-amber-500', percentage !== 100);
        button.classList.toggle('text-black', percentage !== 100);
        button.classList.toggle('bg-slate-900', percentage === 100);
        button.classList.toggle('text-slate-400', percentage === 100);
    }

    document.querySelectorAll('.dashboard-zoom-option').forEach(option => {
        option.classList.remove('bg-amber-500', 'text-black', 'font-bold');
        option.classList.add('text-slate-300');
    });

    const active = document.querySelector('[data-zoom="' + percentage + '"]');
    if (active) {
        active.classList.remove('text-slate-300');
        active.classList.add('bg-amber-500', 'text-black', 'font-bold');
    }
}function toggleDashboardZoom(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const iframe = document.getElementById('main-iframe');
    const current = Number(iframe?.dataset.zoomLevel || 100);
    const next = current === 100 ? 80 : current === 80 ? 60 : 100;
    setDashboardZoom(next);
}

function getZoomMenu() {
    return document.getElementById('dashboard-zoom-menu-portal');
}

function closeZoomMenu() {
    const menu = getZoomMenu();
    if (menu) menu.classList.add('hidden');
}

function positionZoomMenu() {
    const menu = getZoomMenu();
    const button = document.getElementById('fit-screen-btn');
    if (!menu || !button) return;

    const rect = button.getBoundingClientRect();
    const gap = 8;

    // O menu fica no body e usa coordenadas da viewport.
    // Isso evita qualquer interferência de overflow, flex ou z-index dos pais.
    menu.style.setProperty('position', 'fixed', 'important');
    menu.style.setProperty('z-index', '2147483647', 'important');
    menu.style.setProperty('top', (rect.bottom + gap) + 'px', 'important');
    menu.style.setProperty('left', Math.max(8, rect.right - menu.offsetWidth) + 'px', 'important');
    menu.style.setProperty('right', 'auto', 'important');
    menu.style.setProperty('bottom', 'auto', 'important');
    menu.style.setProperty('margin', '0', 'important');
}

function toggleZoomMenu(event) {
    if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    const menu = getZoomMenu();
    const button = document.getElementById('fit-screen-btn');
    if (!menu || !button) return;

    if (menu.parentElement !== document.body) {
        document.body.appendChild(menu);
    }

    const opening = menu.classList.contains('hidden');

    if (opening) {
        menu.classList.remove('hidden');
        positionZoomMenu();
    } else {
        closeZoomMenu();
    }
}

function openZoomMenu(event) {
    toggleZoomMenu(event);
}

function selectDashboardZoom(level, event) {
    if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    setDashboardZoom(level);
    closeZoomMenu();
}

function toggleFitToScreen() {
    toggleDashboardZoom();
}

function toggleFullscreen() {
    const elem = document.getElementById('embed-wrapper');
    if (!elem) return;

    if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => console.log(err));
    } else {
        document.exitFullscreen();
    }
}

function openExternalUrl() {
    if (!currentDashboardId) return;
    const dash = dashboardsData.find(d => d.id === currentDashboardId);
    if (dash && dash.url) {
        window.open(dash.url, '_blank');
    }
}


/* ---------------------------------------------------------
   EVENT LISTENERS & EVENT DELEGATION
   --------------------------------------------------------- */

function setupEventListeners() {

    /* --- MENU DE ZOOM DO DASHBOARD --- */
    const zoomButton = document.getElementById('fit-screen-btn');
    const zoomMenu = getZoomMenu();

    if (zoomButton && zoomMenu) {
        // O menu é portado para o body para não ser cortado por overflow.
        if (zoomMenu.parentElement !== document.body) {
            document.body.appendChild(zoomMenu);
        }

        zoomButton.addEventListener('click', (event) => {
            toggleZoomMenu(event);
        });

        zoomMenu.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        document.addEventListener('click', (event) => {
            if (!zoomMenu.classList.contains('hidden') &&
                !zoomButton.contains(event.target) &&
                !zoomMenu.contains(event.target)) {
                closeZoomMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeZoomMenu();
        });

        window.addEventListener('resize', () => {
            if (!zoomMenu.classList.contains('hidden')) positionZoomMenu();
        });

        document.addEventListener('scroll', () => {
            if (!zoomMenu.classList.contains('hidden')) positionZoomMenu();
        }, true);
    }

    /* --- FILTROS DE CATEGORIA --- */
    const categoryContainer = document.getElementById('category-filters');
    if (categoryContainer) {
        categoryContainer.addEventListener('click', (event) => {
            const button = event.target.closest('.filter-btn');
            if (!button) return;

            const filterButtons = categoryContainer.querySelectorAll('.filter-btn');

            filterButtons.forEach((btn) => {
                btn.classList.remove('bg-amber-500', 'text-black', 'font-semibold');
                btn.classList.add('bg-dark-card', 'text-slate-400', 'border', 'border-dark-border');
            });

            button.classList.remove('bg-dark-card', 'text-slate-400', 'border', 'border-dark-border');
            button.classList.add('bg-amber-500', 'text-black', 'font-semibold');

            activeFilter = button.getAttribute('data-filter') || 'all';
            renderDashboardsGrid();
        });
    }

    /* --- BUSCA GLOBAL --- */
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            activeSearchQuery = e.target.value;
            renderDashboardsGrid();
        });
    }

    /* --- SIDEBAR TOGGLE --- */
    const toggleBtn = document.getElementById('toggle-sidebar');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('w-64');
            sidebar.classList.toggle('w-16');
            document.querySelectorAll('.sidebar-text').forEach(el => el.classList.toggle('hidden'));
        });
    }

    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
        });
    }

    /* --- THEME TOGGLE --- */
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('light');
            showToast('Tema alterado.');
        });
    }

    /* --- FORMULÁRIO DE CONFIGURAÇÃO DE EMBEDS --- */
    const configForm = document.getElementById('config-form');
    if (configForm) {
        configForm.addEventListener('submit', (e) => {
            e.preventDefault();

            dashboardsData.forEach(dash => {
                const input = document.getElementById(`config-input-${dash.id}`);
                if (input) {
                    dash.url = input.value.trim();
                }
            });

            localStorage.setItem(DASHBOARDS_STORAGE_KEY, JSON.stringify(dashboardsData));
            showToast('URLs dos relatórios salvas com sucesso!');
            closeConfigModal();

            if (currentDashboardId) {
                openDashboardViewer(currentDashboardId);
            } else {
                renderDashboardsGrid();
            }
        });
    }
}


/* ---------------------------------------------------------
   MODAL DE CONFIGURAÇÃO
   --------------------------------------------------------- */

function openConfigModal() {
    const modal = document.getElementById('config-modal');
    const inputsContainer = document.getElementById('modal-inputs-container');

    if (!modal || !inputsContainer) return;

    inputsContainer.innerHTML = '';

    dashboardsData.forEach(dash => {
        const field = document.createElement('div');
        field.className = "space-y-1";
        field.innerHTML = `
            <label class="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>${dash.title}</span>
                <span class="text-[10px] text-amber-400 font-mono">${dash.platform}</span>
            </label>
            <input type="url" id="config-input-${dash.id}" value="${dash.url || ''}" placeholder="https://lookerstudio.google.com/embed/reporting/..." 
                class="w-full bg-slate-900 border border-dark-border rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none">
        `;
        inputsContainer.appendChild(field);
    });

    modal.classList.remove('hidden');
}

function closeConfigModal() {
    const modal = document.getElementById('config-modal');
    if (modal) modal.classList.add('hidden');
}

function resetDefaultUrls() {
    dashboardsData = JSON.parse(JSON.stringify(DEFAULT_DASHBOARDS));
    localStorage.removeItem(DASHBOARDS_STORAGE_KEY);
    showToast('URLs restauradas para as configurações padrão.');
    openConfigModal();
}


/* ---------------------------------------------------------
   KIOSK MODE & UTILITÁRIOS
   --------------------------------------------------------- */

function toggleKioskMode() {
    document.body.classList.toggle('kiosk-mode');
    const isKiosk = document.body.classList.contains('kiosk-mode');

    if (isKiosk) {
        if (dashboardsData.length === 0) return;
        kioskIndex = 0;
        openDashboardViewer(dashboardsData[0].id);
        showToast('Modo Apresentação ativado (Rotação a cada 15s).');

        kioskInterval = setInterval(() => {
            kioskIndex = (kioskIndex + 1) % dashboardsData.length;
            openDashboardViewer(dashboardsData[kioskIndex].id);
        }, 15000);
    } else {
        if (kioskInterval) {
            clearInterval(kioskInterval);
            kioskInterval = null;
        }
        showToast('Modo Apresentação desativado.');
        navigateTo('hub');
    }
}

function showToast(message) {
    const container = document.getElementById('toast-container') || document.body;
    const toast = document.createElement('div');

    toast.className = `
        bg-slate-900 border border-amber-500/30 text-slate-100 px-4 py-3 
        rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 opacity-100 pointer-events-auto
    `;

    toast.innerHTML = `
        <i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-400 shrink-0"></i>
        <span class="text-xs font-medium">${message}</span>
    `;

    container.appendChild(toast);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function shareDashboardLink(id) {
    const url = `${window.location.origin}${window.location.pathname}?dashboard=${id}`;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url)
            .then(() => showToast('Link do módulo copiado!'))
            .catch(() => fallbackCopy(url));
    } else {
        fallbackCopy(url);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        showToast('Link do módulo copiado!');
    } catch (err) {
        showToast('Não foi possível copiar o link.');
    }

    textarea.remove();
}

function setupClock() {
    const clockEl = document.getElementById('live-clock');
    const dateEl = document.getElementById('live-date');

    if (!clockEl) return;

    function update() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('pt-BR');
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
    }

    update();
    setInterval(update, 1000);
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const dashboardId = urlParams.get('dashboard');

    if (dashboardId) {
        const target = dashboardsData.find(d => d.id === dashboardId);
        if (target) {
            openDashboardViewer(target.id);
        }
    }
}