// --- src/modules/events/SearchEvents.js ---
// Eventos de Busca

class SearchEvents {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.init();
    }

    init() {
        // Delegar eventos para campo de busca global
        this.eventManager.delegate('#topbar-search-input', 'input', (e) => {
            if (window.searchManager) window.searchManager.handleInput(e);
        });
        this.eventManager.delegate('#topbar-search-input', 'keydown', (e) => {
            if (window.searchManager) window.searchManager.handleKeydown(e);
        });
        this.eventManager.delegate('#topbar-search-input', 'blur', (e) => {
            if (window.searchManager) window.searchManager.handleBlur(e);
        });
    }
}

// Exportar para uso global
window.SearchEvents = SearchEvents; 