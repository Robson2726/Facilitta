// === SISTEMA DE NOTIFICAÇÕES ===

import { createElement, classUtils } from '../core/dom-utils.js';
import { eventManager } from '../core/event-manager.js';
import { CONFIG } from '../core/constants.js';

class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.container = null;
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        
        this.createContainer();
    }

    createContainer() {
        // Remove container existente
        const existing = document.getElementById('notifications-container');
        if (existing) {
            existing.remove();
        }

        this.container = createElement('div', {
            id: 'notifications-container',
            className: 'notifications-container',
            parent: document.body
        });
    }

    /**
     * Exibe notificação
     */
    show(message, type = 'info', options = {}) {
        const config = {
            duration: this.defaultDuration,
            closable: true,
            actions: [],
            ...options
        };

        const id = `notification_${Date.now()}_${Math.random()}`;
        
        const notification = this.createNotification(id, message, type, config);
        
        // Adiciona ao container
        this.container.appendChild(notification);
        
        // Anima entrada
        requestAnimationFrame(() => {
            classUtils.add(notification, 'notification-visible');
        });
        
        // Armazena referência
        this.notifications.set(id, notification);
        
        // Auto-close se configurado
        if (config.duration > 0) {
            setTimeout(() => {
                this.close(id);
            }, config.duration);
        }
        
        // Limita quantidade máxima
        this.enforceLimits();
        
        return id;
    }

    createNotification(id, message, type, config) {
        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const notification = createElement('div', {
            className: `notification notification-${type}`,
            id: id,
            innerHTML: `
                <div class="notification-content">
                    <div class="notification-icon">
                        <i class="fas ${iconMap[type] || iconMap.info}"></i>
                    </div>
                    <div class="notification-message">
                        ${message}
                    </div>
                    ${config.closable ? `
                        <button class="notification-close" data-notification-id="${id}">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
                ${config.actions.length > 0 ? `
                    <div class="notification-actions">
                        ${config.actions.map(action => `
                            <button class="btn btn-sm notification-action" 
                                    data-notification-id="${id}"
                                    data-action="${action.id}">
                                ${action.label}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            `
        });

        // Event listeners
        if (config.closable) {
            const closeBtn = notification.querySelector('.notification-close');
            if (closeBtn) {
                eventManager.on(closeBtn, 'click', () => {
                    this.close(id);
                });
            }
        }

        // Action buttons
        const actionBtns = notification.querySelectorAll('.notification-action');
        actionBtns.forEach(btn => {
            eventManager.on(btn, 'click', (e) => {
                const actionId = e.target.dataset.action;
                const action = config.actions.find(a => a.id === actionId);
                if (action && action.handler) {
                    action.handler();
                }
                this.close(id);
            });
        });

        return notification;
    }

    /**
     * Fecha notificação específica
     */
    close(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Anima saída
        classUtils.remove(notification, 'notification-visible');
        classUtils.add(notification, 'notification-closing');

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
            this.notifications.delete(id);
        }, 300);
    }

    /**
     * Fecha todas as notificações
     */
    closeAll() {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.close(id));
    }

    /**
     * Limita quantidade máxima de notificações
     */
    enforceLimits() {
        if (this.notifications.size > this.maxNotifications) {
            const oldestId = this.notifications.keys().next().value;
            this.close(oldestId);
        }
    }

    /**
     * Atalhos para tipos específicos
     */
    success(message, options = {}) {
        return this.show(message, 'success', {
            duration: CONFIG.STATUS_MESSAGE_DELAY,
            ...options
        });
    }

    error(message, options = {}) {
        return this.show(message, 'error', {
            duration: CONFIG.ERROR_MESSAGE_DELAY,
            ...options
        });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', {
            duration: CONFIG.ERROR_MESSAGE_DELAY,
            ...options
        });
    }

    info(message, options = {}) {
        return this.show(message, 'info', {
            duration: CONFIG.STATUS_MESSAGE_DELAY,
            ...options
        });
    }

    /**
     * Notificação de confirmação
     */
    confirm(message, onConfirm, onCancel = null) {
        return this.show(message, 'warning', {
            duration: 0, // Não fecha automaticamente
            closable: false,
            actions: [
                {
                    id: 'confirm',
                    label: 'Confirmar',
                    handler: onConfirm
                },
                {
                    id: 'cancel',
                    label: 'Cancelar',
                    handler: onCancel || (() => {})
                }
            ]
        });
    }

    /**
     * Notificação de progresso
     */
    progress(message, progress = 0) {
        const id = `progress_${Date.now()}`;
        
        const notification = createElement('div', {
            className: 'notification notification-progress',
            id: id,
            innerHTML: `
                <div class="notification-content">
                    <div class="notification-icon">
                        <div class="loading-spinner small"></div>
                    </div>
                    <div class="notification-message">
                        ${message}
                    </div>
                    <div class="notification-progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            `,
            parent: this.container
        });

        // Anima entrada
        requestAnimationFrame(() => {
            classUtils.add(notification, 'notification-visible');
        });

        this.notifications.set(id, notification);

        return {
            id,
            updateProgress: (newProgress) => {
                const progressFill = notification.querySelector('.progress-fill');
                if (progressFill) {
                    progressFill.style.width = `${newProgress}%`;
                }
            },
            updateMessage: (newMessage) => {
                const messageEl = notification.querySelector('.notification-message');
                if (messageEl) {
                    messageEl.textContent = newMessage;
                }
            },
            close: () => this.close(id)
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        this.closeAll();
        if (this.container) {
            this.container.remove();
        }
    }
}

// Instância global
export const notificationManager = new NotificationManager();

// Atalhos para uso global
export const showNotification = (message, type, options) => notificationManager.show(message, type, options);
export const showSuccess = (message, options) => notificationManager.success(message, options);
export const showError = (message, options) => notificationManager.error(message, options);
export const showWarning = (message, options) => notificationManager.warning(message, options);
export const showInfo = (message, options) => notificationManager.info(message, options);
export const showConfirm = (message, onConfirm, onCancel) => notificationManager.confirm(message, onConfirm, onCancel);
export const showProgress = (message, progress) => notificationManager.progress(message, progress);

// CSS básico para notificações (pode ser movido para arquivo CSS)
const notificationStyles = `
<style>
.notifications-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    pointer-events: none;
}

.notification {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    margin-bottom: 10px;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    pointer-events: auto;
    max-width: 400px;
}

.notification-visible {
    opacity: 1;
    transform: translateX(0);
}

.notification-closing {
    opacity: 0;
    transform: translateX(100%);
}

.notification-content {
    display: flex;
    align-items: flex-start;
    padding: 16px;
}

.notification-icon {
    margin-right: 12px;
    font-size: 18px;
}

.notification-message {
    flex: 1;
    font-size: 14px;
    line-height: 1.4;
}

.notification-close {
    background: none;
    border: none;
    font-size: 14px;
    cursor: pointer;
    opacity: 0.6;
    margin-left: 8px;
}

.notification-close:hover {
    opacity: 1;
}

.notification-actions {
    padding: 0 16px 16px;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.notification-progress-bar {
    width: 100%;
    height: 4px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;
    margin-top: 8px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: #007bff;
    transition: width 0.3s ease;
}

/* Tipos de notificação */
.notification-success .notification-icon { color: #28a745; }
.notification-error .notification-icon { color: #dc3545; }
.notification-warning .notification-icon { color: #ffc107; }
.notification-info .notification-icon { color: #17a2b8; }

.notification-success { border-left: 4px solid #28a745; }
.notification-error { border-left: 4px solid #dc3545; }
.notification-warning { border-left: 4px solid #ffc107; }
.notification-info { border-left: 4px solid #17a2b8; }
</style>
`;

// Injeta estilos
if (!document.getElementById('notification-styles')) {
    const styleElement = createElement('div', {
        id: 'notification-styles',
        innerHTML: notificationStyles,
        parent: document.head
    });
}