import { GraphQLClient } from 'graphql-request';
import { config } from '../config/environment.js';

/**
 * Cliente GraphQL para integração com Pipefy
 * Gerencia queries e mutations da API do Pipefy
 */

class PipefyClient {
  constructor() {
    this.client = new GraphQLClient(config.pipefy.apiUrl, {
      headers: {
        authorization: `Bearer ${config.pipefyToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Busca informações do card
   * @param {string} cardId - ID do card no Pipefy
   * @returns {Promise<Object>} Dados do card
   */
  async getCard(cardId) {
    const query = `
      query GetCard($cardId: ID!) {
        card(id: $cardId) {
          id
          title
          current_phase {
            id
            name
          }
          fields {
            field {
              id
              label
            }
            value
          }
          createdAt
          updated_at
        }
      }
    `;

    try {
      const data = await this.client.request(query, { cardId });
      return data.card;
    } catch (error) {
      console.error('❌ Erro ao buscar card do Pipefy:', error);
      throw new Error(`Falha ao buscar card ${cardId}: ${error.message}`);
    }
  }

  /**
   * Atualiza campos de um card usando updateFieldsValues
   * Esta mutation é recomendada pela documentação oficial do Pipefy
   * @param {string} cardId - ID do card
   * @param {Array} fieldUpdates - Array de { fieldId, value }
   * @returns {Promise<Object>} Card atualizado
   */
  async updateCardFields(cardId, fieldUpdates) {
    // Prepara os valores para a mutation updateFieldsValues
    const values = fieldUpdates.map(field => {
      let formattedValue = field.value;
      
      // Se for uma data ISO, converte para formato DD/MM/YYYY HH:mm
      if (typeof field.value === 'string' && field.value.match(/^\d{4}-\d{2}-\d{2}T/)) {
        const date = new Date(field.value);
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        formattedValue = `${day}/${month}/${year} ${hours}:${minutes}`;
      }
      
      return {
        fieldId: field.fieldId,
        value: formattedValue
      };
    });

    // Mutation updateFieldsValues conforme documentação do Pipefy
    const mutation = `
      mutation UpdateFieldsValues($nodeId: ID!, $values: [UpdateFieldValueInput!]!) {
        updateFieldsValues(input: {
          nodeId: $nodeId,
          values: $values
        }) {
          success
        }
      }
    `;

    try {
      console.log(`📝 Atualizando ${values.length} campos com updateFieldsValues...`);
      console.log(`   Card ID: ${cardId}`);
      console.log(`   Valores:`, JSON.stringify(values, null, 2));

      const data = await this.client.request(mutation, {
        nodeId: cardId,
        values: values
      });

      if (data.updateFieldsValues.success) {
        console.log('✅ Campos atualizados com sucesso via updateFieldsValues!');
        return values.map(v => ({
          fieldId: v.fieldId,
          success: true
        }));
      } else {
        console.warn('⚠️ updateFieldsValues retornou success: false');
        return values.map(v => ({
          fieldId: v.fieldId,
          success: false,
          error: 'Mutation returned success: false'
        }));
      }

    } catch (error) {
      console.error('❌ Erro ao atualizar campos com updateFieldsValues:', error);
      
      // Retorna erro para todos os campos
      return values.map(v => ({
        fieldId: v.fieldId,
        success: false,
        error: error.message
      }));
    }
  }

  /**
   * Atualiza campos de SLA no card
   * @param {string} cardId - ID do card
   * @param {Object} slaData - { start, deadline, status }
   * @returns {Promise<Object>} Resultado da atualização
   */
  async updateSlaFields(cardId, slaData) {
    const fieldUpdates = [];

    // Campo de início do SLA
    if (slaData.start && config.pipefy.fields.slaStart) {
      fieldUpdates.push({
        fieldId: config.pipefy.fields.slaStart,
        value: slaData.start
      });
    }

    // Campo de deadline (obrigatório)
    if (slaData.deadline && config.pipefy.fields.slaDeadline) {
      fieldUpdates.push({
        fieldId: config.pipefy.fields.slaDeadline,
        value: slaData.deadline
      });
    }

    // Campo de status (opcional)
    if (slaData.status && config.pipefy.fields.slaStatus) {
      fieldUpdates.push({
        fieldId: config.pipefy.fields.slaStatus,
        value: slaData.status
      });
    }

    if (fieldUpdates.length === 0) {
      console.warn('⚠️ Nenhum campo configurado para atualizar');
      return { success: false, message: 'Nenhum campo configurado' };
    }

    console.log(`📝 Atualizando ${fieldUpdates.length} campos no card ${cardId}...`);
    const results = await this.updateCardFields(cardId, fieldUpdates);

    const allSuccess = results.every(r => r.success);
    return {
      success: allSuccess,
      results,
      message: allSuccess ? 'Todos os campos atualizados' : 'Alguns campos falharam'
    };
  }

  /**
   * Cria um comentário no card (útil para logs e auditoria)
   * @param {string} cardId - ID do card
   * @param {string} text - Texto do comentário
   * @returns {Promise<Object>} Comentário criado
   */
  async createComment(cardId, text) {
    const mutation = `
      mutation CreateComment($cardId: ID!, $text: String!) {
        createComment(input: {
          card_id: $cardId,
          text: $text
        }) {
          comment {
            id
            text
          }
        }
      }
    `;

    try {
      const data = await this.client.request(mutation, { cardId, text });
      return data.createComment.comment;
    } catch (error) {
      console.error('❌ Erro ao criar comentário:', error);
      // Não lança erro, comentário é nice-to-have
      return null;
    }
  }
}

// Exporta instância única
export const pipefyClient = new PipefyClient();
