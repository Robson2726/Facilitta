import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';

export default function TabOneScreen() {
  const renderDashboardCard = ({ item }: { item: any }) => (
    <View style={styles.outerCard}>
      {/* Header com título "Visão Geral" */}
      <Text style={styles.cardTitle}>Visão Geral</Text>

      {/* Card interno branco */}
      <View style={styles.innerCard}>
        {/* Header interno com nome do morador e status */}
        <View style={styles.innerCardHeader}>
          <Text style={styles.moradorNome}>{item.morador_nome}</Text>
          <View
            style={[
              styles.statusBadge,
              item.status === 'entregue'
                ? styles.statusEntregue
                : styles.statusPendente,
            ]}
          >
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Informações principais em grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <View style={styles.infoHeader}>
              <Ionicons name="cube-outline" size={16} color="#666" />
              <Text style={styles.infoLabel}>Quantidade</Text>
            </View>
            <Text style={styles.infoValue}>{item.quantidade}</Text>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoHeader}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.infoLabel}>Data</Text>
            </View>
            <Text style={styles.infoValue}>
              {new Date(item.data_recebimento).toLocaleDateString('pt-BR')}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoHeader}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.infoLabel}>Hora</Text>
            </View>
            <Text style={styles.infoValue}>{item.hora_recebimento}</Text>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoHeader}>
              <Ionicons name="person-outline" size={16} color="#666" />
              <Text style={styles.infoLabel}>Porteiro</Text>
            </View>
            <Text style={styles.infoValue}>{item.porteiro_nome}</Text>
          </View>
        </View>

        {/* Observações se existirem */}
        {item.observacoes && (
          <View style={styles.observacoesContainer}>
            <View style={styles.infoHeader}>
              <Ionicons name="document-text-outline" size={16} color="#666" />
              <Text style={styles.infoLabel}>Observações</Text>
            </View>
            <Text style={styles.observacoesText}>{item.observacoes}</Text>
          </View>
        )}

        {/* Indicador de tempo (quantos dias pendente) */}
        <View style={styles.tempoContainer}>
          <View style={styles.infoHeader}>
            <Ionicons name="hourglass-outline" size={16} color="#666" />
            <Text style={styles.infoLabel}>Tempo Pendente</Text>
          </View>
          <Text
            style={[styles.infoValue, getTempoColor(item.data_recebimento)]}
          >
            {calcularDiasPendentes(item.data_recebimento)} dias
          </Text>
        </View>
      </View>
    </View>
  );

  const calcularDiasPendentes = (dataRecebimento: string) => {
    const hoje = new Date();
    const dataRecebida = new Date(dataRecebimento);
    const diffTime = hoje.getTime() - dataRecebida.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getTempoColor = (dataRecebimento: string) => {
    const dias = calcularDiasPendentes(dataRecebimento);
    if (dias > 15) return { color: '#dc3545' }; // Vermelho para crítico
    if (dias > 7) return { color: '#ffc107' }; // Amarelo para antigo
    return { color: '#28a745' }; // Verde para recente
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>
      <View
        style={styles.separator}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },

  // Novos estilos para o card unificado do dashboard
  outerCard: {
    backgroundColor: '#007AFF', // Azul principal
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  cardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  innerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },

  innerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  moradorNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusPendente: {
    backgroundColor: '#FFF3CD',
  },

  statusEntregue: {
    backgroundColor: '#D4EDDA',
  },

  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#495057',
    textTransform: 'uppercase',
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  infoItem: {
    width: '48%',
    marginBottom: 16,
  },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  infoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
  },

  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginTop: 2,
  },

  observacoesContainer: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },

  observacoesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginTop: 4,
    fontStyle: 'italic',
  },

  tempoContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});
