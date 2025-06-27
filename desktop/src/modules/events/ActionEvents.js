// --- src/modules/events/ActionEvents.js ---
// Eventos de Ações (editar, excluir, entregar, etc.)

class ActionEvents {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.init();
    }

    init() {
        // Delegar eventos para botões de ação usando data-action
        this.eventManager.delegate('[data-action]', 'click', (e) => {
            const action = e.target.dataset.action;
            const targetId = e.target.dataset.targetId;
            this.handleAction(action, targetId, e);
        });
    }

    handleAction(action, targetId, event) {
        switch (action) {
            case 'edit-encomenda':
                if (window.contentManager) window.contentManager.iniciarEdicaoEncomenda(targetId);
                break;
            case 'delete-encomenda':
                if (window.contentManager) window.contentManager.deletarEncomenda(targetId);
                break;
            case 'deliver-encomenda':
                if (window.contentManager) window.contentManager.abrirModalEntrega(targetId);
                break;
            // Adicione outros casos conforme necessário
        }
    }
}

// Exportar para uso global
window.ActionEvents = ActionEvents; 