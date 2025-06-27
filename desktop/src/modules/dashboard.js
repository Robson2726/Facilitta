// --- src/modules/dashboard.js ---
// Gerenciador de Dashboard e Gráficos

class DashboardManager {
    constructor() {
        this.chartInstances = {};
        this.init();
    }

    init() {
        console.log('[Dashboard] Inicializando gerenciador de dashboard');
    }

    async carregarDashboard(container) {
        console.log('[Dashboard] Carregando dashboard...');
        
        // Header do Dashboard
        const headerSection = document.createElement('div');
        headerSection.className = 'dashboard-header-section';
        headerSection.innerHTML = `
            <h1 class="dashboard-title">Visão Geral</h1>
            <p class="dashboard-subtitle">Visão geral do sistema de controle de encomendas</p>
        `;
        container.appendChild(headerSection);

        // Grid de cards
        const gridContainer = document.createElement('div');
        gridContainer.className = 'dashboard-grid';
        container.appendChild(gridContainer);

        // Cards iniciais (serão atualizados com dados reais)
        const cardsData = [
            { id: 'moradores', title: 'Total de', subtitle: 'Moradores', number: '0', icon: 'moradores.svg' },
            { id: 'pendentes', title: 'Encomendas', subtitle: 'Pendentes', number: '0', icon: 'encomendas.svg' },
            { id: 'antigas', title: 'Encomendas', subtitle: 'Antigas (7+ dias)', number: '0', icon: 'criticas.svg' },
            { id: 'criticas', title: 'Encomendas', subtitle: 'Críticas (15+ dias)', number: '0', icon: 'antigas.svg' }
        ];

        cardsData.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = `dashboard-card card-${card.id}`;
            cardElement.innerHTML = `
                <div class="card-content">
                    <div class="card-icon">
                        <img src="./assets/${card.icon}" alt="${card.title}">
                    </div>
                    <div class="card-number" id="card-${card.id}-number">${card.number}</div>
                    <div class="card-title">${card.title}</div>
                    <div class="card-subtitle">${card.subtitle}</div>
                </div>
            `;
            gridContainer.appendChild(cardElement);
        });

        // Seção de gráficos
        const chartsSection = document.createElement('div');
        chartsSection.className = 'dashboard-charts-section';
        chartsSection.innerHTML = `
            <div class="charts-grid">
                <div class="chart-container">
                    <h3 class="chart-title">Encomendas Recebidas (Últimos 15 dias)</h3>
                    <div class="chart-wrapper">
                        <canvas id="chartEncomendasPorDia"></canvas>
                    </div>
                </div>
                <div class="chart-container">
                    <h3 class="chart-title">Encomendas por Mês (Últimos 12 meses)</h3>
                    <div class="chart-wrapper">
                        <canvas id="chartEncomendasPorMes"></canvas>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(chartsSection);

        // Carregar dados
        await this.carregarDadosDashboard();
        await this.inicializarGraficos();
    }

    async carregarDadosDashboard() {
        console.log('[Dashboard] Carregando dados dos cards...');
        
        try {
            // Buscar dados dos moradores
            if (window.electronAPI?.getResidents) {
                const moradores = await window.electronAPI.getResidents();
                const totalMoradoresEl = document.getElementById('card-moradores-number');
                if (totalMoradoresEl) totalMoradoresEl.textContent = moradores?.length || '0';
            }

            // Buscar encomendas pendentes
            if (window.electronAPI?.getPendingPackages) {
                const encomendas = await window.electronAPI.getPendingPackages();
                const encomendasPendentesEl = document.getElementById('card-pendentes-number');
                if (encomendasPendentesEl) {
                    const total = encomendas.reduce((acc, enc) => {
                        return acc + (parseInt(enc.quantidade, 10) || 1);
                    }, 0);
                    encomendasPendentesEl.textContent = total || '0';
                }

                // Calcular encomendas antigas (7+ dias) e críticas (15+ dias)
                const agora = new Date();
                let antigas = 0;
                let criticas = 0;

                encomendas.forEach(enc => {
                    const dataRecebimento = new Date(enc.data_recebimento);
                    const diasDiferenca = Math.floor((agora - dataRecebimento) / (1000 * 60 * 60 * 24));
                    const quantidade = parseInt(enc.quantidade, 10) || 1;
                    
                    if (diasDiferenca >= 15) {
                        criticas += quantidade;
                    } else if (diasDiferenca >= 7) {
                        antigas += quantidade;
                    }
                });

                const encomendasAntigasEl = document.getElementById('card-antigas-number');
                const encomendasCriticasEl = document.getElementById('card-criticas-number');
                if (encomendasAntigasEl) encomendasAntigasEl.textContent = antigas;
                if (encomendasCriticasEl) encomendasCriticasEl.textContent = criticas;
            }
        } catch (error) {
            console.error('[Dashboard] Erro ao carregar dados:', error);
        }
    }

    async inicializarGraficos() {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não está carregado. Certifique-se de incluir Chart.js no seu index.html.');
            return;
        }

        // Busca dados raw do backend para aplicar a mesma lógica do card "encomendas pendentes"
        let rawData = null;
        if (window.electronAPI?.getDashboardChartRawData) {
            try {
                console.log('[Dashboard] Buscando dados raw dos gráficos...');
                rawData = await window.electronAPI.getDashboardChartRawData();
                console.log('[Dashboard] Dados raw recebidos:', rawData);
            } catch (err) {
                console.error('Erro ao buscar dados raw dos gráficos:', err);
            }
        } else {
            console.warn('[Dashboard] API getDashboardChartRawData não disponível');
        }

        // --- GRÁFICO DE ENCOMENDAS POR DIA (ÚLTIMOS 15 DIAS) ---
        const ctxDia = document.getElementById('chartEncomendasPorDia');
        if (ctxDia) {
            if (this.chartInstances.chartEncomendasPorDia) {
                this.chartInstances.chartEncomendasPorDia.destroy();
            }

            // Gera os últimos 15 dias (YYYY-MM-DD)
            const hoje = new Date();
            const dias = [];
            for (let i = 14; i >= 0; i--) {
                const d = new Date(hoje);
                d.setDate(hoje.getDate() - i);
                dias.push(d.toISOString().slice(0, 10));
            }
            
            // Labels para o gráfico
            const labels = dias.map(d => {
                const dt = new Date(d);
                return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            });
            
            // Inicializa contagem zerada
            const data = dias.map(() => 0);
            
            // Preenche com dados reais
            if (rawData && Array.isArray(rawData.encomendasPorDiaRaw)) {
                rawData.encomendasPorDiaRaw.forEach(e => {
                    // Agora conta todas as encomendas, independente do status
                    let dia = e.dia;
                    if (!(typeof dia === 'string' && dia.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/))) {
                        const d = new Date(e.data_recebimento);
                        dia = d.toISOString().slice(0, 10);
                    }
                    const idx = dias.indexOf(dia);
                    if (idx !== -1) {
                        data[idx] += (parseInt(e.quantidade, 10) || 1);
                    }
                });
            }

            this.chartInstances.chartEncomendasPorDia = new Chart(ctxDia, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Recebidas',
                        data,
                        borderColor: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { title: { display: true, text: 'Dia' } },
                        y: { title: { display: true, text: 'Encomendas' }, beginAtZero: true }
                    }
                }
            });
        }

        // --- GRÁFICO DE ENCOMENDAS POR MÊS (ÚLTIMOS 12 MESES) ---
        const ctxMes = document.getElementById('chartEncomendasPorMes');
        if (ctxMes) {
            if (this.chartInstances.chartEncomendasPorMes) {
                this.chartInstances.chartEncomendasPorMes.destroy();
            }

            // Gera os últimos 12 meses (YYYY-MM)
            const hoje = new Date();
            const meses = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(hoje);
                d.setMonth(hoje.getMonth() - i);
                const mes = d.toISOString().slice(0, 7); // YYYY-MM
                meses.push(mes);
            }
            
            // Labels para o gráfico
            const labels = meses.map(m => {
                const [ano, mes] = m.split('-');
                return `${mes}/${ano.slice(2)}`;
            });
            
            // Inicializa contagem zerada
            const data = meses.map(() => 0);
            
            // Preenche com dados reais
            if (rawData && Array.isArray(rawData.encomendasPorMesRaw)) {
                rawData.encomendasPorMesRaw.forEach(e => {
                    // Agora conta todas as encomendas, independente do status
                    let mes = e.mes;
                    if (!(typeof mes === 'string' && mes.match(/^[0-9]{4}-[0-9]{2}$/))) {
                        const d = new Date(e.data_recebimento);
                        mes = d.toISOString().slice(0, 7);
                    }
                    const idx = meses.indexOf(mes);
                    if (idx !== -1) {
                        data[idx] += (parseInt(e.quantidade, 10) || 1);
                    }
                });
            }

            this.chartInstances.chartEncomendasPorMes = new Chart(ctxMes, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Total por mês',
                        data,
                        backgroundColor: '#0288d1',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { title: { display: true, text: 'Mês' } },
                        y: { title: { display: true, text: 'Encomendas' }, beginAtZero: true }
                    }
                }
            });
        }
    }

    // Métodos auxiliares para gerar dados fictícios (se necessário)
    gerarUltimosDiasLabels(qtd) {
        const labels = [];
        const hoje = new Date();
        for (let i = qtd - 1; i >= 0; i--) {
            const d = new Date(hoje);
            d.setDate(hoje.getDate() - i);
            labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        }
        return labels;
    }

    gerarUltimosMesesLabels(qtd) {
        const labels = [];
        const hoje = new Date();
        for (let i = qtd - 1; i >= 0; i--) {
            const d = new Date(hoje);
            d.setMonth(hoje.getMonth() - i);
            labels.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        }
        return labels;
    }

    gerarDadosAleatorios(qtd, min, max) {
        return Array.from({ length: qtd }, () => Math.floor(Math.random() * (max - min + 1)) + min);
    }

    // Método para atualizar gráficos
    atualizarGraficos() {
        this.inicializarGraficos();
    }

    // Método para limpar gráficos
    limparGraficos() {
        Object.values(this.chartInstances).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.chartInstances = {};
    }
}

// Exportar para uso global
window.DashboardManager = DashboardManager; 