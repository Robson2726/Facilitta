import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MoradorEncontrado {
  id: string;
  nome: string;
  apartamento: string;
  bloco: string;
  similaridade: number;
}

export interface ResultadoBusca {
  moradores: MoradorEncontrado[];
  loading: boolean;
  error: string | null;
}

export const useMoradorSearch = () => {
  const [resultado, setResultado] = useState<ResultadoBusca>({
    moradores: [],
    loading: false,
    error: null
  });

  const buscarMoradores = async (nomesOCR: string[]): Promise<MoradorEncontrado[]> => {
    if (nomesOCR.length === 0) return [];

    setResultado(prev => ({ ...prev, loading: true, error: null }));

    try {
      const apiConfig = await AsyncStorage.getItem('apiConfig');
      if (!apiConfig) {
        throw new Error('API não configurada');
      }

      const config = JSON.parse(apiConfig);
      const apiUrl = `http://${config.ip}:${config.port}/api/moradores`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !Array.isArray(result.data)) {
        throw new Error('Resposta inválida da API');
      }

      // Buscar matches para cada nome do OCR
      const todosOsMoradores = result.data;
      const moradoresEncontrados: MoradorEncontrado[] = [];

      for (const nomeOCR of nomesOCR) {
        const matches = encontrarSimilares(nomeOCR, todosOsMoradores);
        moradoresEncontrados.push(...matches);
      }

      // Remover duplicatas e ordenar por similaridade
      const moradoresUnicos = moradoresEncontrados
        .filter((morador, index, array) => 
          array.findIndex(m => m.id === morador.id) === index
        )
        .sort((a, b) => b.similaridade - a.similaridade)
        .slice(0, 5); // Máximo 5 resultados

      setResultado({
        moradores: moradoresUnicos,
        loading: false,
        error: null
      });

      return moradoresUnicos;

    } catch (error) {
      console.error('[useMoradorSearch] Erro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setResultado({
        moradores: [],
        loading: false,
        error: errorMessage
      });

      return [];
    }
  };

  return {
    ...resultado,
    buscarMoradores
  };
};

// Função para calcular similaridade entre nomes
function encontrarSimilares(nomeOCR: string, moradores: any[]): MoradorEncontrado[] {
  const nomeOCRLimpo = limparNome(nomeOCR);
  const matches: MoradorEncontrado[] = [];

  for (const morador of moradores) {
    const nomeMoradorLimpo = limparNome(morador.nome || '');
    const similaridade = calcularSimilaridade(nomeOCRLimpo, nomeMoradorLimpo);

    if (similaridade >= 0.6) { // Threshold de 60% de similaridade
      matches.push({
        id: morador.id?.toString() || '',
        nome: morador.nome || '',
        apartamento: morador.apartamento || 'N/A',
        bloco: morador.bloco || 'A',
        similaridade: Math.round(similaridade * 100)
      });
    }
  }

  return matches;
}

function limparNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcularSimilaridade(nome1: string, nome2: string): number {
  const palavras1 = nome1.split(' ');
  const palavras2 = nome2.split(' ');

  let matches = 0;
  let totalPalavras = Math.max(palavras1.length, palavras2.length);

  for (const palavra1 of palavras1) {
    if (palavra1.length < 3) continue; // Ignorar palavras muito curtas
    
    for (const palavra2 of palavras2) {
      if (palavra2.length < 3) continue;
      
      // Exact match
      if (palavra1 === palavra2) {
        matches += 1;
        break;
      }
      
      // Partial match (primeira palavra contém a segunda ou vice-versa)
      if (palavra1.includes(palavra2) || palavra2.includes(palavra1)) {
        matches += 0.7;
        break;
      }
      
      // Similaridade de Levenshtein simplificada
      if (similaridadeLevenshtein(palavra1, palavra2) > 0.8) {
        matches += 0.5;
        break;
      }
    }
  }

  return matches / totalPalavras;
}

function similaridadeLevenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length === 0 ? 1 : 0;
  if (b.length === 0) return 0;

  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(a.length, b.length);
  return (maxLen - matrix[a.length][b.length]) / maxLen;
}
