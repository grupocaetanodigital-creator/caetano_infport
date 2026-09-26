import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '20mb' }));

/**
 * Rota de Alta Precisão: OCR de Documentos Brasileiros com Gemini 2.5 Flash
 * Calibrado especificamente para:
 * - RG tradicional (SSP)
 * - CNH (Carteira Nacional de Habilitação)
 * - Nova Carteira de Identidade Nacional (CIN)
 * - Cartão CPF
 * - Crachás Funcionais de Prestadores
 */
app.post('/api/ocr-documento', async (req, res) => {
  try {
    const { imagemBase64 } = req.body;
    if (!imagemBase64) {
      return res.status(400).json({ erro: 'Imagem não fornecida' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ erro: 'Chave GEMINI_API_KEY não configurada no servidor' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imagemBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const promptCalibracao = `Você é um perito em documentos oficiais brasileiros e calibração de visão computacional.
Analise a imagem deste documento (RG, CNH, Nova CIN, Cartão CPF ou Crachá de Prestador/Visitante).

MAPA DE CALIBRAÇÃO DAS ZONAS DO DOCUMENTO:
1. NOME COMPLETO DO TITULAR:
   - No RG tradicional (verde): Encontra-se no campo "NOME", logo abaixo da linha "DATA DE EXPEDIÇÃO" e acima de "FILIAÇÃO".
     ATENÇÃO CRÍTICA: NUNCA pegue o nome do pai ou da mãe do campo "FILIAÇÃO". Pegue APENAS o nome do titular.
   - Na CNH (frente): Fica no campo superior destacado "1. NOME".
   - Na Nova CIN (modelo nacional unificado): O nome vem em destaque no topo da frente do documento.
   - No Crachá: O nome principal do colaborador/visitante.
   - NUNCA retorne cabeçalhos como "REPÚBLICA FEDERATIVA DO BRASIL", "MINISTÉRIO DA JUSTIÇA", "SECRETARIA DE SEGURANÇA", "DEPARTAMENTO DE TRÂNSITO".
   - Formate o nome em Title Case limpo (ex: "Carlos Roberto da Silva").

2. NÚMERO DO DOCUMENTO (CPF ou RG):
   - Se for CPF (ou Nova CIN ou CNH): Extraia os 11 dígitos e valide matematicamente. Formate obrigatoriamente como "000.000.000-00".
   - Se for RG: Formate no padrão "00.000.000-0" ou com "X" final.
   - REJEITE completamente datas (ex: "15/04/1990"), números de espelho ou códigos de barras.

3. TIPO DO DOCUMENTO:
   - Classifique como "CNH", "RG", "CIN", "CPF" ou "CRACHA".

4. EMPRESA / PRESTADORA (se visível ou crachá):
   - Nome da empresa se for crachá ou constar prestadora.

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem comentários e sem bloco de código markdown):
{
  "tipoDocumento": "CNH",
  "nomeCompleto": "Nome Completo do Titular",
  "documentoFormatado": "000.000.000-00",
  "numeroLimpo": "00000000000",
  "cpfValidado": true,
  "rgValido": false,
  "cnhRegistro": null,
  "empresaSugerida": "Nome da Empresa ou null",
  "confianca": 98
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: promptCalibracao },
            {
              inlineData: {
                data: base64Data,
                mimeType
              }
            }
          ]
        }
      ]
    });

    const textoResposta = response.text || '';
    const jsonMatch = textoResposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ erro: 'Não foi possível interpretar o documento' });
    }

    const resultado = JSON.parse(jsonMatch[0]);
    return res.json(resultado);
  } catch (err: any) {
    console.error('[API OCR] Erro:', err);
    return res.status(500).json({ erro: err.message || 'Falha no processamento OCR' });
  }
});

async function start() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[INFPORT 1.0] Servidor com OCR Gemini rodando em http://localhost:${port}`);
  });
}

start();
