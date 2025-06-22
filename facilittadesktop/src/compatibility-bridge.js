// === BRIDGE DE COMPATIBILIDADE ===

/**
 * Este arquivo garante compatibilidade entre o sistema legado (renderer.js)
 * e o novo sistema modular, permitindo migração gradual e testes seguros.
 */

// Importa módulos do novo sistema
import app from './renderer-main.js';
import { authManager } from './modules/managers/auth-manager.js';
import { modalManager, openEncomendaModal, openMoradorModal, openUsuarioModal, openEntregaModal } from './modules/managers/modal-manager.js';
import { searchManager } from './modules/managers/search-manager.js';
import { chartManager } from './modules/managers/chart-manager.js';
import { autocompleteManager, setupMoradorAutocomplete, setupPorteiroAutocomplete, setupEntregaPorteiroAutocomplete, getSelectedIds } from './modules/components/autocomplete.js';

console.log('[CompatibilityBridge] Initializing compatibility bridge...');

/**
 * Expõe APIs do novo sistema para o código legado
 */
window.ModularSystem = {
    // Gerenciadores principais
    auth: authManager,
    modals: modalManager,
    search: searchManager,
    charts: chartManager,
    autocomplete: autocompleteManager,
    
    // Atalhos para funções comuns
    openEncomendaModal,
    openMoradorModal,
    openUsuarioModal,
    openEntregaModal,
    setupMoradorAutocomplete,
    setupPorteiroAutocomplete,
    setupEntregaPorteiroAutocomplete,
    getSelectedIds,
    
    // Estado da aplicação
    app,
    
    // Utilitários
    isModularSystemActive: () => true,
    getVersion: () => window.APP_CONFIG?.version || '2.0.0',
    
    // Migração gradual
    migrateFunction: (legacyFn, modularFn) => {
        return function(...args) {
            try {
                return modularFn.apply(this, args);
            } catch (error) {
                console.warn('[CompatibilityBridge] Fallback to legacy function:', error);
                return legacyFn.apply(this, args);
            }
        };
    }
};

/**
 * Intercepta funções globais legadas e redireciona para o novo sistema
 */
function setupLegacyInterceptors() {
    // Intercepta abertura de modais
    const originalAbrirModalEncomenda = window.abrirModalCadastroEncomenda;
    if (originalAbrirModalEncomenda) {
        window.abrirModalCadastroEncomenda = function(packageId = null, packageData = null) {
            console.log('[CompatibilityBridge] Redirecting to modular modal system');
            return openEncomendaModal(packageId, packageData);
        };
    }
    
    const originalAbrirModalMorador = window.abrirModalCadastroMorador;
    if (originalAbrirModalMorador) {
        window.abrirModalCadastroMorador = function(moradorId = null) {
            console.log('[CompatibilityBridge] Redirecting to modular modal system');
            return openMoradorModal(moradorId);
        };
    }
    
    const originalAbrirModalUsuario = window.abrirModalCadastroUsuario;
    if (originalAbrirModalUsuario) {
        window.abrirModalCadastroUsuario = function(userId = null) {
            console.log('[CompatibilityBridge] Redirecting to modular modal system');
            return openUsuarioModal(userId);
        };
    }
    
    const originalAbrirModalEntrega = window.abrirModalEntregaEncomenda;
    if (originalAbrirModalEntrega) {
        window.abrirModalEntregaEncomenda = function(packageId, moradorNome) {
            console.log('[CompatibilityBridge] Redirecting to modular modal system');
            return openEntregaModal(packageId, moradorNome);
        };
    }
    
    // Intercepta setup de autocomplete
    const originalSetupMoradorAutocomplete = window.setupMoradorAutocomplete;
    if (originalSetupMoradorAutocomplete) {
        window.setupMoradorAutocomplete = function() {
            console.log('[CompatibilityBridge] Using modular autocomplete system');
            return setupMoradorAutocomplete();
        };
    }
    
    const originalSetupPorteiroAutocomplete = window.setupPorteiroAutocomplete;
    if (originalSetupPorteiroAutocomplete) {
        window.setupPorteiroAutocomplete = function() {
            console.log('[CompatibilityBridge] Using modular autocomplete system');
            return setupPorteiroAutocomplete();
        };
    }
    
    // Intercepta funções de navegação
    const originalMostrarEncomendas = window.mostrarEncomendas;
    if (originalMostrarEncomendas) {
        window.mostrarEncomendas = function() {
            console.log('[CompatibilityBridge] Redirecting to modular navigation');
            return app.navigateTo('encomendas');
        };
    }
    
    const originalMostrarMoradores = window.mostrarMoradores;
    if (originalMostrarMoradores) {
        window.mostrarMoradores = function() {
            console.log('[CompatibilityBridge] Redirecting to modular navigation');
            return app.navigateTo('moradores');
        };
    }
    
    const originalMostrarUsuarios = window.mostrarUsuarios;
    if (originalMostrarUsuarios) {
        window.mostrarUsuarios = function() {
            console.log('[CompatibilityBridge] Redirecting to modular navigation');
            return app.navigateTo('usuarios');
        };
    }
    
    const originalMostrarDashboard = window.mostrarDashboard;
    if (originalMostrarDashboard) {
        window.mostrarDashboard = function() {
            console.log('[CompatibilityBridge] Redirecting to modular navigation');
            return app.navigateTo('dashboard');
        };
    }
}

