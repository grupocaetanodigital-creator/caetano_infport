/**
 * Serviço Avançado de OCR e Calibração de Documentos Brasileiros
 * (RG tradicional, CNH, Nova Carteira de Identidade Nacional - CIN, Cartão CPF e Crachás)
 * 
 * Estratégia Híbrida:
 * 1. Primário: Motor de IA Gemini 2.5 Flash via /api/ocr-documento (precisão milimétrica).
 * 2. Secundário / Offline: Motor Tesseract com calibração heurística de zonas brasileiras.
 * 3. Validação algorítmica real do CPF (Módulo 11 da Receita Federal).
 * 4. Recorte de Foto e Face do Documento via HTML5 Canvas.
 */

export interface DadosDocumentoExtraidos {
  tipoDocumento: 'CPF' | 'RG' | 'CNH' | 'CIN' | 'CRACHA' | 'DESCONHECIDO';
  nomeCompleto: string;
  documentoFormatado: string;
  numeroLimpo: string;
  cpfValidado: boolean;
  rgValido: boolean;
  cnhRegistro?: string;
  empresaSugerida?: string;
  fotoDocumentoBase64?: string;
  fotoRostoBase64?: string;
  confianca: number;
  numerosRejeitados: string[];
  linhasDetectadas?: string[];
  metodoUtilizado?: 'IA_GEMINI' | 'TESSERACT_LOCAL';
}

/**
 * Validação algorítmica real do CPF (Módulo 11 da Receita Federal)
 * Garante que NENHUM número aleatório (como datas, telefones ou CEPs) seja aceito como CPF.
 */
export function validarCPF(cpf: string): boolean {
  const limpo = (cpf || '').replace(/\D/g, '');
  if (limpo.length !== 11) return false;

  // Rejeita CPFs formados por dígitos repetidos conhecidos (ex: 000.000.000-00, 111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  // Cálculo do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(9), 10)) return false;

  // Cálculo do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(10), 10)) return false;

  return true;
}

/**
 * Formata CPF para o padrão 000.000.000-00
 */
