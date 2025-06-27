import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Morador {
  id: string;
  nome: string;
  apartamento: string;
  bloco: string;
}

interface EncomendaLote {
  morador: Morador;
  quantidade: number;
}

interface DadosComuns {
  porteiro: string;
  data: string;
  hora: string;
}

interface Usuario {
  id: string;
  nome_completo: string;
}

export default function ModoLoteScreen() {
  const router = useRouter();
  const [passo, setPasso] = useState(1); // 1: Dados Comuns, 2: Seleção Moradores, 3: Resumo
  const [loading, setLoading] = useState(false);
  
  // Dados comuns
  const [dadosComuns, setDadosComuns] = useState<DadosComuns>({
    porteiro: '',
    data: '',
    hora: '',
  });

  // Moradores
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [moradoresFiltrados, setMoradoresFiltrados] = useState<Morador[]>([]);
  const [searchText, setSearchText] = useState('');
  const [encomendasLote, setEncomendasLote] = useState<EncomendaLote[]>([]);

  // Modal quantidade
  const [showQuantidadeModal, setShowQuantidadeModal] = useState(false);
  const [moradorSelecionado, setMoradorSelecionado] = useState<Morador | null>(null);
  const [quantidadeTemp, setQuantidadeTemp] = useState('1');

  // Novos estados para busca de porteiro
  const [buscaPorteiro, setBuscaPorteiro] = useState('');
  const [porteiroSelecionado, setPorteiroSelecionado] = useState<Usuario | null>(null);
  const [porteirosEncontrados, setPorteirosEncontrados] = useState<Usuario[]>([]);
  const [buscandoPorteiros, setBuscandoPorteiros] = useState(false);

  // Estados adicionais para auto sugestão
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [sugestoesMoradores, setSugestoesMoradores] = useState<Morador[]>([]);

  useEffect(() => {
    preencherDataHoraAtual();
    carregarMoradores();
  }, []);

  useEffect(() => {
    filtrarMoradores();
  }, [searchText, moradores]);

  const preencherDataHoraAtual = () => {
    const now = new Date();
    // CORREÇÃO: Usar formatação consistente
    const dataFormatada = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const horaFormatada = now.toTimeString().split(' ')[0].substring(0, 5);
    
    setDadosComuns(prev => ({
      ...prev,
      data: dataFormatada,
      hora: horaFormatada,
    }));
  };

  const carregarMoradores = async () => {
    try {
      // Buscar configuração da API
      const apiConfig = await AsyncStorage.getItem('apiConfig');
      if (!apiConfig) {
        // Tentar configuração legacy
        const apiUrl = await AsyncStorage.getItem('apiUrl');
        const apiPorta = await AsyncStorage.getItem('apiPorta');
        
        if (!apiUrl || !apiPorta) {
          Alert.alert('Erro', 'Configure a API na aba Ajustes primeiro.');
          return;
        }
        
        const config = { ip: apiUrl, port: apiPorta };
        await AsyncStorage.setItem('apiConfig', JSON.stringify(config));
      }

      const config = JSON.parse(await AsyncStorage.getItem('apiConfig') || '{}');
      
      if (!config.ip || !config.port) {
        Alert.alert('Erro', 'Configuração da API incompleta. Configure na aba Ajustes.');
        return;
      }

      const apiUrl = `http://${config.ip}:${config.port}/api/moradores`;

      console.log('[Modo Lote] Buscando moradores em:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      console.log('[Modo Lote] Resposta da API:', result);

      if (result.success && Array.isArray(result.data)) {
        // CORREÇÃO: Garantir que todos os moradores tenham os campos necessários
        const moradoresValidados = result.data.map((morador: any) => ({
          id: morador.id?.toString() || '',
          nome: morador.nome || '',
          apartamento: morador.apartamento || 'N/A',
          bloco: morador.bloco || 'A'
        }));
        
        setMoradores(moradoresValidados);
        // CORREÇÃO: Inicializar a lista filtrada com todos os moradores
        setMoradoresFiltrados(moradoresValidados);
        console.log(`[Modo Lote] ${moradoresValidados.length} moradores carregados`);
      } else {
        console.warn('Erro na resposta da API:', result.message);
        // Fallback para moradores simulados se a API falhar
        const moradoresSimulados: Morador[] = [
          { id: '1', nome: 'Ana Silva', apartamento: '101', bloco: 'A' },
          { id: '2', nome: 'João Santos', apartamento: '102', bloco: 'A' },
          { id: '3', nome: 'Maria Oliveira', apartamento: '103', bloco: 'A' },
          { id: '4', nome: 'Pedro Lima', apartamento: '201', bloco: 'B' },
          { id: '5', nome: 'Carlos Souza', apartamento: '202', bloco: 'B' },
          { id: '6', nome: 'Lucia Costa', apartamento: '301', bloco: 'C' },
        ];
        setMoradores(moradoresSimulados);
        setMoradoresFiltrados(moradoresSimulados);
        console.log('[Modo Lote] Usando moradores simulados');
      }
    } catch (error) {
      console.error('Erro ao carregar moradores:', error);
  
      
      // Fallback para moradores simulados em caso de erro
      const moradoresSimulados: Morador[] = [
        { id: '1', nome: 'Ana Silva', apartamento: '101', bloco: 'A' },
        { id: '2', nome: 'João Santos', apartamento: '102', bloco: 'A' },
        { id: '3', nome: 'Maria Oliveira', apartamento: '103', bloco: 'A' },
        { id: '4', nome: 'Pedro Lima', apartamento: '201', bloco: 'B' },
        { id: '5', nome: 'Carlos Souza', apartamento: '202', bloco: 'B' },
        { id: '6', nome: 'Lucia Costa', apartamento: '301', bloco: 'C' },
      ];
      setMoradores(moradoresSimulados);
      setMoradoresFiltrados(moradoresSimulados);
    }
  };

  const filtrarMoradores = () => {
    if (!searchText.trim()) {
      setMoradoresFiltrados(moradores);
      return;
    }

    const filtrados = moradores.filter(morador => {
      // CORREÇÃO: Verificar se os campos existem antes de usar includes
      const nome = morador.nome || '';
      const apartamento = morador.apartamento || '';
      const bloco = morador.bloco || '';
      
      const searchLower = searchText.toLowerCase();
      
      return nome.toLowerCase().includes(searchLower) ||
             apartamento.includes(searchLower) ||
             bloco.toLowerCase().includes(searchLower);
    });
    
    setMoradoresFiltrados(filtrados);
  };

  const buscarPorteiros = async (termo: string) => {
    if (!termo.trim()) {
      setPorteirosEncontrados([]);
      return;
    }
    
    setBuscandoPorteiros(true);
    
    try {
      const apiConfig = await AsyncStorage.getItem('apiConfig');
      if (!apiConfig) {
        Alert.alert('Erro', 'Configure a API na aba Ajustes.');
        return;
      }
      
      const config = JSON.parse(apiConfig);
      const apiUrl = `http://${config.ip}:${config.port}/api/usuarios?nivel=porteiro&status=Ativo`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Filtra localmente os porteiros que contêm o termo de busca
        const filtrados = (result.data || []).filter((porteiro: Usuario) =>
          porteiro.nome_completo.toLowerCase().includes(termo.toLowerCase())
        );
        setPorteirosEncontrados(filtrados);
      } else {
        setPorteirosEncontrados([]);
      }
    } catch (error) {
      console.error('Erro ao buscar porteiros:', error);
      setPorteirosEncontrados([]);
    } finally {
      setBuscandoPorteiros(false);
    }
  };

  const selecionarPorteiro = (porteiro: Usuario) => {
    setPorteiroSelecionado(porteiro);
    setBuscaPorteiro(porteiro.nome_completo);
    setPorteirosEncontrados([]);
    // Atualiza também o campo dadosComuns.porteiro
    setDadosComuns(prev => ({ ...prev, porteiro: porteiro.nome_completo }));
  };

  const proximoPasso = () => {
    if (passo === 1) {
      if (!porteiroSelecionado) {
        Alert.alert('Erro', 'Selecione um porteiro!');
        return;
      }
      setPasso(2);
    } else if (passo === 2) {
      if (encomendasLote.length === 0) {
        Alert.alert('Erro', 'Selecione pelo menos um morador!');
        return;
      }
      setPasso(3);
    }
  };

  const voltarPasso = () => {
    if (passo > 1) {
      setPasso(passo - 1);
    } else {
      router.back();
    }
  };

  const selecionarMorador = (morador: Morador) => {
    // Verifica se já foi selecionado
    const jaExiste = encomendasLote.find(e => e.morador.id === morador.id);
    if (jaExiste) {
      Alert.alert('Aviso', 'Este morador já foi selecionado!');
      return;
    }

    setMoradorSelecionado(morador);
    setQuantidadeTemp('1');
    setShowQuantidadeModal(true);
  };

  const confirmarQuantidade = () => {
    if (!moradorSelecionado) return;

    const quantidade = parseInt(quantidadeTemp) || 1;
    const novaEncomenda: EncomendaLote = {
      morador: moradorSelecionado,
      quantidade,
    };

    setEncomendasLote(prev => [...prev, novaEncomenda]);
    setShowQuantidadeModal(false);
    setMoradorSelecionado(null);
    setQuantidadeTemp('1');
  };

  const removerEncomenda = (moradorId: string) => {
    setEncomendasLote(prev => prev.filter(e => e.morador.id !== moradorId));
  };

  const finalizarLote = async () => {
    setLoading(true);
    
    try {
      // Buscar configuração da API
      const apiConfig = await AsyncStorage.getItem('apiConfig');
      if (!apiConfig) {
        Alert.alert('Erro', 'Configure a API na aba Ajustes primeiro.');
        return;
      }

      const config = JSON.parse(apiConfig);
      const apiUrl = `http://${config.ip}:${config.port}/api/encomendas`;

      let totalEncomendas = 0;
      let sucessos = 0;
      let erros = 0;

      // Processar cada morador individualmente com a quantidade total
      for (const item of encomendasLote) {
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              morador_nome: item.morador.nome,
              apartamento: item.morador.apartamento || 'S/N',
              bloco: item.morador.bloco || 'A',
              porteiro_nome: porteiroSelecionado?.nome_completo || dadosComuns.porteiro,
              quantidade: item.quantidade, // Envia a quantidade total para o morador
              data_recebimento: dadosComuns.data,
              hora_recebimento: dadosComuns.hora,
              observacoes: `Lote: ${new Date().toLocaleString()} - ${item.quantidade} encomenda${item.quantidade > 1 ? 's' : ''} para ${item.morador.nome}`,
            }),
          });

          const result = await response.json();
          
          if (result.success) {
            sucessos++;
          } else {
            erros++;
            console.error(`Erro ao cadastrar encomendas para ${item.morador.nome}:`, result.message);
          }
          
          totalEncomendas++;
        } catch (error) {
          erros++;
          totalEncomendas++;
          console.error(`Erro de conexão para ${item.morador.nome}:`, error);
        }
      }

      // Calcular total de encomendas enviadas
      const totalEncomendaEnviadas = encomendasLote.reduce((total, item) => total + item.quantidade, 0);

      // Resultado final
      if (erros === 0) {
        Alert.alert('Sucesso', `${sucessos} moradores processados com ${totalEncomendaEnviadas} encomendas cadastradas!`, [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else if (sucessos > 0) {
        Alert.alert('Parcial', `${sucessos} moradores processados com sucesso, ${erros} falharam.`, [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Erro', 'Nenhuma encomenda foi cadastrada. Verifique a conexão.');
      }
      
    } catch (error) {
      console.error('Erro geral:', error);
      Alert.alert('Erro', 'Não foi possível conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const formatarDataEnquantoDigita = (text: string) => {
    // Remove tudo que não é número
    const apenasNumeros = text.replace(/\D/g, '');
    
    // Aplica formatação DD/MM/AAAA
    let dataFormatada = apenasNumeros;
    
    if (apenasNumeros.length >= 3) {
      dataFormatada = apenasNumeros.slice(0, 2) + '/' + apenasNumeros.slice(2);
    }
    
    if (apenasNumeros.length >= 5) {
      dataFormatada = apenasNumeros.slice(0, 2) + '/' + apenasNumeros.slice(2, 4) + '/' + apenasNumeros.slice(4, 8);
    }
    
    return dataFormatada;
  };

  const formatarHoraEnquantoDigita = (text: string) => {
    // Remove tudo que não é número
    const apenasNumeros = text.replace(/\D/g, '');
    
    // Aplica formatação HH:MM
    let horaFormatada = apenasNumeros;
    
    if (apenasNumeros.length >= 3) {
      horaFormatada = apenasNumeros.slice(0, 2) + ':' + apenasNumeros.slice(2, 4);
    }
    
    return horaFormatada;
  };

  const renderPasso1 = () => (
    <View style={styles.passoContainer}>
      {/* Indicadores de progresso com checkmarks */}
      <View style={styles.progressIndicators}>
        <View style={styles.progressStep}>
          <View style={[styles.checkmarkContainer, passo >= 1 && styles.checkmarkActive]}>
            <Ionicons 
              name={passo >= 1 ? "checkmark" : "ellipse-outline"} 
              size={12} 
              color={passo >= 1 ? "white" : "#94A3B8"} 
            />
          </View>
          <Text style={[styles.stepLabel, passo >= 1 && styles.stepLabelActive]}>Dados</Text>
        </View>
        
        <View style={styles.progressConnector} />
        
        <View style={styles.progressStep}>
          <View style={[styles.checkmarkContainer, passo >= 2 && styles.checkmarkActive]}>
            <Ionicons 
              name={passo >= 2 ? "checkmark" : "ellipse-outline"} 
              size={12} 
              color={passo >= 2 ? "white" : "#94A3B8"} 
            />
          </View>
          <Text style={[styles.stepLabel, passo >= 2 && styles.stepLabelActive]}>Moradores</Text>
        </View>
        
        <View style={styles.progressConnector} />
        
        <View style={styles.progressStep}>
          <View style={[styles.checkmarkContainer, passo >= 3 && styles.checkmarkActive]}>
            <Ionicons 
              name={passo >= 3 ? "checkmark" : "ellipse-outline"} 
              size={12} 
              color={passo >= 3 ? "white" : "#94A3B8"} 
            />
          </View>
          <Text style={[styles.stepLabel, passo >= 3 && styles.stepLabelActive]}>Resumo</Text>
        </View>
      </View>

      <Text style={styles.passoTitulo}>Dados em comum</Text>
      
      {/* Busca de Porteiro */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Porteiro <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.searchInputModal}>
          <Ionicons name="search" size={16} color="#666" />
          <TextInput
            style={styles.searchInputModalText}
            placeholder="Digite o nome do porteiro..."
            value={buscaPorteiro}
            onChangeText={(text) => {
              setBuscaPorteiro(text);
              buscarPorteiros(text);
              if (!text) {
                setPorteiroSelecionado(null);
                setDadosComuns(prev => ({ ...prev, porteiro: '' }));
              }
            }}
          />
          {buscandoPorteiros && (
            <ActivityIndicator size="small" color="#4070f4" />
          )}
        </View>
        
        {/* Lista de porteiros encontrados */}
        {porteirosEncontrados.length > 0 && (
          <View style={styles.suggestionsList}>
            {porteirosEncontrados.slice(0, 5).map((porteiro) => (
              <TouchableOpacity
                key={porteiro.id}
                style={styles.suggestionItem}
                onPress={() => selecionarPorteiro(porteiro)}
              >
                <Ionicons name="person" size={16} color="#666" />
                <Text style={styles.suggestionText}>{porteiro.nome_completo}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Porteiro selecionado */}
        {porteiroSelecionado && (
          <View style={styles.selectedPorteiroContainer}>
            <Ionicons name="checkmark-circle" size={16} color="#28a745" />
            <Text style={styles.selectedPorteiroText}>
              Selecionado: {porteiroSelecionado.nome_completo}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.inputLabel}>Data</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <TextInput
              style={styles.inputText}
              placeholder="DD/MM/AAAA"
              value={dadosComuns.data}
              onChangeText={(text) => {
                const dataFormatada = formatarDataEnquantoDigita(text);
                setDadosComuns(prev => ({ ...prev, data: dataFormatada }));
              }}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
          <Text style={styles.helperText}>Ex: 25/12/2024</Text>
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Hora</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <TextInput
              style={styles.inputText}
              placeholder="HH:MM"
              value={dadosComuns.hora}
              onChangeText={(text) => {
                const horaFormatada = formatarHoraEnquantoDigita(text);
                setDadosComuns(prev => ({ ...prev, hora: horaFormatada }));
              }}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>
          <Text style={styles.helperText}>Ex: 14:30</Text>
        </View>
      </View>
    </View>
  );

  const buscarSugestoesMoradores = (texto: string) => {
    if (!texto.trim() || texto.length < 2) {
      setSugestoesMoradores([]);
      setShowSugestoes(false);
      return;
    }

    const filtrados = moradores.filter(morador => {
      const nome = (morador.nome || '').toLowerCase();
      const apartamento = (morador.apartamento || '').toLowerCase();
      const bloco = (morador.bloco || '').toLowerCase();
      
      const searchLower = texto.toLowerCase();
      
      return nome.includes(searchLower) ||
             apartamento.includes(searchLower) ||
             bloco.includes(searchLower);
    });
    
    setSugestoesMoradores(filtrados.slice(0, 5)); // Máximo 5 sugestões
    setShowSugestoes(filtrados.length > 0);
  };

  const selecionarSugestao = (morador: Morador) => {
    selecionarMorador(morador);
    setSearchText('');
    setShowSugestoes(false);
    setSugestoesMoradores([]);
  };

  const renderPasso2 = () => (
    <View style={styles.passoContainer}>
      {/* Indicadores de progresso com checkmarks */}
      <View style={styles.progressIndicators}>
        <View style={styles.progressStep}>
          <View style={[styles.checkmarkContainer, passo >= 1 && styles.checkmarkActive]}>
            <Ionicons 
              name={passo >= 1 ? "checkmark" : "ellipse-outline"} 
              size={16} 
              color={passo >= 1 ? "white" : "#94A3B8"} 
            />
          </View>
          <Text style={[styles.stepLabel, passo >= 1 && styles.stepLabelActive]}>Dados</Text>
        </View>
        
        <View style={styles.progressConnector} />
        
        <View style={styles.progressStep}>
          <View style={[styles.checkmarkContainer, passo >= 2 && styles.checkmarkActive]}>
            <Ionicons 
              name={passo >= 2 ? "checkmark" : "ellipse-outline"} 
              size={16} 
              color={passo >= 2 ? "white" : "#94A3B8"} 
            />
          </View>
          <Text style={[styles.stepLabel, passo >= 2 && styles.stepLabelActive]}>Moradores</Text>
        </View>
        
        <View style={styles.progressConnector} />
        
        <View style={styles.progressStep}>
          <View style={[styles.checkmarkContainer, passo >= 3 && styles.checkmarkActive]}>
            <Ionicons 
              name={passo >= 3 ? "checkmark" : "ellipse-outline"} 
              size={16} 
              color={passo >= 3 ? "white" : "#94A3B8"} 
            />
          </View>
          <Text style={[styles.stepLabel, passo >= 3 && styles.stepLabelActive]}>Resumo</Text>
        </View>
      </View>

      <Text style={styles.passoTitulo}>
        Selecionar moradores ({encomendasLote.length} selecionados)
      </Text>
      
      {/* Campo de busca com auto sugestão */}
      <View style={[styles.autocompleteContainer, { zIndex: 1000 }]}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Digite o nome do morador..."
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              buscarSugestoesMoradores(text);
            }}
            onFocus={() => {
              if (searchText.length >= 2) {
                buscarSugestoesMoradores(searchText);
              }
            }}
            onBlur={() => {
              // Delay para permitir clique na sugestão
              setTimeout(() => setShowSugestoes(false), 200);
            }}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchText('');
              setShowSugestoes(false);
              setSugestoesMoradores([]);
            }}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Lista de sugestões */}
        {showSugestoes && sugestoesMoradores.length > 0 && (
          <View style={styles.sugestoesContainer}>
            {sugestoesMoradores.map((morador) => (
              <TouchableOpacity
                key={morador.id}
                style={styles.sugestaoItem}
                onPress={() => selecionarSugestao(morador)}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={16} color="#666" />
                <View style={styles.sugestaoInfo}>
                  <Text style={styles.sugestaoNome}>{morador.nome}</Text>
                  <Text style={styles.sugestaoApt}>{morador.bloco}{morador.apartamento}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={20} color="#4070f4" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Lista de selecionados */}
      {encomendasLote.length > 0 && (
        <View style={styles.selecionadosContainer}>
          <Text style={styles.selecionadosTitle}>Selecionados:</Text>
          {encomendasLote.map((item) => (
            <View key={item.morador.id} style={styles.selecionadoItem}>
              <Text style={styles.selecionadoNome}>
                {item.morador.nome} - {item.morador.bloco}{item.morador.apartamento}
              </Text>
              <View style={styles.selecionadoActions}>
                <Text style={styles.quantidade}>{item.quantidade}x</Text>
                <TouchableOpacity onPress={() => removerEncomenda(item.morador.id)}>
                  <Ionicons name="close-circle" size={20} color="#4070f4" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Lista completa scrollável */}
      <ScrollView style={styles.moradoresList} showsVerticalScrollIndicator={false}>
        <Text style={styles.listTitle}>Todos os moradores:</Text>
        {moradores.map((item) => {
          const jaAdicionado = encomendasLote.find(e => e.morador.id === item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.moradorItem, jaAdicionado && styles.moradorItemDisabled]}
              onPress={() => jaAdicionado ? null : selecionarMorador(item)}
              disabled={!!jaAdicionado}
            >
              <View style={styles.moradorInfo}>
                <Text style={[styles.moradorNome, jaAdicionado && styles.moradorNomeDisabled]}>
                  {item.nome}
                </Text>
                <Text style={styles.moradorApt}>{item.bloco}{item.apartamento}</Text>
              </View>
              <Ionicons 
                name={jaAdicionado ? "checkmark-circle" : "add-circle-outline"} 
                size={24} 
                color={jaAdicionado ? "#28a745" : "#4070f4"} 
              />
            </TouchableOpacity>
          );
        })}
        
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );

  const renderPasso3 = () => {
    const totalEncomendas = encomendasLote.reduce((total, item) => total + item.quantidade, 0);
    
    return (
      <View style={styles.passoContainer}>
        {/* Indicadores de progresso com checkmarks */}
        <View style={styles.progressIndicators}>
          <View style={styles.progressStep}>
            <View style={[styles.checkmarkContainer, passo >= 1 && styles.checkmarkActive]}>
              <Ionicons 
                name={passo >= 1 ? "checkmark" : "ellipse-outline"} 
                size={16} 
                color={passo >= 1 ? "white" : "#94A3B8"} 
              />
            </View>
            <Text style={[styles.stepLabel, passo >= 1 && styles.stepLabelActive]}>Dados</Text>
          </View>
          
          <View style={styles.progressConnector} />
          
          <View style={styles.progressStep}>
            <View style={[styles.checkmarkContainer, passo >= 2 && styles.checkmarkActive]}>
              <Ionicons 
                name={passo >= 2 ? "checkmark" : "ellipse-outline"} 
                size={16} 
                color={passo >= 2 ? "white" : "#94A3B8"} 
              />
            </View>
            <Text style={[styles.stepLabel, passo >= 2 && styles.stepLabelActive]}>Moradores</Text>
          </View>
          
          <View style={styles.progressConnector} />
          
          <View style={styles.progressStep}>
            <View style={[styles.checkmarkContainer, passo >= 3 && styles.checkmarkActive]}>
              <Ionicons 
                name={passo >= 3 ? "checkmark" : "ellipse-outline"} 
                size={16} 
                color={passo >= 3 ? "white" : "#94A3B8"} 
              />
            </View>
            <Text style={[styles.stepLabel, passo >= 3 && styles.stepLabelActive]}>Resumo</Text>
          </View>
        </View>

        <Text style={styles.passoTitulo}>Resumo do Lote</Text>
        
        <View style={styles.resumoHeader}>
          <Text style={styles.resumoInfo}>Porteiro: {dadosComuns.porteiro}</Text>
          <Text style={styles.resumoInfo}>Data: {dadosComuns.data} - {dadosComuns.hora}</Text>
          <Text style={styles.resumoInfo}>Total: {totalEncomendas} encomendas</Text>
        </View>

        <Text style={styles.resumoSubtitle}>Encomendas por Morador:</Text>
        
        <FlatList
          data={encomendasLote}
          keyExtractor={(item) => item.morador.id}
          renderItem={({ item }) => (
            <View style={styles.resumoItem}>
              <Text style={styles.resumoMorador}>
                {item.morador.nome}
              </Text>
              <Text style={styles.resumoDetalhes}>
                {item.morador.bloco}{item.morador.apartamento} • {item.quantidade}x encomenda{item.quantidade > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          style={styles.resumoList}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#f8f9fa" translucent={false} />
      
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor="#4070f4" />

        {/* Header azul que se estende até o topo */}
        <SafeAreaView style={styles.topBackground}>
          <View style={styles.headerCard}>
            <View style={styles.headerCardContent}>
              <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.backButton} onPress={voltarPasso}>
                  <Ionicons name="arrow-back" size={20} color="#4070f4" />
                </TouchableOpacity>
                
                <View style={styles.headerInfo}>
                  <Text style={styles.headerTitle}>Modo Lote</Text>
                  <Text style={styles.headerSubtitle}>Passo {passo} de 3</Text>
                  {/* Removido progressDots daqui */}
                </View>
              </View>
              
              <View style={styles.headerRight}>
                <Ionicons name="flash" size={48} color="rgba(255, 255, 255, 0.3)" />
              </View>
            </View>
          </View>
        </SafeAreaView>

        {/* Conteúdo com fundo branco arredondado */}
        {passo === 2 ? (
          <View style={styles.contentContainer}>
            {renderPasso2()}
          </View>
        ) : passo === 3 ? (
          <View style={styles.contentContainer}>
            {renderPasso3()}
          </View>
        ) : (
          <ScrollView style={styles.contentContainer}>
            {renderPasso1()}
          </ScrollView>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {passo < 3 ? (
            <TouchableOpacity style={styles.proximoButton} onPress={proximoPasso}>
              <Text style={styles.proximoButtonText}>
                {passo === 1 ? 'Selecionar Moradores' : 'Ver Resumo'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.confirmarButton}
              onPress={finalizarLote}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.confirmarButtonText}>Confirmar Lote</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Modal Quantidade */}
        <Modal visible={showQuantidadeModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Quantidade de Encomendas</Text>
              <Text style={styles.modalSubtitle}>
                {moradorSelecionado?.nome} - {moradorSelecionado?.bloco}{moradorSelecionado?.apartamento}
              </Text>
              
              <View style={styles.quantidadeContainer}>
                <TouchableOpacity
                  style={styles.quantidadeButton}
                  onPress={() => setQuantidadeTemp(Math.max(1, parseInt(quantidadeTemp) - 1).toString())}
                >
                  <Ionicons name="remove" size={24} color="#007AFF" />
                </TouchableOpacity>
                
                <TextInput
                  style={styles.quantidadeInput}
                  value={quantidadeTemp}
                  onChangeText={setQuantidadeTemp}
                  keyboardType="numeric"
                  textAlign="center"
                />
                
                <TouchableOpacity
                  style={styles.quantidadeButton}
                  onPress={() => setQuantidadeTemp((parseInt(quantidadeTemp) + 1).toString())}
                >
                  <Ionicons name="add" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowQuantidadeModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={confirmarQuantidade}
                >
                  <Text style={styles.modalConfirmText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBackground: {
    backgroundColor: '#4070f4',
    paddingBottom: 150, // Aumentado de 20 para 150 (+650%)
  },
  headerCard: {
    marginHorizontal: 20,
    marginTop: 50,
    marginBottom: 60, // Adicionado para mais espaçamento
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 12,
  },
  headerRight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  progressIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  checkmarkContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  checkmarkActive: {
    backgroundColor: '#22C55E',
    borderColor: '#16A34A',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#22C55E',
  },
  progressConnector: {
    height: 2,
    backgroundColor: '#E2E8F0',
    flex: 0.3,
    marginTop: -24,
    marginHorizontal: 8,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: -15, // Ajustado de -20 para -15 para menos sobreposição
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 32, // Aumentado de 24 para 32
  },
  passoContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  passoTitulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    letterSpacing: -0.8,
  },
  passoSubtitulo: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: '#1F2937',
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  selecionadosContainer: {
    backgroundColor: '#E1EFFE', // Mudado de '#EEF2FF' para azul padrão mais claro
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#B3D4FF', // Mudado de '#C7D2FE' para combinar com o azul padrão
  },
  selecionadosTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4070f4', // Mudado de '#4338CA' para o azul padrão
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  selecionadoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  selecionadoNome: {
    fontSize: 15,
    color: '#1F2937',
    flex: 1,
    fontWeight: '500',
  },
  selecionadoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantidade: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 32,
    textAlign: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  moradoresList: {
    flex: 1,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
    marginTop: 8,
    letterSpacing: -0.4,
  },
  moradorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  moradorItemDisabled: {
    opacity: 0.6,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  moradorInfo: {
    flex: 1,
  },
  moradorNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  moradorNomeDisabled: {
    color: '#94A3B8',
  },
  moradorApt: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  resumoHeader: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  resumoInfo: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  resumoSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  resumoList: {
    maxHeight: 320,
  },
  resumoItem: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  resumoMorador: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  resumoDetalhes: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  proximoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4070f4',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#4070f4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  proximoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
    letterSpacing: -0.3,
  },
  confirmarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmarButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(4px)',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 28,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 28,
    textAlign: 'center',
    fontWeight: '500',
  },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 8,
  },
  quantidadeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  quantidadeInput: {
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginHorizontal: 16,
    fontSize: 20,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'center',
    backgroundColor: 'transparent',
    color: '#1E293B',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#4070f4',
    alignItems: 'center',
    shadowColor: '#4070f4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  required: {
    color: '#EF4444',
    fontWeight: '600',
  },
  searchInputModal: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInputModalText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#1F2937',
  },
  suggestionsList: {
    position: 'absolute',
    bottom: '100%', // Mudado de 'top: 100%' para 'bottom: 100%'
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderBottomWidth: 0, // Mudado de borderTopWidth para borderBottomWidth
    borderBottomLeftRadius: 0, // Mudado de borderTopLeftRadius
    borderBottomRightRadius: 0, // Mudado de borderTopRightRadius
    marginBottom: 8, // Mudado de marginTop para marginBottom
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 }, // Sombra invertida para cima
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 1001,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
    fontWeight: '500',
  },
  selectedPorteiroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  selectedPorteiroText: {
    fontSize: 14,
    color: '#047857',
    fontWeight: '600',
    marginLeft: 8,
  },
  autocompleteContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  sugestoesContainer: {
    position: 'absolute',
    bottom: '100%', // Mudado de 'top: 100%' para 'bottom: 100%'
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomWidth: 0, // Mudado de borderTopWidth para borderBottomWidth
    borderBottomLeftRadius: 0, // Mudado de borderTopLeftRadius
    borderBottomRightRadius: 0, // Mudado de borderTopRightRadius
    marginBottom: 8, // Mudado de marginTop para marginBottom
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 }, // Sombra invertida para cima
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 1001,
  },
  sugestaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'white',
  },
  sugestaoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sugestaoNome: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 2,
  },
  sugestaoApt: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});
