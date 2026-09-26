import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RotateCw, 
  Sparkles, 
  FileText, 
  User, 
  ShieldCheck, 
  VideoOff, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';
import { 
  executarOCRCompleto, 
  prepararImagemCanvas, 
  DadosDocumentoExtraidos, 
  validarCPF, 
  formatarCPF,
  validarRG,
  formatarRG
} from '../services/documentOcrService';

interface ModalLeitorDocumentoOCRProps {
  aberto: boolean;
  onFechar: () => void;
  onDadosConfirmados: (dados: {
    nomeCompleto: string;
    documento: string;
    tipoDocumento: string;
    fotoDocumentoBase64?: string;
    fotoRostoBase64?: string;
    empresa?: string;
  }) => void;
}

/**
 * Emite som nativo de sucesso via Web Audio API
 */
function emitirSomSucesso() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.11);
    gain2.gain.setValueAtTime(0.3, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.11);
    osc2.stop(now + 0.32);
  } catch (e) {}
}

export default function ModalLeitorDocumentoOCR({
  aberto,
  onFechar,
  onDadosConfirmados
}: ModalLeitorDocumentoOCRProps) {
  const [modo, setModo] = useState<'camera' | 'upload' | 'resultado'>('camera');
  const [streamAtivo, setStreamAtivo] = useState(false);
  const [carregandoOcr, setCarregandoOcr] = useState(false);
  const [progressoOcr, setProgressoOcr] = useState(0);
  const [statusTexto, setStatusTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  // Estados dos dados extraídos e conferência
  const [dadosOcr, setDadosOcr] = useState<DadosDocumentoExtraidos | null>(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [documentoEditado, setDocumentoEditado] = useState('');
  const [tipoDocEditado, setTipoDocEditado] = useState('CPF');
  const [fotoDocPreview, setFotoDocPreview] = useState<string | undefined>(undefined);
  const [fotoRostoPreview, setFotoRostoPreview] = useState<string | undefined>(undefined);
  const [rotacaoManual, setRotacaoManual] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (aberto && modo === 'camera') {
      iniciarCamera();
    } else {
      pararCamera();
    }

    return () => {
      pararCamera();
    };
  }, [aberto, modo]);

  const iniciarCamera = async () => {
    setErro(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      mediaStreamRef.current = stream;
      setStreamAtivo(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('[ModalOCR] Erro ao abrir câmera:', err);
      setStreamAtivo(false);
      setModo('upload');
      setErro('Acesso à câmera indisponível ou negado. Você pode enviar a foto do documento pelo botão abaixo.');
    }
  };

  const pararCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setStreamAtivo(false);
  };

  const capturarFotoDaCamera = async () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      pararCamera();
      await processarImagem(dataUrl);
    } catch (err: any) {
      setErro('Erro ao capturar frame da câmera: ' + err.message);
    }
  };

  const lidarComArquivoSelecionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;

    setErro(null);
    await processarImagem(file);
    e.target.value = '';
  };

  const processarImagem = async (arquivoOuDataUrl: File | Blob | string) => {
    setCarregandoOcr(true);
    setProgressoOcr(10);
    setStatusTexto('Iniciando análise do documento...');
    setErro(null);

    try {
      const resultado = await executarOCRCompleto(arquivoOuDataUrl, (perc, texto) => {
        setProgressoOcr(perc);
        setStatusTexto(texto);
      });

      setDadosOcr(resultado);
      setNomeEditado(resultado.nomeCompleto);
      setDocumentoEditado(resultado.documentoFormatado);
      setTipoDocEditado(resultado.tipoDocumento !== 'DESCONHECIDO' ? resultado.tipoDocumento : 'CPF');
      setFotoDocPreview(resultado.fotoDocumentoBase64);
      setFotoRostoPreview(resultado.fotoRostoBase64);

      setModo('resultado');
      emitirSomSucesso();
      if ('vibrate' in navigator) {
        try { navigator.vibrate([100, 50, 100]); } catch {}
      }
    } catch (err: any) {
      console.error('[ModalOCR] Erro no processamento:', err);
      setErro('Falha ao processar o documento: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setCarregandoOcr(false);
    }
  };

  const girarImagemEReprocessar = async () => {
    if (!fotoDocPreview) return;
    const novaRotacao = (rotacaoManual + 90) % 360;
    setRotacaoManual(novaRotacao);

    setCarregandoOcr(true);
    setStatusTexto('Girando documento em 90 graus...');
    try {
      const imgGirada = await prepararImagemCanvas(fotoDocPreview, 90, false);
      setFotoDocPreview(imgGirada.dataUrl);
      await processarImagem(imgGirada.dataUrl);
    } catch (err: any) {
      setErro('Erro ao girar imagem: ' + err.message);
      setCarregandoOcr(false);
    }
  };

  const handleConfirmar = () => {
    const docLimpo = documentoEditado.trim();
    const nomeLimpo = nomeEditado.trim();

    if (!docLimpo) {
      setErro('Por favor, informe o documento do prestador.');
      return;
    }

    onDadosConfirmados({
      nomeCompleto: nomeLimpo,
      documento: docLimpo,
      tipoDocumento: tipoDocEditado,
      fotoDocumentoBase64: fotoDocPreview,
      fotoRostoBase64: fotoRostoPreview,
      empresa: dadosOcr?.empresaSugerida
    });

    onFechar();
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                Leitura OCR de Documentos (RG / CPF / CNH)
              </h3>
              <p className="text-xs text-slate-400">
                Extração inteligente com filtro anti-números aleatórios e validação matemática.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="bg-red-950/60 border border-red-500/40 p-3 rounded-2xl text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-red-300">Atenção na Leitura:</strong>
              <p>{erro}</p>
            </div>
          </div>
        )}

        {/* Barra de Progresso do OCR */}
        {carregandoOcr && (
          <div className="bg-slate-950/90 border border-emerald-500/40 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                {statusTexto || 'Processando OCR do Documento...'}
              </span>
              <span className="font-mono text-emerald-300 font-bold">{progressoOcr}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.7)]"
                style={{ width: `${progressoOcr}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              Analisando algarismos, descartando datas e validando dígito verificador do CPF...
            </p>
          </div>
        )}

        {/* MODO 1: CÂMERA AO VIVO COM GUIA RETANGULAR */}
        {!carregandoOcr && modo === 'camera' && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center border-2 border-slate-700 shadow-inner">
              <video ref={videoRef} className="w-full h-full object-cover" />

              {/* Guia Retangular de Documento ID-1 (Proporção de CNH/RG/Cartão) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                <div className="w-full max-w-[340px] aspect-[1.586/1] border-2 border-emerald-400/90 rounded-2xl relative shadow-[0_0_25px_rgba(52,211,153,0.35)] flex flex-col justify-between p-3 bg-emerald-500/5">
                  <div className="flex justify-between items-center text-[10px] text-emerald-300 font-mono">
                    <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-500/40">
                      Enquadre o documento aqui
                    </span>
                    <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-500/40">
                      RG / CNH / CPF
                    </span>
                  </div>

                  <div className="h-0.5 bg-emerald-400/60 animate-pulse" />

                  <div className="text-[10px] text-emerald-300 text-center bg-slate-900/80 py-0.5 px-2 rounded border border-emerald-500/40 self-center">
                    Mantenha o documento bem iluminado e sem reflexos
                  </div>
                </div>
              </div>
            </div>

            {/* Ações da Câmera */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={capturarFotoDaCamera}
                className="py-4 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition uppercase cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                Capturar Foto
              </button>

              <button
                type="button"
                onClick={() => {
                  pararCamera();
                  setModo('upload');
                  fileInputRef.current?.click();
                }}
                className="py-4 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Galeria / Arquivo
              </button>
            </div>
          </div>
        )}

        {/* MODO 2: UPLOAD DE ARQUIVO */}
        {!carregandoOcr && modo === 'upload' && (
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/60 p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-200">Clique para selecionar foto do documento</h4>
                <p className="text-xs text-slate-400 mt-1">Formatos aceitos: JPG, PNG, WEBP (RG, CNH, CPF ou Crachá)</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setModo('camera');
                  iniciarCamera();
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Camera className="w-4 h-4" /> Voltar para a Câmera
              </button>
            </div>
          </div>
        )}

        {/* MODO 3: RESULTADO DA EXTRAÇÃO E CONFERÊNCIA RIGOROSA */}
        {!carregandoOcr && modo === 'resultado' && (
          <div className="space-y-4">
            {/* Card com as Fotos do Documento e Face Recortada */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
              {fotoDocPreview ? (
                <div className="relative w-28 h-20 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 flex-shrink-0 shadow-md">
                  <img src={fotoDocPreview} alt="Documento" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 text-[9px] bg-slate-900/90 text-emerald-400 px-1 py-0.5 rounded font-mono">
                    Doc
                  </span>
                </div>
              ) : (
                <div className="w-28 h-20 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center text-slate-600">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              {fotoRostoPreview && (
                <div className="relative w-16 h-20 bg-slate-900 rounded-xl overflow-hidden border border-emerald-500/40 flex-shrink-0 shadow-md">
                  <img src={fotoRostoPreview} alt="Face Recortada" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 text-[9px] bg-slate-900/90 text-emerald-400 px-1 py-0.5 rounded font-mono">
                    Face
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    tipoDocEditado === 'CNH' ? 'bg-purple-950 text-purple-300 border-purple-500/40' :
                    tipoDocEditado === 'RG' ? 'bg-blue-950 text-blue-300 border-blue-500/40' :
                    tipoDocEditado === 'CIN' ? 'bg-indigo-950 text-indigo-300 border-indigo-500/40' :
                    'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {tipoDocEditado} Detectado
                  </span>

                  {dadosOcr?.confianca ? (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Confiança: {dadosOcr.confianca}%
                    </span>
                  ) : null}
                </div>

                <p className="text-xs text-slate-300 truncate font-semibold">
                  {nomeEditado || 'Nome não reconhecido'}
                </p>

                <button
                  type="button"
                  onClick={girarImagemEReprocessar}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold pt-1 transition"
                >
                  <RotateCw className="w-3 h-3" /> Girar 90° e re-analisar
                </button>
              </div>
            </div>

            {/* Campos de Conferência e Ajuste Rápido */}
            <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                  <span>Nome Completo do Prestador *</span>
                  <span className="text-[10px] text-emerald-400 font-normal">Filtro de cabeçalhos oficiais ativo</span>
                </label>
                <input
                  type="text"
                  value={nomeEditado}
                  onChange={(e) => setNomeEditado(e.target.value)}
                  placeholder="Nome do profissional"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                  <span>Número do Documento (CPF / RG) *</span>
                  {validarCPF(documentoEditado) ? (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> CPF Válido (Módulo 11)
                    </span>
                  ) : validarRG(documentoEditado) ? (
                    <span className="text-[10px] text-blue-400 font-bold bg-blue-950/80 px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Registro Geral (RG)
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Verifique os dígitos
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={documentoEditado}
                  onChange={(e) => {
                    const val = e.target.value;
                    const limpo = val.replace(/\D/g, '');
                    if (limpo.length === 11 && validarCPF(limpo)) {
                      setDocumentoEditado(formatarCPF(limpo));
                    } else {
                      setDocumentoEditado(val);
                    }
                  }}
                  placeholder="000.000.000-00 ou RG"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white font-bold focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              {/* Informação sobre Proteção Anti-Números Aleatórios */}
              {dadosOcr?.numerosRejeitados && dadosOcr.numerosRejeitados.length > 0 && (
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    <strong>{dadosOcr.numerosRejeitados.length} número(s) descartado(s):</strong> datas e sequências inválidas foram ignoradas automaticamente.
                  </span>
                </div>
              )}

              {/* GUIA DE CALIBRAÇÃO E SELETOR DE LINHAS IDENTIFICADAS */}
              <div className="bg-slate-900/95 border border-slate-800 p-3 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-3.5 h-3.5" /> Calibração de Zonas do Documento
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    dadosOcr?.metodoUtilizado === 'IA_GEMINI'
                      ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                      : 'bg-blue-950 text-blue-300 border border-blue-500/40'
                  }`}>
                    {dadosOcr?.metodoUtilizado === 'IA_GEMINI' ? '✨ Motor IA Gemini' : '⚡ Motor Local'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="space-y-0.5">
                    <strong className="text-emerald-300 block uppercase font-mono">1. RG Tradicional</strong>
                    <p className="text-slate-400">Nome: abaixo de Expedição</p>
                    <p className="text-slate-400">Doc: campo REGISTRO GERAL</p>
                  </div>
                  <div className="space-y-0.5">
                    <strong className="text-purple-300 block uppercase font-mono">2. CNH Habilitação</strong>
                    <p className="text-slate-400">Nome: campo 1. NOME</p>
                    <p className="text-slate-400">Doc: campo CPF (11 dígitos)</p>
                  </div>
                  <div className="space-y-0.5">
                    <strong className="text-blue-300 block uppercase font-mono">3. Nova CIN / Crachá</strong>
                    <p className="text-slate-400">Nome: centro em destaque</p>
                    <p className="text-slate-400">Doc: CPF nacional unificado</p>
                  </div>
                </div>

                {/* Seletor rápido por toque em linhas identificadas */}
                {dadosOcr?.linhasDetectadas && dadosOcr.linhasDetectadas.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Toque em uma linha detectada para calibrar/preencher:
                    </span>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                      {dadosOcr.linhasDetectadas.map((linha, idx) => (
                        <div key={idx} className="bg-slate-950 p-1.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-300 truncate font-mono flex-1">{linha}</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setNomeEditado(linha)}
                              className="text-[9px] bg-slate-800 hover:bg-slate-700 text-emerald-300 px-1.5 py-0.5 rounded font-bold transition"
                              title="Usar como Nome"
                            >
                              Nome
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const limpo = linha.replace(/\D/g, '');
                                if (limpo.length === 11 && validarCPF(limpo)) {
                                  setDocumentoEditado(formatarCPF(limpo));
                                } else {
                                  setDocumentoEditado(linha);
                                }
                              }}
                              className="text-[9px] bg-slate-800 hover:bg-slate-700 text-blue-300 px-1.5 py-0.5 rounded font-bold transition"
                              title="Usar como Documento"
                            >
                              Doc
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setModo('camera');
                  iniciarCamera();
                }}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw className="w-4 h-4" /> Tirar Outra Foto
              </button>

              <button
                type="button"
                onClick={handleConfirmar}
                className="py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-lg active:scale-[0.98] uppercase cursor-pointer"
              >
                <Check className="w-4 h-4" /> Preencher Cadastro
              </button>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={lidarComArquivoSelecionado}
          className="hidden"
        />
      </div>
    </div>
  );
}
