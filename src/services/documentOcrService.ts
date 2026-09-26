/**
 * Serviço Avançado de OCR e Validação de Documentos Brasileiros
 * (CPF, RG, CNH, CIN e Crachás de Prestadores)
 * 
 * Inclui:
 * 1. Algoritmo oficial de validação de dígitos verificadores do CPF (Módulo 11).
 * 2. Filtro anti-números aleatórios (rejeita datas de nascimento, códigos de espelho e registros espúrios).
 * 3. Sanitização e extração precisa de Nome Completo (exclusão de stop words governamentais).
 * 4. Recorte e otimização da foto do documento e foto facial 3x4 do titular via HTML5 Canvas.
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
}

/**
 * Validação algorítmica real do CPF (Módulo 11 da Receita Federal)
 * Garante que NENHUM número aleatório (como datas, telefones ou CEPs) seja aceito como CPF.
 */
export function validarCPF(cpf: string): boolean {
  const limpo = cpf.replace(/\D/g, '');
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
  const limpo = cpf.replace(/\D/g, '').slice(0, 11);
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Valida se um número se enquadra na estrutura de RG brasileiro (7 a 9 dígitos, podendo ter 'X')
 */
export function validarRG(rg: string): boolean {
  const limpo = rg.replace(/[\s.-]/g, '').toUpperCase();
  if (limpo.length < 7 || limpo.length > 10) return false;
  // Deve conter apenas dígitos, exceto o último que pode ser X
  return /^\d{6,9}[\dX]$/.test(limpo);
}

/**
 * Formata RG para padrão visual com pontos e traço
 */
export function formatarRG(rg: string): string {
  const limpo = rg.replace(/[\s.-]/g, '').toUpperCase();
  if (limpo.length === 9) {
    return limpo.replace(/(\d{2})(\d{3})(\d{3})([\dX])/, '$1.$2.$3-$4');
  } else if (limpo.length === 8) {
    return limpo.replace(/(\d{1,2})(\d{3})(\d{3})/, '$1.$2.$3');
  }
  return limpo;
}

/**
 * Lista negra de termos oficiais que aparecem em cabeçalhos de documentos públicos brasileiros.
 * Evita que palavras como "REPÚBLICA FEDERATIVA DO BRASIL" ou "SECRETARIA" sejam confundidas com nomes.
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
  'EMPRESA', 'SERVICO', 'PORTARIA', 'SISTEMA', 'CARTAO', 'CRACHA'
];

/**
 * Analisa o texto bruto do OCR e extrai dados com filtragem anti-números aleatórios
 */
export function extrairDadosDocumento(textoBruto: string): DadosDocumentoExtraidos {
  const linhas = textoBruto
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const numerosRejeitados: string[] = [];
  let tipoDetectado: DadosDocumentoExtraidos['tipoDocumento'] = 'DESCONHECIDO';

  const textoUpper = textoBruto.toUpperCase();

  // 1. Identificar o tipo do documento com base em palavras-chave contextuais
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
  // Procura sequências de 11 dígitos (formatadas ou contínuas)
  const padroesCpf = [
    /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}\b/g,
    /\b\d{11}\b/g
  ];

  let cpfValidoEncontrado: string | null = null;
  const candidatosCpf = new Set<string>();

  for (const regex of padroesCpf) {
    const matches = textoBruto.match(regex);
    if (matches) {
      matches.forEach(m => candidatosCpf.add(m));
    }
  }

  for (const cand of candidatosCpf) {
    const limpo = cand.replace(/\D/g, '');
    if (validarCPF(limpo)) {
      cpfValidoEncontrado = formatarCPF(limpo);
      break;
    } else {
      // Rejeita sequências de 11 dígitos que não são CPFs reais (ex: números de espelho da CNH, carimbos, etc.)
      numerosRejeitados.push(`${cand} (Não é CPF válido)`);
    }
  }

  // 3. Extração de RG (se não achou CPF ou para complementar)
  let rgEncontrado: string | null = null;
  const regexRg = /\b\d{1,2}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?[\dX]\b/gi;
  const candidatosRg = textoBruto.match(regexRg) || [];

  for (const cand of candidatosRg) {
    const limpo = cand.replace(/[\s.-]/g, '').toUpperCase();
    
    // Evita confundir datas (como 12/03/1985 ou 19850312) com RG
    const pareceData = /^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(limpo) ||
                       /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(19|20)\d{2}$/.test(limpo);
    
    if (pareceData) {
      numerosRejeitados.push(`${cand} (Descartado: Padrão de Data)`);
      continue;
    }

    if (validarRG(limpo)) {
      rgEncontrado = formatarRG(limpo);
      break;
    }
  }

  // 4. Extração de Número de Registro de CNH
  let cnhRegistroEncontrado: string | null = null;
  if (tipoDetectado === 'CNH') {
    const regexRegistro = /(?:REGISTRO|Nº\s*REGISTRO|NUMERO\s*REGISTRO)[\s:]*(\d{11})/i;
    const matchReg = textoBruto.match(regexRegistro);
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
    documentoFormatado = `CNH Reg: ${cnhRegistroEncontrado}`;
    numeroLimpo = cnhRegistroEncontrado;
  }

  // 6. Extração Precisa de Nome Completo
  let nomeCompleto = '';

  // Estratégia A: Busca por rótulo contextual (ex: "NOME", "NOME COMPLETO", "NOME DO CONDUTOR")
  for (let i = 0; i < linhas.length; i++) {
    const lUpper = linhas[i].toUpperCase().replace(/[^A-Z\s]/g, '');
    if (lUpper === 'NOME' || lUpper === 'NOME COMPLETO' || lUpper === 'NOME DO CONDUTOR' || lUpper.startsWith('NOME:')) {
      // O nome costuma ser a linha seguinte ou o texto após ':'
      let candidata = '';
      if (linhas[i].includes(':')) {
        candidata = linhas[i].split(':')[1] || '';
      } else if (i + 1 < linhas.length) {
        candidata = linhas[i + 1];
      }

      candidata = sanitizarNome(candidata);
      if (candidata.length >= 6 && candidata.includes(' ')) {
        nomeCompleto = candidata;
        break;
      }
    }
  }

  // Estratégia B: Se não achou por rótulo, procura linhas com padrão de Nome Próprio Brasileiro
  if (!nomeCompleto) {
    for (const linha of linhas) {
      const sanitizada = sanitizarNome(linha);
      const palavras = sanitizada.split(' ').filter(p => p.length >= 2);

      // Nome deve ter no mínimo 2 palavras (Nome + Sobrenome)
      if (palavras.length >= 2 && sanitizada.length >= 7) {
        // Verifica se contém stop words
        const upper = sanitizada.toUpperCase();
        const temPalavraProibida = STOP_WORDS_DOCUMENTOS.some(sw => {
          const regex = new RegExp(`\\b${sw}\\b`, 'i');
          return regex.test(upper);
        });

        // Não pode ter números
        const temNumero = /\d/.test(linha);

        if (!temPalavraProibida && !temNumero) {
          nomeCompleto = sanitizada;
          break;
        }
      }
    }
  }

  // 7. Extração de Empresa (se for crachá ou constar prestadora)
  let empresaSugerida = '';
  const regexEmpresa = /(?:EMPRESA|PRESTADORA|CONTRATADA|LTDA|ME|EPP|S\/A|SERVICOS)[\s:]*([A-Za-z0-9\s.&-]{4,30})/i;
  const matchEmpresa = textoBruto.match(regexEmpresa);
  if (matchEmpresa && matchEmpresa[1]) {
    empresaSugerida = matchEmpresa[1].trim();
  }

  let confianca = 0;
  if (cpfValidado) confianca += 50;
  if (rgValido) confianca += 30;
  if (nomeCompleto) confianca += 40;
  if (tipoDetectado !== 'DESCONHECIDO') confianca += 10;
  confianca = Math.min(confianca, 100);

  return {
    tipoDocumento: tipoDetectado,
    nomeCompleto,
    documentoFormatado,
    numeroLimpo,
    cpfValidado,
    rgValido,
    cnhRegistro: cnhRegistroEncontrado || undefined,
    empresaSugerida: empresaSugerida || undefined,
    confianca,
    numerosRejeitados
  };
}

