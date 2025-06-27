// --- src/renderer-modular.js ---
// Renderer Modular - Carregador de Módulos

console.log('[Renderer Modular] Inicializando sistema modular...');

// Verificar se Chart.js foi carregado
window.addEventListener('load', function() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não foi carregado do CDN!');
        // Tentar carregar versão alternativa
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
        script.onload = function() {
            console.log('Chart.js carregado da versão alternativa');
        };
        script.onerror = function() {
            console.error('Falha ao carregar Chart.js de ambas as fontes');
        };
        document.head.appendChild(script);
    }
    else {
        console.log('Chart.js carregado com sucesso, versão:', Chart.version || 'desconhecida');
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Renderer Modular] DOM Carregado.');

    // --- Carregamento de Módulos ---
    const modules = [
        { name: 'Performance', path: 'config/performance.js' },
        { name: 'Auth', path: 'modules/auth.js' },
        { name: 'Modals', path: 'modules/modals.js' },
        { name: 'Autocomplete', path: 'modules/autocomplete.js' },
        { name: 'Search', path: 'modules/search.js' },
        { name: 'Content', path: 'modules/content.js' },
        { name: 'Dashboard', path: 'modules/dashboard.js' },
        { name: 'Forms', path: 'modules/forms.js' },
        { name: 'ModoLote', path: 'modules/modo-lote.js' },
        { name: 'App', path: 'modules/app.js' }
    ];

    // Carregar módulos sequencialmente
    for (const module of modules) {
        try {
            console.log(`[Renderer Modular] Carregando módulo: ${module.name}`);
            await loadModule(module.path);
            console.log(`[Renderer Modular] Módulo ${module.name} carregado com sucesso`);
        } catch (error) {
            console.error(`[Renderer Modular] Erro ao carregar módulo ${module.name}:`, error);
        }
    }

    // --- Inicialização dos Gerenciadores ---
    try {
        // Inicializar Performance Manager primeiro
        if (window.PerformanceManager) {
            window.performanceManager = new window.PerformanceManager();
            console.log('[Renderer Modular] Performance Manager inicializado');
        }

        // Inicializar managers globais (ordem importa!)
        if (window.AuthManager) {
            window.authManager = new window.AuthManager();
            console.log('[Renderer Modular] AuthManager inicializado');
        }
        if (window.ModalManager) {
            window.modalManager = new window.ModalManager();
            console.log('[Renderer Modular] ModalManager inicializado');
        }
        if (window.AutocompleteManager) {
            window.autocompleteManager = new window.AutocompleteManager();
            console.log('[Renderer Modular] AutocompleteManager inicializado');
        }
        if (window.SearchManager) {
            window.searchManager = new window.SearchManager();
            console.log('[Renderer Modular] SearchManager inicializado');
        }
        if (window.ContentManager) {
            window.contentManager = new window.ContentManager();
            console.log('[Renderer Modular] ContentManager inicializado');
        }
        if (window.DashboardManager) {
            window.dashboardManager = new window.DashboardManager();
            console.log('[Renderer Modular] DashboardManager inicializado');
        }
        if (window.FormsManager) {
            window.formsManager = new window.FormsManager();
            console.log('[Renderer Modular] FormsManager inicializado');
        }
        if (window.ModoLoteManager) {
            window.modoLoteManager = new window.ModoLoteManager();
            console.log('[Renderer Modular] ModoLoteManager inicializado');
        }

        // Inicializar App Manager por último
        if (window.AppManager) {
            window.appManager = new window.AppManager();
            console.log('[Renderer Modular] AppManager inicializado');
        }

        // Inicializar EventManager e módulos de eventos
        if (window.EventManager) {
            window.eventManager = new window.EventManager();
            if (window.FormEvents) window.formEvents = new window.FormEvents(window.eventManager);
            if (window.ModalEvents) window.modalEvents = new window.ModalEvents(window.eventManager);
            if (window.ActionEvents) window.actionEvents = new window.ActionEvents(window.eventManager);
            if (window.SearchEvents) window.searchEvents = new window.SearchEvents(window.eventManager);
            if (window.AutocompleteEvents) window.autocompleteEvents = new window.AutocompleteEvents(window.eventManager);
            console.log('[Renderer Modular] EventManager e módulos de eventos inicializados');
        }

        // Inicialização do app concluída
        console.log('[Renderer Modular] Inicialização completa!');
    } catch (err) {
        console.error('[Renderer Modular] Erro na inicialização:', err);
    }
});

// Função para carregar módulos
async function loadModule(modulePath) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = modulePath;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Falha ao carregar ${modulePath}`));
        document.head.appendChild(script);
    });
}

// Função para verificar se todos os módulos estão carregados
function checkModulesLoaded() {
    const requiredModules = [
        'PerformanceManager', 'AuthManager', 'ModalsManager', 
        'AutocompleteManager', 'SearchManager', 'ContentManager',
        'DashboardManager', 'FormsManager', 'ModoLoteManager', 'AppManager'
    ];

    const loadedModules = requiredModules.filter(module => window[module]);
    const missingModules = requiredModules.filter(module => !window[module]);

    console.log('[Renderer Modular] Módulos carregados:', loadedModules.length, 'de', requiredModules.length);
    
    if (missingModules.length > 0) {
        console.warn('[Renderer Modular] Módulos faltando:', missingModules);
    }

    return missingModules.length === 0;
}

// Exportar função de verificação para uso global
window.checkModulesLoaded = checkModulesLoaded;

// Exportar funções globais para compatibilidade
window.showStatusMessage = (message, type, stickyError) => {
    if (window.appManager) {
        window.appManager.showStatusMessage(message, type, stickyError);
    }
};

window.getCurrentUser = () => {
    if (window.appManager) {
        return window.appManager.getCurrentUser();
    }
    return null;
};

window.isAdmin = () => {
    if (window.appManager) {
        return window.appManager.isAdmin();
    }
    return false;
};

console.log('[Renderer Modular] Script carregado'); 