export function formatarCPF(cpf: string): string {
  const limpo = (cpf || '').replace(/\D/g, '').slice(0, 11);
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Valida se um número se enquadra na estrutura de RG brasileiro (7 a 10 dígitos)
 */
export function validarRG(rg: string): boolean {
  const limpo = (rg || '').replace(/[\s.-]/g, '').toUpperCase();
  if (limpo.length < 7 || limpo.length > 10) return false;
  return /^\d{6,9}[\dX]$/.test(limpo);
}

/**
 * Formata RG para padrão visual com pontos e traço
 */
export function formatarRG(rg: string): string {
  const limpo = (rg || '').replace(/[\s.-]/g, '').toUpperCase();
  if (limpo.length === 9) {
    return limpo.replace(/(\d{2})(\d{3})(\d{3})([\dX])/, '$1.$2.$3-$4');
  } else if (limpo.length === 8) {
    return limpo.replace(/(\d{1,2})(\d{3})(\d{3})/, '$1.$2.$3');
  }
  return limpo;
}

/**
 * Termos governamentais e de cabeçalhos que devem ser ignorados na extração de nome
 */
export const STOP_WORDS_DOCUMENTOS = [
  'REPUBLICA', 'FEDERATIVA', 'BRASIL', 'MINISTERIO', 'FAZENDA', 'RECEITA',
  'FEDERAL', 'CARTEIRA', 'NACIONAL', 'HABILITACAO', 'IDENTIDADE', 'REGISTRO',
  'GERAL', 'SECRETARIA', 'SEGURANCA', 'PUBLICA', 'DEPARTAMENTO', 'TRANSITO',
  'DETRAN', 'INSTITUTO', 'IDENTIFICACAO', 'POLICIA', 'CIVIL', 'FILIACAO',
  'PAI', 'MAE', 'NATURALIDADE', 'NACIONALIDADE', 'DATA', 'NASCIMENTO',
  'EXPEDICAO', 'VALIDADE', 'OBSERVACOES', 'ASSINATURA', 'PORTADOR', 'VALIDA',
  'TERRITORIO', 'VIA', 'CATEGORIA', 'HABILITADO', 'PERMISSAO', 'CONDUTOR',
  'DOC', 'SSP', 'ORGAO', 'EMISSOR', 'BRASILEIRA', 'BRASILEIRO', 'SEXO',
  'ESTADO', 'PREFEITURA', 'GOVERNO', 'CONSELHO', 'REGIONAL', 'LOCAL',
  'MATRICULA', 'CHAVE', 'CODIGO', 'ACESSO', 'AUTORIZADO', 'VISITANTE',
  'EMPRESA', 'SERVICO', 'PORTARIA', 'SISTEMA', 'CARTAO', 'CRACHA',
  'POLEGAR', 'DIREITO', 'ASSINATURA', 'DIRETOR', 'TITULAR'
];

/**
 * Substitui caracteres comumente confundidos pelo OCR em sequências numéricas
 */
function corrigirErrosOcrNumeros(texto: string): string {
  return texto
    .replace(/[OoQq]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8');
}

/**
 * Analisa o texto bruto e extrai os campos com base no layout dos documentos brasileiros
 */
export function extrairDadosDocumento(textoBruto: string): DadosDocumentoExtraidos {
  const linhasBrutas = textoBruto
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const numerosRejeitados: string[] = [];
  let tipoDetectado: DadosDocumentoExtraidos['tipoDocumento'] = 'DESCONHECIDO';

  const textoUpper = textoBruto.toUpperCase();

  // 1. Identificar o tipo do documento
  if (textoUpper.includes('HABILITACAO') || textoUpper.includes('CNH') || textoUpper.includes('CONDUTOR') || textoUpper.includes('DETRAN')) {
    tipoDetectado = 'CNH';
  } else if (textoUpper.includes('REGISTRO GERAL') || textoUpper.includes('SECRETARIA DE SEGURANCA') || textoUpper.includes('IDENTIDADE') || textoUpper.includes('SSP')) {
    tipoDetectado = 'RG';
  } else if (textoUpper.includes('CARTEIRA DE IDENTIDADE NACIONAL') || textoUpper.includes('CIN')) {
    tipoDetectado = 'CIN';
  } else if (textoUpper.includes('CADASTRO DE PESSOAS FISICAS') || textoUpper.includes('RECEITA FEDERAL')) {
    tipoDetectado = 'CPF';
  } else if (textoUpper.includes('CRACHA') || textoUpper.includes('COLABORADOR') || textoUpper.includes('VISITANTE') || textoUpper.includes('PRESTADOR')) {
    tipoDetectado = 'CRACHA';
  }

  // 2. Extração e Validação Rigorosa de CPF
  let cpfValidoEncontrado: string | null = null;
  const padroesCpf = [
    /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}\b/g,
    /\b\d{11}\b/g
  ];

  const candidatos = new Set<string>();
  for (const regex of padroesCpf) {
    const matches = textoBruto.match(regex);
    if (matches) matches.forEach(m => candidatos.add(m));
  }

  // Tenta também corrigir linhas que parecem CPF mas têm erros de OCR
  for (const linha of linhasBrutas) {
    const corrigida = corrigirErrosOcrNumeros(linha).replace(/\D/g, '');
    if (corrigida.length === 11) {
      candidatos.add(corrigida);
    }
  }

  for (const cand of candidatos) {
    const limpo = cand.replace(/\D/g, '');
    if (validarCPF(limpo)) {
      cpfValidoEncontrado = formatarCPF(limpo);
      break;
    } else {
      numerosRejeitados.push(`${cand} (Não é CPF válido)`);
    }
  }

  // 3. Extração de RG
  let rgEncontrado: string | null = null;
  const regexRg = /\b\d{1,2}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?[\dX]\b/gi;
  const candidatosRg = textoBruto.match(regexRg) || [];

  for (const cand of candidatosRg) {
    const limpo = cand.replace(/[\s.-]/g, '').toUpperCase();
    const pareceData = /^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(limpo) ||
                       /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(19|20)\d{2}$/.test(limpo);

    if (pareceData) {
      numerosRejeitados.push(`${cand} (Descartado: Data)`);
      continue;
    }

    if (validarRG(limpo)) {
      rgEncontrado = formatarRG(limpo);
      break;
    }
  }

  // 4. Extração de CNH Registro
  let cnhRegistroEncontrado: string | null = null;
  if (tipoDetectado === 'CNH') {
    const matchReg = textoBruto.match(/(?:REGISTRO|Nº\s*REGISTRO)[\s:]*(\d{11})/i);
    if (matchReg && matchReg[1]) {
      cnhRegistroEncontrado = matchReg[1];
    }
  }

  // 5. Determinação do Documento Principal
  let documentoFormatado = '';
  let numeroLimpo = '';
  let cpfValidado = false;
  let rgValido = false;

  if (cpfValidoEncontrado) {
    documentoFormatado = cpfValidoEncontrado;
    numeroLimpo = cpfValidoEncontrado.replace(/\D/g, '');
    cpfValidado = true;
    if (tipoDetectado === 'DESCONHECIDO') tipoDetectado = 'CPF';
  } else if (rgEncontrado) {
    documentoFormatado = rgEncontrado;
    numeroLimpo = rgEncontrado.replace(/[\s.-]/g, '');
    rgValido = true;
    if (tipoDetectado === 'DESCONHECIDO') tipoDetectado = 'RG';
  } else if (cnhRegistroEncontrado) {
    documentoFormatado = `CNH: ${cnhRegistroEncontrado}`;
    numeroLimpo = cnhRegistroEncontrado;
  }

  // 6. Extração Calibrada de Nome Completo
  let nomeCompleto = '';

  // Procura rótulo "NOME" no texto
  for (let i = 0; i < linhasBrutas.length; i++) {
    const linha = linhasBrutas[i];
    const linhaUpper = linha.toUpperCase();

    // Evita capturar nomes de pais no campo filiação
    if (linhaUpper.includes('FILIACAO') || linhaUpper.includes('PAI') || linhaUpper.includes('MAE')) {
      continue;
    }

    if (linhaUpper.includes('NOME') || linhaUpper.includes('CONDUTOR')) {
      let candidata = '';
      if (linha.includes(':')) {
        candidata = linha.split(':')[1] || '';
      } else if (i + 1 < linhasBrutas.length) {
        candidata = linhasBrutas[i + 1];
      }

      candidata = sanitizarNome(candidata);
      if (candidata.length >= 6 && candidata.includes(' ')) {
        nomeCompleto = candidata;
        break;
      }
    }
  }

  // Se não achou com rótulo explícito, busca a primeira linha com formato de nome próprio sem números
  if (!nomeCompleto) {
    for (const linha of linhasBrutas) {
      if (linha.includes('FILIACAO') || linha.includes('FILIAÇÃO')) continue;
      const sanitizada = sanitizarNome(linha);
      const partes = sanitizada.split(' ').filter(p => p.length >= 2);

      if (partes.length >= 2 && sanitizada.length >= 7) {
        const upper = sanitizada.toUpperCase();
        const temPalavraProibida = STOP_WORDS_DOCUMENTOS.some(sw => {
          const regex = new RegExp(`\\b${sw}\\b`, 'i');
          return regex.test(upper);
        });

        if (!temPalavraProibida && !/\d/.test(linha)) {
          nomeCompleto = sanitizada;
          break;
        }
      }
    }
  }

  let confianca = 0;
  if (cpfValidado) confianca += 50;
  if (rgValido) confianca += 30;
  if (nomeCompleto) confianca += 40;
  if (tipoDetectado !== 'DESCONHECIDO') confianca += 10;

  return {
    tipoDocumento: tipoDetectado,
    nomeCompleto,
    documentoFormatado,
    numeroLimpo,
    cpfValidado,
    rgValido,
    cnhRegistro: cnhRegistroEncontrado || undefined,
    confianca: Math.min(confianca, 100),
    numerosRejeitados,
    linhasDetectadas: linhasBrutas.slice(0, 15),
    metodoUtilizado: 'TESSERACT_LOCAL'
  };
}

function sanitizarNome(texto: string): string {
  if (!texto) return '';
  const limpo = texto
    .replace(/[^a-zA-ZÀ-ÿ\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const preposicoes = new Set(['da', 'de', 'do', 'dos', 'das', 'e', 'del']);
  const partes = limpo.toLowerCase().split(' ');

  return partes
    .map((p, idx) => {
      if (idx > 0 && preposicoes.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' ');
}

/**
 * Prepara e calibra imagem no Canvas
 */
export async function prepararImagemCanvas(
  arquivoOuDataUrl: File | Blob | string,
  rotacaoGraus = 0,
  aplicarFiltroContraste = true
): Promise<{ dataUrl: string; width: number; height: number; canvas: HTMLCanvasElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Falha ao inicializar o Canvas 2D.'));
        return;
      }

      if (rotacaoGraus === 90 || rotacaoGraus === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotacaoGraus * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      if (aplicarFiltroContraste) {
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const contraste = gray < 128 ? gray * 0.75 : Math.min(255, gray * 1.25);
            d[i] = contraste;
            d[i + 1] = contraste;
            d[i + 2] = contraste;
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (e) {
          console.warn('[OCR Service] Filtro de contraste ignorado:', e);
        }
      }

      let exportCanvas = canvas;
      const maxDim = 1200;
      if (canvas.width > maxDim || canvas.height > maxDim) {
        const fator = Math.min(maxDim / canvas.width, maxDim / canvas.height);
        const redCanvas = document.createElement('canvas');
        redCanvas.width = Math.round(canvas.width * fator);
        redCanvas.height = Math.round(canvas.height * fator);
        const redCtx = redCanvas.getContext('2d');
        if (redCtx) {
          redCtx.drawImage(canvas, 0, 0, redCanvas.width, redCanvas.height);
          exportCanvas = redCanvas;
        }
      }

      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
      resolve({
        dataUrl,
        width: exportCanvas.width,
        height: exportCanvas.height,
        canvas: exportCanvas
      });
    };

    img.onerror = () => reject(new Error('Erro ao carregar imagem para OCR.'));

    if (typeof arquivoOuDataUrl === 'string') {
      img.src = arquivoOuDataUrl;
    } else {
      img.src = URL.createObjectURL(arquivoOuDataUrl);
    }
  });
}

export function recortarFotoTitular(
  canvasDoc: HTMLCanvasElement,
  tipo: DadosDocumentoExtraidos['tipoDocumento']
): string | undefined {
  try {
    const w = canvasDoc.width;
    const h = canvasDoc.height;

    let cropX = Math.round(w * 0.05);
    let cropY = Math.round(h * 0.12);
    let cropW = Math.round(w * 0.35);
    let cropH = Math.round(h * 0.65);

    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 240;
    faceCanvas.height = 300;
    const fCtx = faceCanvas.getContext('2d');
    if (!fCtx) return undefined;

    fCtx.drawImage(
      canvasDoc,
      cropX, cropY, cropW, cropH,
      0, 0, faceCanvas.width, faceCanvas.height
    );

    return faceCanvas.toDataURL('image/jpeg', 0.88);
  } catch {
    return undefined;
  }
}

/**
 * Executa o fluxo completo com Inteligência Híbrida:
 * 1º Tenta a API do Gemini 2.5 Flash via /api/ocr-documento (precisão máxima em CNH/RG)
 * 2º Fallback para o motor Tesseract local se offline ou servidor indisponível
 */
export async function executarOCRCompleto(
  arquivoOuDataUrl: File | Blob | string,
  onProgresso?: (progresso: number, status: string) => void
): Promise<DadosDocumentoExtraidos> {
  onProgresso?.(15, 'Preparando imagem do documento...');
  const imgProcessada = await prepararImagemCanvas(arquivoOuDataUrl, 0, false);
  const fotoDocBase64 = imgProcessada.dataUrl;

  // Tentativa 1: IA Gemini 2.5 Flash no backend
  try {
    onProgresso?.(35, 'Analisando documento com IA Gemini Vision...');
    const respostaApi = await fetch('/api/ocr-documento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagemBase64: fotoDocBase64 })
    });

    if (respostaApi.ok) {
      const dadosGemini = await respostaApi.json();
      if (dadosGemini && (dadosGemini.nomeCompleto || dadosGemini.documentoFormatado)) {
        onProgresso?.(90, 'Extraindo fotos e calibração...');
        const fotoRosto = recortarFotoTitular(imgProcessada.canvas, dadosGemini.tipoDocumento);
        onProgresso?.(100, 'OCR com IA concluído com sucesso!');

        return {
          tipoDocumento: dadosGemini.tipoDocumento || 'CPF',
          nomeCompleto: dadosGemini.nomeCompleto || '',
          documentoFormatado: dadosGemini.documentoFormatado || '',
          numeroLimpo: dadosGemini.numeroLimpo || '',
          cpfValidado: Boolean(dadosGemini.cpfValidado),
          rgValido: Boolean(dadosGemini.rgValido),
          cnhRegistro: dadosGemini.cnhRegistro,
          empresaSugerida: dadosGemini.empresaSugerida,
          fotoDocumentoBase64: fotoDocBase64,
          fotoRostoBase64: fotoRosto,
          confianca: dadosGemini.confianca || 98,
          numerosRejeitados: [],
          metodoUtilizado: 'IA_GEMINI'
        };
      }
    }
  } catch (errApi) {
    console.warn('[OCR Híbrido] IA Gemini indisponível, acionando motor Tesseract local:', errApi);
  }

  // Tentativa 2: Motor Local Tesseract.js (Offline / Contingência)
  onProgresso?.(45, 'Acionando motor OCR local calibrado...');
  if (!(window as any).Tesseract) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Falha ao carregar Tesseract.js'));
      document.head.appendChild(script);
    });
  }

  const Tesseract = (window as any).Tesseract;
  onProgresso?.(60, 'Lendo caracteres e zonas do documento...');

  const ret = await Tesseract.recognize(imgProcessada.dataUrl, 'por', {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && m.progress) {
        const perc = 60 + Math.round(m.progress * 30);
        onProgresso?.(perc, `Lendo documento... (${perc}%)`);
      }
    }
  });

  const textoFinal = ret?.data?.text || '';
  const resultado = extrairDadosDocumento(textoFinal);
  const fotoRosto = recortarFotoTitular(imgProcessada.canvas, resultado.tipoDocumento);

  resultado.fotoDocumentoBase64 = fotoDocBase64;
  resultado.fotoRostoBase64 = fotoRosto;
  resultado.metodoUtilizado = 'TESSERACT_LOCAL';

  onProgresso?.(100, 'Leitura local concluída!');
  return resultado;
}
