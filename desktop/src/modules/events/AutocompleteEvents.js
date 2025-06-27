// --- src/modules/events/AutocompleteEvents.js ---
// Eventos de Autocomplete

class AutocompleteEvents {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.init();
    }

    init() {
        // Delegar eventos para campos de autocomplete
        this.eventManager.delegate('#morador', 'input', (e) => {
            if (window.autocompleteManager) window.autocompleteManager.handleMoradorInput(e);
        });
        this.eventManager.delegate('#morador', 'keydown', (e) => {
            if (window.autocompleteManager) window.autocompleteManager.handleMoradorKeyboard(e);
        });
        this.eventManager.delegate('#porteiro', 'input', (e) => {
            if (window.autocompleteManager) window.autocompleteManager.handlePorteiroInput(e);
        });
        this.eventManager.delegate('#porteiro', 'keydown', (e) => {
            if (window.autocompleteManager) window.autocompleteManager.handlePorteiroKeyboard(e);
        });
        this.eventManager.delegate('#entrega-porteiro', 'input', (e) => {
            if (window.autocompleteManager) window.autocompleteManager.handleEntregaPorteiroInput(e);
        });
    }
}

// Exportar para uso global
window.AutocompleteEvents = AutocompleteEvents; 