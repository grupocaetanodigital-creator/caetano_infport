delete (globalThis as any).__dirname;
delete (globalThis as any).__filename;
process.env.DISABLE_HMR = 'true';

import express from 'express';
import http from 'http';
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

    const promptCalibracao = `Você é um perito oficial em documentos brasileiros (CNH Nova e Tradicional, RG, Nova CIN, Cartão CPF e Crachás).
Analise a imagem deste documento com máxima precisão.

MAPA DE CALIBRAÇÃO DAS ZONAS DO DOCUMENTO:
1. NOME COMPLETO DO TITULAR:
   - Na CNH (Nova CNH 2022-2026 e Tradicional): O NOME DO TITULAR fica EXCLUSIVAMENTE dentro do campo "2 e 1 NOME E SOBRENOME" (ou "1. NOME"), em caixa alta no topo (exemplo: "LAURINDO CAETANO DO CARMO").
   - REGRA DE OURO DA FILIAÇÃO: NUNCA, SOB NENHUMA HIPÓTESE, capture nomes do campo "FILIAÇÃO" (ex: "ANTONIO APARECIDO DO CARMO" ou "ROSA FATIMA LOPES CAETANO DO CARMO"). Capture APENAS o titular.
   - NUNCA capture cabeçalhos ou órgãos governamentais: "REPÚBLICA FEDERATIVA DO BRASIL", "MINISTÉRIO DOS TRANSPORTES", "SECRETARIA NACIONAL DE TRÂNSITO", "CARTEIRA NACIONAL DE HABILITAÇÃO", "DRIVER LICENSE", "PERMISO DE CONDUCCIÓN".
   - No RG tradicional (verde): Campo "NOME", logo abaixo de "DATA DE EXPEDIÇÃO" e acima de "FILIAÇÃO".
   - Na Nova CIN (modelo unificado): Nome em destaque no topo frontal.
   - No Crachá: Nome em destaque do profissional.
   - Formate o nome em Title Case limpo (ex: "Laurindo Caetano do Carmo").

2. NÚMERO DO DOCUMENTO:
   - Na CNH: O CPF fica no campo "4d CPF" (ex: "378.178.748-67"). Valide matematicamente com os 11 dígitos e formate obrigatoriamente como "000.000.000-00".
   - Na CNH: O RG fica no campo "4c DOC. IDENTIDADE / ÓRG. EMISSOR / UF" (ex: "43048684 SSP/SP"). Extraia o número do RG (ex: "43048684").
   - Na CNH: O registro fica no campo "5 Nº REGISTRO" (ex: "05947078899").
   - No RG clássico: Campo "REGISTRO GERAL" ou "CPF".
   - Na Nova CIN: O CPF é o número único oficial.
   - REJEITE completamente datas ("11/03/1987", "13/06/2024", "03/06/2034"), números de espelho ou códigos de segurança.

3. TIPO DO DOCUMENTO:
   - "CNH", "RG", "CIN", "CPF" ou "CRACHA". Se tiver "CARTEIRA NACIONAL DE HABILITAÇÃO", "DETRAN" ou "SENATRAN", é OBRIGATORIAMENTE "CNH".

4. COORDENADAS DA FOTO DO ROSTO DO TITULAR:
   - Estime as coordenadas normalizadas [ymin, xmin, ymax, xmax] da foto 3x4 do rosto (valores entre 0.0 e 1.0). Na CNH a foto fica após a faixa verde lateral, aproximadamente em [0.36, 0.19, 0.78, 0.43].

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem comentários e sem bloco markdown):
{
  "tipoDocumento": "CNH",
  "nomeCompleto": "Laurindo Caetano do Carmo",
  "documentoFormatado": "378.178.748-67",
  "numeroLimpo": "37817874867",
  "cpfValidado": true,
  "rg": "43048684",
  "rgValido": true,
  "cnhRegistro": "05947078899",
  "empresaSugerida": null,
  "confianca": 99,
  "boxRosto": [0.36, 0.19, 0.78, 0.43]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
  const server = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    // Garante que o navegador e o iframe do AI Studio sempre recebam a versão atualizada
    app.use((_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      next();
    });
    app.use(vite.middlewares);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[INFPORT 1.0] Servidor rodando em http://localhost:${port}`);
  });
}

start();
