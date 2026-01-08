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
   * Atualiza campos de um card
   * @param {string} cardId - ID do card
   * @param {Array} fieldUpdates - Array de { fieldId, value }
   * @returns {Promise<Object>} Card atualizado
   */
  async updateCardFields(cardId, fieldUpdates) {
    const mutation = `
      mutation UpdateCardFields($cardId: ID!, $fields: [UpdateFieldValueInput!]!) {
        updateCardField(input: { 
          card_id: $cardId,
          field_id: $fields[0].field_id,
          new_value: $fields[0].new_value
        }) {
          card {
            id
            title
          }
          success
        }
      }
    `;

    // Pipefy API só atualiza um campo por vez, então faremos múltiplas chamadas
    const results = [];

    for (const field of fieldUpdates) {
      try {
        // Formata valor dependendo do tipo
        let formattedValue = field.value;
        
        // Se for uma data ISO, converte para formato aceito pelo Pipefy
        // Formato documentado: "YYYY-MM-DD HH:MM:SS" (ISO 8601 sem timezone)
        if (typeof field.value === 'string' && field.value.match(/^\d{4}-\d{2}-\d{2}T/)) {
          // Extrai YYYY-MM-DDTHH:mm:ss e converte para YYYY-MM-DD HH:mm:ss
          const isoWithoutTz = field.value.substring(0, 19); // Remove timezone e milissegundos
          formattedValue = isoWithoutTz.replace('T', ' '); // Substitui T por espaço
        }

        const singleFieldMutation = `
          mutation UpdateCardField($cardId: ID!, $fieldId: ID!, $value: String!) {
            updateCardField(input: { 
              card_id: $cardId,
              field_id: $fieldId,
              new_value: $value
            }) {
              card {
                id
                title
              }
              success
            }
          }
        `;

        const data = await this.client.request(singleFieldMutation, {
          cardId,
          fieldId: field.fieldId,
          value: formattedValue
        });

        results.push({
          fieldId: field.fieldId,
          success: data.updateCardField.success
        });

        console.log(`✅ Campo ${field.fieldId} atualizado com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao atualizar campo ${field.fieldId}:`, error);
        results.push({
          fieldId: field.fieldId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
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
