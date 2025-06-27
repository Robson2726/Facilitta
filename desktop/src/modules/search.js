// --- src/modules/search.js ---
// Gerenciador de Busca Rápida

class SearchManager {
    constructor() {
        this.init();
    }

    init() {
        // Removido: configuração direta de event listeners
    }

    async realizarBuscaEncomendas(searchTerm) {
        console.log(`[Search] Realizando busca para: "${searchTerm}"`);
        
        try {
            // Remove popup anterior
            document.getElementById('popup-encomendas')?.remove();
            
            // Busca encomendas pendentes
            const encomendas = await window.electronAPI.getPendingPackages();
            
            if (!Array.isArray(encomendas)) {
                console.error('[Search] Resposta inválida da API getPendingPackages');
                return;
            }
            
            console.log(`[Search] Total de encomendas pendentes: ${encomendas.length}`);
            
            // Filtra encomendas pelo termo de busca (nome do morador)
            const encomendasFiltradas = encomendas.filter(encomenda => {
                const nomeMorador = (encomenda.morador_nome || '').toLowerCase();
                return nomeMorador.includes(searchTerm.toLowerCase());
            });
            
            console.log(`[Search] Encomendas filtradas: ${encomendasFiltradas.length}`);
            
            if (encomendasFiltradas.length > 0) {
                this.exibirPopupEncomendas(encomendasFiltradas);
            } else {
                this.exibirMensagemNenhumResultado(searchTerm);
            }
            
        } catch (error) {
            console.error('[Search] Erro ao buscar encomendas:', error);
            this.exibirErroPopup('Erro ao buscar encomendas: ' + error.message);
        }
    }
    
    exibirPopupEncomendas(encomendas) {
        console.log(`[Search] Exibindo popup com ${encomendas.length} encomendas`);
        
        // Remove popup anterior
        document.getElementById('popup-encomendas')?.remove();
        
        // Cria popup
        const popup = document.createElement('div');
        popup.id = 'popup-encomendas';
        popup.className = 'search-popup';
        
        // Header do popup
        const header = document.createElement('div');
        header.className = 'popup-header';
        header.innerHTML = `
            <h3>Encomendas Encontradas (${encomendas.length})</h3>
            <button class="popup-close" onclick="document.getElementById('popup-encomendas').remove()">×</button>
        `;
        popup.appendChild(header);
        
        // Lista de encomendas
        const lista = document.createElement('div');
        lista.className = 'popup-encomendas-lista';
        
        encomendas.forEach(encomenda => {
            const item = document.createElement('div');
            item.className = 'popup-encomenda-item';
            
            // Formatar data
            let dataFormatada = 'Data inválida';
            try {
                if (encomenda.data_recebimento) {
                    const data = new Date(encomenda.data_recebimento);
                    if (!isNaN(data.getTime())) {
                        dataFormatada = data.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                }
            } catch (e) {
                console.error('[Search] Erro ao formatar data:', e);
            }
            
            item.innerHTML = `
                <div class="encomenda-info">
                    <div class="encomenda-morador">${encomenda.morador_nome || 'N/A'}</div>
                    <div class="encomenda-detalhes">
                        <span class="data-recebimento">Recebida: ${dataFormatada}</span>
                        <span class="quantidade">Qtd: ${encomenda.quantidade || 1}</span>
                        <span class="porteiro">Por: ${encomenda.porteiro_nome || 'N/A'}</span>
                    </div>
                    ${encomenda.observacoes ? `<div class="encomenda-obs">${encomenda.observacoes}</div>`