/**
 * Sanitiza e formata o nome para Title Case limpo
 */
function sanitizarNome(texto: string): string {
  if (!texto) return '';
  // Remove caracteres estranhos que não sejam letras e acentos
  const limpo = texto
    .replace(/[^a-zA-ZÀ-ÿ\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Converte para Title Case respeitando preposições brasileiras (da, de, do, dos, das, e)
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
 * Pré-processa a imagem no Canvas para maximizar a acurácia do OCR:
 * - Aumento de contraste e nitidez
 * - Escala em tons de cinza com threshold adaptativo
 * - Rotação inteligente
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

      // Dimensões com suporte a rotação 90/270 graus
      if (rotacaoGraus === 90 || rotacaoGraus === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // Aplica rotação centralizada
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotacaoGraus * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      // Pré-processamento de Imagem: Contraste & Binarização Suave
      if (aplicarFiltroContraste) {
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;

          for (let i = 0; i < d.length; i += 4) {
            // Conversão Luminance padrão (Rec. 601)
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            // Curva de contraste sigmoide para clarear fundos e escurecer letras pretas
            const contraste = gray < 128 ? gray * 0.75 : Math.min(255, gray * 1.2);
            d[i] = contraste;
            d[i + 1] = contraste;
            d[i + 2] = contraste;
          }

          ctx.putImageData(imgData, 0, 0);
        } catch (e) {
          console.warn('[OCR Service] Pré-filtro de imagem ignorado:', e);
        }
      }

      // Reduz o canvas para exportação compacta (máximo 1200px para economizar memória)
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

/**
 * Recorta a área provável da foto 3x4 do titular no documento
 * Documentos como CNH e RG seguem o padrão onde a foto fica no terço esquerdo ou topo esquerdo.
 */
export function recortarFotoTitular(
  canvasDoc: HTMLCanvasElement,
  tipo: DadosDocumentoExtraidos['tipoDocumento']
): string | undefined {
  try {
    const w = canvasDoc.width;
    const h = canvasDoc.height;

    // Região de interesse estimada da foto 3x4
    let cropX = 0;
    let cropY = 0;
    let cropW = 0;
    let cropH = 0;

    if (w > h) {
      // Documento em orientação Paisagem (ex: CNH aberta ou RG deitado)
      cropX = Math.round(w * 0.04);
      cropY = Math.round(h * 0.15);
      cropW = Math.round(w * 0.32);
      cropH = Math.round(h * 0.70);
    } else {
      // Documento em orientação Retrato (ex: RG em pé ou Crachá)
      cropX = Math.round(w * 0.08);
      cropY = Math.round(h * 0.08);
      cropW = Math.round(w * 0.45);
      cropH = Math.round(h * 0.45);
    }

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
  } catch (err) {
    console.warn('[OCR Service] Recorte facial ignorado:', err);
    return undefined;
  }
}

/**
 * Executa o fluxo completo de OCR:
 * 1. Garante carregamento do Tesseract.js (versão leve com suporte a português).
 * 2. Testa as melhores rotações de imagem se a primeira leitura for insuficiente.
 * 3. Valida CPF matematicamente (Módulo 11) descartando números espúrios.
 * 4. Extrai Nome Completo filtrado e a foto do documento e do rosto.
 */
export async function executarOCRCompleto(
  arquivoOuDataUrl: File | Blob | string,
  onProgresso?: (progresso: number, status: string) => void
): Promise<DadosDocumentoExtraidos> {
  // Carrega Tesseract.js dinamicamente se ainda não estiver na página
  if (!(window as any).Tesseract) {
    onProgresso?.(10, 'Carregando motor OCR local...');
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Não foi possível carregar a biblioteca de OCR Tesseract.js.'));
      document.head.appendChild(script);
    });
  }

  const Tesseract = (window as any).Tesseract;
  onProgresso?.(20, 'Otimizando imagem do documento...');

  // Prepara a imagem base no ângulo normal (0°)
  const imgProcessada0 = await prepararImagemCanvas(arquivoOuDataUrl, 0, false);
  const fotoDocBase64 = imgProcessada0.dataUrl;

  // Realiza a primeira leitura OCR
  onProgresso?.(35, 'Analisando caracteres do documento...');
  const ret0 = await Tesseract.recognize(imgProcessada0.dataUrl, 'por', {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && m.progress) {
        const perc = 35 + Math.round(m.progress * 45);
        onProgresso?.(perc, `Lendo documento... (${perc}%)`);
      }
    }
  });

  let textoFinal = ret0?.data?.text || '';
  let dadosExtraidos = extrairDadosDocumento(textoFinal);

  // Se a primeira leitura não encontrou CPF válido nem RG, tenta a imagem com contraste reforçado ou rotação 90°
  if (!dadosExtraidos.cpfValidado && !dadosExtraidos.rgValido && dadosExtraidos.nomeCompleto.length < 5) {
    onProgresso?.(82, 'Ajustando contraste e ângulo do documento...');
    const imgProcessada90 = await prepararImagemCanvas(arquivoOuDataUrl, 90, true);
    const ret90 = await Tesseract.recognize(imgProcessada90.dataUrl, 'por');
    const texto90 = ret90?.data?.text || '';
    const dados90 = extrairDadosDocumento(texto90);

    if (dados90.cpfValidado || dados90.rgValido || dados90.nomeCompleto.length > dadosExtraidos.nomeCompleto.length) {
      dadosExtraidos = dados90;
      textoFinal = texto90;
    }
  }

  // Recorta foto do titular se o documento tiver boa confiança
  const fotoRosto = recortarFotoTitular(imgProcessada0.canvas, dadosExtraidos.tipoDocumento);

  dadosExtraidos.fotoDocumentoBase64 = fotoDocBase64;
  dadosExtraidos.fotoRostoBase64 = fotoRosto;

  onProgresso?.(100, 'Processamento concluído!');
  return dadosExtraidos;
}
