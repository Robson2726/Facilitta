// === CONFIGURAÇÃO DA APLICAÇÃO ===
// Arquivo externo para evitar violação de Content Security Policy

window.APP_CONFIG = {
    version: '2.0.0-production',
    moduleSystem: true,
    legacyMode: false,
    performance: {
        enableVirtualScroll: true,
        enableCache: true,
        enableDebounce: true,
        enableLazyLoading: true
    },
    debug: false
};

// Log de inicialização
console.log('🚀 Facilitt Desktop v2.0 - Sistema Modular Puro Ativado');
console.log('📦 Versão:', window.APP_CONFIG.version);
console.log('⚡ Modo Legado:', window.APP_CONFIG.legacyMode ? 'Ativado' : 'Desativado');
console.log('🛠️ Debug:', window.APP_CONFIG.debug ? 'Ativado' : 'Desativado');

// Sistema modular puro - sem compatibilidade legada
export default window.APP_CONFIG;