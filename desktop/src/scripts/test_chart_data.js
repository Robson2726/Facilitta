// Script para testar dados dos gráficos
const { Pool } = require('pg');

// Configuração do banco de dados (ajuste conforme necessário)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'controle_encomendas',
    password: 'sua_senha',
    port: 5432,
});

async function testarDadosGraficos() {
    console.log('🔍 TESTE DOS DADOS DOS GRÁFICOS');
    console.log('='.repeat(50));
    
    const client = await pool.connect();
    
    try {
        // 1. Verificar dados brutos das encomendas
        console.log('\n1. DADOS BRUTOS DAS ENCOMENDAS:');
        const dadosBrutos = await client.query(`
            SELECT 
                id, 
                morador_id, 
                quantidade, 
                data_recebimento,
                status
            FROM encomendas 
            ORDER BY data_recebimento DESC 
            LIMIT 10
        `);
        
        console.table(dadosBrutos.rows);
        
        // 2. Testar consulta atual dos gráficos (por dia)
        console.log('\n2. CONSULTA ATUAL DOS GRÁFICOS (ÚLTIMOS 15 DIAS):');
        const consultaAtual = await client.query(`
            SELECT 
                DATE(data_recebimento) as dia,
                SUM(CAST(quantidade AS integer)) as total
            FROM encomendas 
            WHERE data_recebimento >= CURRENT_DATE - INTERVAL '15 days'
            GROUP BY DATE(data_recebimento)
            ORDER BY dia DESC
        `);
        
        console.table(consultaAtual.rows);
        
        // 3. Comparar com lógica dos cards (JavaScript)
        console.log('\n3. DADOS COMO OS CARDS PROCESSAM:');
        const todasEncomendas = await client.query(`
            SELECT quantidade, status, data_recebimento
            FROM encomendas 
            WHERE status = 'Recebida na portaria'
        `);
        
        const totalCards = todasEncomendas.rows.reduce((acc, enc) => {
            return acc + (parseInt(enc.quantidade, 10) || 1);
        }, 0);
        
        console.log('Total pelo método dos cards:', totalCards);
        console.log('Encomendas pendentes:', todasEncomendas.rows.length);
        
        // 4. Verificar se há diferença entre SUM SQL e reduce JavaScript
        console.log('\n4. COMPARAÇÃO DE MÉTODOS:');
        const somaSql = await client.query(`
            SELECT SUM(CAST(quantidade AS integer)) as total_sql
            FROM encomendas 
            WHERE status = 'Recebida na portaria'
        `);
        
        console.log('Total pelo SUM SQL:', somaSql.rows[0]?.total_sql);
        console.log('Total pelo reduce JS:', totalCards);
        console.log('Diferença:', (somaSql.rows[0]?.total_sql || 0) - totalCards);
        
        // 5. Teste específico para gráficos por dia
        console.log('\n5. TESTE GRÁFICO POR DIA (USANDO LÓGICA DOS CARDS):');
        const encomendasPorDia = await client.query(`
            SELECT 
                DATE(data_recebimento) as dia,
                quantidade,
                status
            FROM encomendas 
            WHERE data_recebimento >= CURRENT_DATE - INTERVAL '15 days'
            ORDER BY data_recebimento DESC
        `);
        
        // Aplicar lógica dos cards (só pendentes)
        const dadosPorDiaCards = {};
        encomendasPorDia.rows.forEach(row => {
            if (row.status === 'Recebida na portaria') {
                const dia = row.dia;
                if (!dadosPorDiaCards[dia]) dadosPorDiaCards[dia] = 0;
                dadosPorDiaCards[dia] += parseInt(row.quantidade, 10) || 1;
            }
        });
        
        console.log('Dados por dia (lógica dos cards):');
        console.table(dadosPorDiaCards);
        
    } catch (error) {
        console.error('Erro no teste:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Executar o teste
testarDadosGraficos().catch(console.error);
