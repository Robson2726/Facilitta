// === GERENCIADOR DE MODAIS ===

import { $, classUtils, formUtils, createElement } from '../core/dom-utils.js';
import { eventManager } from '../core/event-manager.js';
import { SELECTORS, CONFIG, CSS_CLASSES, MESSAGES } from '../core/constants.js';

class ModalManager {
    constructor() {
        this.activeModals = new Map();
        this.modalStack = [];
        this.focusedElementBeforeModal = null;
        
        this.setupGlobalListeners();
    }

    setupGlobalListeners() {
        // ESC key para fechar modais
        eventManager.on(document, 'keydown', (e) => {
            if (e.key === 'Escape' && this.modalStack.length > 0) {
                this.closeTopModal();
            }
        });

        // Click fora do modal para fechar
        eventManager.on(document, 'click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeTopModal();
            }
        });
    }

    /**
     * Abre modal genérico
     */
    openModal(modalId, options = {}) {
        const modal = $(modalId);
        if (!modal) {
            console.error(`Modal ${modalId} not found`);
            return false;
        }

        // Salva elemento com foco atual
        if (this.modalStack.length === 0) {
            this.focusedElementBeforeModal = document.activeElement;
        }

        // Adiciona à pilha
        this.modalStack.push(modalId);
        this.activeModals.set(modalId, { modal, options });

        // Exibe modal
        classUtils.remove(modal, CSS_CLASSES.HIDDEN);
        classUtils.add(modal, CSS_CLASSES.ACTIVE);

        // Focus management
        this.setupModalFocus(modal);

        // Callback de abertura
        if (options.onOpen) {
            options.onOpen(modal);
        }

        // Evento customizado
        eventManager.trigger(modal, 'modal-opened', { modalId, options });

        return true;
    }

    /**
     * Fecha modal específico
     */
    closeModal(modalId) {
        const modalData = this.activeModals.get(modalId);
        if (!modalData) return false;

        const { modal, options } = modalData;

        // Remove da pilha
        const index = this.modalStack.indexOf(modalId);
        if (index > -1) {
            this.modalStack.splice(index, 1);
        }

        // Oculta modal
        classUtils.add(modal, CSS_CLASSES.HIDDEN);
        classUtils.remove(modal, CSS_CLASSES.ACTIVE);

        // Remove do mapa
        this.activeModals.delete(modalId);

        // Callback de fechamento
        if (options.onClose) {
            options.onClose(modal);
        }

        // Restaura foco se for o último modal
        if (this.modalStack.length === 0 && this.focusedElementBeforeModal) {
            this.focusedElementBeforeModal.focus();
            this.focusedElementBeforeModal = null;
        }

        // Evento customizado
        eventManager.trigger(modal, 'modal-closed', { modalId });

        return true;
    }

    /**
     * Fecha o modal do topo da pilha
     */
    closeTopModal() {
        if (this.modalStack.length > 0) {
            const topModalId = this.modalStack[this.modalStack.length - 1];
            this.closeModal(topModalId);
        }
    }

    /**
     * Fecha todos os modais
     */
    closeAllModals() {
        const modalsToClose = [...this.modalStack];
        modalsToClose.forEach(modalId => this.closeModal(modalId));
    }

    /**
     * Configuração de foco para acessibilidade
     */
    setupModalFocus(modal) {
        // Focus no primeiro elemento focável
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        // Trap focus dentro do modal
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        eventManager.on(modal, 'keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        lastFocusable.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        firstFocusable.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }

    /**
     * Modal de Encomenda
     */
    async openEncomendaModal(encomendaId = null, packageData = null) {
        const modalId = SELECTORS.modalCadastroEncomenda;
        const modal = $(modalId);
        if (!modal) return false;

        const form = $(SELECTORS.formCadastroEncomenda);
        const title = modal.querySelector('.modal-title');

        // Configuração baseada em edição ou criação
        const isEdit = encomendaId !== null;
        
        if (title) {
            title.textContent = isEdit ? 'Editar Encomenda' : 'Nova Encomenda';
        }

        // Limpa e preenche formulário
        if (form) {
            formUtils.reset(form);
            
            if (isEdit && packageData) {
                formUtils.setData(form, packageData);
            } else {
                // Preenche data/hora atual para nova encomenda
                this.preencherDataHoraAtual(form);
            }
        }

        // Configura autocomplete
        this.setupEncomendaAutocomplete();

        return this.openModal(modalId, {
            onOpen: () => {
                // Focus no primeiro campo
                const firstInput = form?.querySelector('input');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }
            },
            onClose: () => {
                // Limpa dados temporários
                this.clearEncomendaState();
            }
        });
    }

    /**
     * Modal de Morador
     */
    async openMoradorModal(moradorId = null) {
        const modalId = SELECTORS.modalCadastroMorador;
        const modal = $(modalId);
        if (!modal) return false;

        const form = $(SELECTORS.formCadastroMorador);
        const title = $(SELECTORS.modalMoradorTitle);
        const saveButton = $(SELECTORS.btnSalvarMorador);

        const isEdit = moradorId !== null;

        // Atualiza título e botão
        if (title) {
            title.textContent = isEdit ? 'Editar Morador' : 'Cadastrar Morador';
        }
        if (saveButton) {
            saveButton.textContent = isEdit ? 'Atualizar' : 'Cadastrar';
        }

        // Limpa formulário
        if (form) {
            formUtils.reset(form);
        }

        // Carrega dados se for edição
        if (isEdit) {
            try {
                const residentData = await window.electronAPI.getResidentById(moradorId);
                if (residentData && form) {
                    formUtils.setData(form, residentData);
                }
            } catch (error) {
                console.error('Erro ao carregar dados do morador:', error);
                this.showMessage(MESSAGES.CONNECTION_ERROR, 'error');
                return false;
            }
        }

        return this.openModal(modalId, {
            data: { moradorId, isEdit },
            onOpen: () => {
                const firstInput = form?.querySelector('input');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }
            }
        });
    }

    /**
     * Modal de Usuário
     */
    async openUsuarioModal(userId = null) {
        const modalId = SELECTORS.modalCadastroUsuario;
        const modal = $(modalId);
        if (!modal) return false;

        const form = $(SELECTORS.formCadastroUsuario);
        const title = $(SELECTORS.modalUsuarioTitle);
        const saveButton = $(SELECTORS.btnSalvarUsuario);
        const statusGroup = $(SELECTORS.grupoStatusUsuario);

        const isEdit = userId !== null;

        // Atualiza UI
        if (title) {
            title.textContent = isEdit ? 'Editar Usuário' : 'Cadastrar Usuário';
        }
        if (saveButton) {
            saveButton.textContent = isEdit ? 'Atualizar' : 'Cadastrar';
        }

        // Show/hide status field based on edit mode
        if (statusGroup) {
            if (isEdit) {
                classUtils.remove(statusGroup, CSS_CLASSES.HIDDEN);
            } else {
                classUtils.add(statusGroup, CSS_CLASSES.HIDDEN);
            }
        }

        // Reset form
        if (form) {
            formUtils.reset(form);
        }

        // Load data for edit
        if (isEdit) {
            try {
                const userData = await window.electronAPI.getUserById(userId);
                if (userData && form) {
                    formUtils.setData(form, userData);
                }
            } catch (error) {
                console.error('Erro ao carregar dados do usuário:', error);
                this.showMessage(MESSAGES.CONNECTION_ERROR, 'error');
                return false;
            }
        }

        return this.openModal(modalId, {
            data: { userId, isEdit },
            onOpen: () => {
                const firstInput = form?.querySelector('input');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }
            }
        });
    }

    /**
     * Modal de Entrega
     */
    openEntregaModal(packageId, moradorNome) {
        const modalId = SELECTORS.modalEntregaEncomenda;
        const modal = $(modalId);
        if (!modal) return false;

        const form = $(SELECTORS.formEntregaEncomenda);
        const packageIdInput = modal.querySelector('#entrega-encomenda-id');
        const moradorInfoInput = modal.querySelector('#entrega-morador-info');

        // Reset and setup form
        if (form) {
            formUtils.reset(form);
            this.preencherDataHoraAtual(form);
        }

        // Fill package info
        if (packageIdInput) packageIdInput.value = packageId;
        if (moradorInfoInput) moradorInfoInput.value = moradorNome;

        // Setup porteiro autocomplete
        this.setupEntregaPorteiroAutocomplete();

        return this.openModal(modalId, {
            data: { packageId, moradorNome },
            onOpen: () => {
                const porteiroInput = modal.querySelector('#entrega-porteiro');
                if (porteiroInput) {
                    setTimeout(() => porteiroInput.focus(), 100);
                }
            }
        });
    }

    /**
     * Utilitários para modais específicos
     */
    preencherDataHoraAtual(form) {
        if (!form) return;

        const now = new Date();
        const dateInput = form.querySelector('[name="data"], #data, #entrega-data');
        const timeInput = form.querySelector('[name="hora"], #hora, #entrega-hora');

        if (dateInput) {
            dateInput.value = now.toISOString().split('T')[0];
        }

        if (timeInput) {
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            timeInput.value = `${hours}:${minutes}`;
        }
    }

    setupEncomendaAutocomplete() {
        // Implementar autocomplete específico para encomendas
        // Será detalhado no módulo de autocomplete
    }

    setupEntregaPorteiroAutocomplete() {
        // Implementar autocomplete para porteiros na entrega
        // Será detalhado no módulo de autocomplete
    }

    clearEncomendaState() {
        // Limpa estados temporários do modal de encomenda
        window.selectedMoradorId = null;
        window.selectedPorteiroUserId = null;
    }

    showMessage(message, type = 'info') {
        // Implementar sistema de mensagens
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    /**
     * Verifica se algum modal está aberto
     */
    hasOpenModal() {
        return this.modalStack.length > 0;
    }

    /**
     * Obtém o modal ativo no topo
     */
    getTopModal() {
        if (this.modalStack.length === 0) return null;
        const topModalId = this.modalStack[this.modalStack.length - 1];
        return this.activeModals.get(topModalId);
    }

    /**
     * Cleanup
     */
    destroy() {
        this.closeAllModals();
        this.activeModals.clear();
        this.modalStack = [];
    }
}

// Instância global
export const modalManager = new ModalManager();

// Atalhos para abertura de modais específicos
export const openEncomendaModal = (id, data) => modalManager.openEncomendaModal(id, data);
export const openMoradorModal = (id) => modalManager.openMoradorModal(id);
export const openUsuarioModal = (id) => modalManager.openUsuarioModal(id);
export const openEntregaModal = (packageId, moradorNome) => modalManager.openEntregaModal(packageId, moradorNome);

// Atalhos para fechamento
export const closeModal = (modalId) => modalManager.closeModal(modalId);
export const closeAllModals = () => modalManager.closeAllModals();