/**
 * Monitora estado do sistema legado
 */
function monitorLegacySystem() {
    // Verifica se o sistema legado está ativo
    const legacyActive = typeof window.buscarEExibirEncomendas === 'function';
    
    if (legacyActive) {
        console.log('[CompatibilityBridge] Legacy system detected, setting up interceptors');
        setupLegacyInterceptors();
    } else {
        console.log('[CompatibilityBridge] No legacy system detected, running pure modular mode');
    }
    
    // Expõe status
    window.ModularSystem.legacyDetected = legacyActive;
}

/**
 * Helpers para migração
 */
window.MigrationHelpers = {
    /**
     * Testa se uma função modular está funcionando
     */
    testModularFunction: async (functionName, ...args) => {
        try {
            const result = await window.ModularSystem[functionName](...args);
            console.log(`[MigrationHelpers] ✅ ${functionName} working correctly`);
            return { success: true, result };
        } catch (error) {
            console.error(`[MigrationHelpers] ❌ ${functionName} failed:`, error);
            return { success: false, error };
        }
    },
    
    /**
     * Compara performance entre sistemas
     */
    performanceTest: (legacyFn, modularFn, iterations = 10) => {
        const legacyTimes = [];
        const modularTimes = [];
        
        // Testa sistema legado
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            legacyFn();
            legacyTimes.push(performance.now() - start);
        }
        
        // Testa sistema modular
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            modularFn();
            modularTimes.push(performance.now() - start);
        }
        
        const legacyAvg = legacyTimes.reduce((a, b) => a + b) / iterations;
        const modularAvg = modularTimes.reduce((a, b) => a + b) / iterations;
        const improvement = ((legacyAvg - modularAvg) / legacyAvg * 100).toFixed(2);
        
        console.log(`[MigrationHelpers] Performance Comparison:
            Legacy Average: ${legacyAvg.toFixed(2)}ms
            Modular Average: ${modularAvg.toFixed(2)}ms
            Improvement: ${improvement}%`);
        
        return { legacyAvg, modularAvg, improvement };
    },
    
    /**
     * Valida se todos os módulos estão carregados
     */
    validateModules: () => {
        const requiredModules = [
            'auth', 'modals', 'search', 'charts', 'autocomplete'
        ];
        
        const status = {};
        requiredModules.forEach(module => {
            status[module] = window.ModularSystem[module] !== undefined;
        });
        
        const allLoaded = Object.values(status).every(loaded => loaded);
        
        console.log('[MigrationHelpers] Module Status:', status);
        console.log(`[MigrationHelpers] All modules loaded: ${allLoaded ? '✅' : '❌'}`);
        
        return { status, allLoaded };
    }
};

/**
 * Configuração de evento para quando sistema legado carregar
 */
document.addEventListener('DOMContentLoaded', () => {
    // Aguarda um pouco para o sistema legado inicializar
    setTimeout(() => {
        monitorLegacySystem();
    }, 500);
});

/**
 * Evento para quando o sistema modular está pronto
 */
document.addEventListener('modular-system-ready', () => {
    console.log('[CompatibilityBridge] Modular system is ready');
    
    // Valida módulos
    window.MigrationHelpers.validateModules();
    
    // Emite evento de compatibilidade pronta
    document.dispatchEvent(new CustomEvent('compatibility-bridge-ready', {
        detail: {
            version: window.APP_CONFIG?.version,
            legacyDetected: window.ModularSystem.legacyDetected,
            modulesLoaded: window.MigrationHelpers.validateModules().allLoaded
        }
    }));
});

console.log('[CompatibilityBridge] ✅ Compatibility bridge initialized');

export default window.ModularSystem;