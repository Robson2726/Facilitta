// --- src/modules/events/ModalEvents.js ---
// Eventos de Modais

class ModalEvents {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.init();
    }

    init() {
        // Botões de cancelar dos modais
        this.eventManager.delegate('#btn-cancelar-encomenda-modal', 'click', () => {
            if (window.modalManager) window.modalManager.closeEncomendaModal();
        });
        this.eventManager.delegate('#btn-cancelar-morador-modal', 'click', () => {
            if (window.modalManager) window.modalManager.closeMoradorModal();
        });
        this.eventManager.delegate('#btn-cancelar-usuario-modal', 'click', () => {
            if (window.modalManager) window.modalManager.closeUsuarioModal();
        });
        this.eventManager.delegate('#btn-cancelar-entrega-modal', 'click', () => {
            if (window.modalManager) window.modalManager.closeEntregaModal();
        });
    }
}

// Exportar para uso global
window.ModalEvents = ModalEvents; 