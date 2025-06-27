// --- src/modules/events/FormEvents.js ---
// Eventos de Formulários

class FormEvents {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.init();
    }

    init() {
        // Delegar eventos de submit para todos os formulários relevantes
        this.eventManager.delegate('#form-cadastro-encomenda', 'submit', (e) => this.handleEncomendaSubmit(e));
        this.eventManager.delegate('#form-entrega-encomenda', 'submit', (e) => this.handleEntregaSubmit(e));
        this.eventManager.delegate('#form-cadastro-morador', 'submit', (e) => this.handleMoradorSubmit(e));
        this.eventManager.delegate('#form-cadastro-usuario', 'submit', (e) => this.handleUsuarioSubmit(e));
        this.eventManager.delegate('#form-config-banco', 'submit', (e) => this.handleConfigBancoSubmit(e));
    }

    handleEncomendaSubmit(e) {
        if (window.formsManager) {
            window.formsManager.handleEncomendaSubmit(e);
        }
    }

    handleEntregaSubmit(e) {
        if (window.formsManager) {
            window.formsManager.handleEntregaSubmit(e);
        }
    }

    handleMoradorSubmit(e) {
        if (window.formsManager) {
            window.formsManager.handleMoradorSubmit(e);
        }
    }

    handleUsuarioSubmit(e) {
        if (window.formsManager) {
            window.formsManager.handleUsuarioSubmit(e);
        }
    }

    handleConfigBancoSubmit(e) {
        if (window.contentManager) {
            // O método de submit do config banco está em contentManager
            window.contentManager.handleConfigBancoSubmit(e);
        }
    }
}

// Exportar para uso global
window.FormEvents = FormEvents; 