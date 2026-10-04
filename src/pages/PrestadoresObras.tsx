import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';
import ModalLeitorDocumentoOCR from '../components/ModalLeitorDocumentoOCR';
import { registrarAtividade } from '../services/auditoriaService';
import { 
  HardHat, 
  UserCheck, 
  Building2, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  X, 
  Search, 
  Plus, 
  Camera, 
  Scan, 
  LogIn, 
  LogOut, 
  Phone, 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  FileText, 
  Database, 
  Calendar, 
  Eye, 
  Volume2, 
  VolumeX, 
  Shield, 
  ArrowRight, 
  UserPlus, 
  Car, 
  Tag, 
  Edit3,
  Users,
  Timer,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

export type PerfilAcesso = 'autorizado' | 'prestador_unidade' | 'prestador_condominio';
export type TipoValidade = 'hoje' | 'amanha' | '3_dias' | '7_dias' | '30_dias' | 'personalizado' | 'permanente';

interface PrestadoresObrasProps {
  usuarioLogado?: any;
}

export default function PrestadoresObras({ usuarioLogado }: PrestadoresObrasProps) {
  const idCondominio = usuarioLogado?.condominio_id || usuarioLogado?.condominio?.id;
  const operadorNome = usuarioLogado?.nome || usuarioLogado?.login || 'Operador da Portaria';

  // Abas principais
  const [abaAtiva, setAbaAtiva] = useState<'dentro' | 'cadastros' | 'historico' | 'sql'>('dentro');

  // Dados
  const [cadastros, setCadastros] = useState<any[]>([]);
  const [acessosAtivos, setAcessosAtivos] = useState<any[]>([]);
  const [historicoAcessos, setHistoricoAcessos] = useState<any[]>([]);
  const [moradores, setMoradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState<string>('todos');
  const [filtroValidade, setFiltroValidade] = useState<string>('todos');

  // Hora atual em tempo real para cálculo dos cronômetros regressivos
  const [tempoAtual, setTempoAtual] = useState(Date.now());
  const [alertaSonoroHabilitado, setAlertaSonoroHabilitado] = useState(true);

  // Modais
  const [modalNovoCadastro, setModalNovoCadastro] = useState(false);
  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalSaida, setModalSaida] = useState(false);
  const [modalProrrogar, setModalProrrogar] = useState(false);
  const [modalOcrAberto, setModalOcrAberto] = useState(false);
  const [modalVisualizarFoto, setModalVisualizarFoto] = useState<string | null>(null);
  const [itemSelecionado, setItemSelecionado] = useState<any | null>(null);
  const [copiadoSql, setCopiadoSql] = useState(false);

  // Formulário de Cadastro / Liberação
  const [perfilAcesso, setPerfilAcesso] = useState<PerfilAcesso>('autorizado');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [documento, setDocumento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('CPF');
  const [empresa, setEmpresa] = useState('');
  const [parentescoVinculo, setParentescoVinculo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [placaVeiculo, setPlacaVeiculo] = useState('');
  const [unidade, setUnidade] = useState('');
  const [bloco, setBloco] = useState('');
  const [moradorVinculadoId, setMoradorVinculadoId] = useState('');
  const [moradorVinculadoNome, setMoradorVinculadoNome] = useState('');
  const [moradorVinculadoTelefone, setMoradorVinculadoTelefone] = useState('');
  const [tipoServico, setTipoServico] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [fotoRosto, setFotoRosto] = useState('');
  const [fotoDocumento, setFotoDocumento] = useState('');
  const [tipoValidade, setTipoValidade] = useState<TipoValidade>('hoje');
  const [dataValidadeInicio, setDataValidadeInicio] = useState(new Date().toISOString().slice(0, 10));
  const [dataValidadeFim, setDataValidadeFim] = useState(new Date().toISOString().slice(0, 10));
  const [termoReutilizacao, setTermoReutilizacao] = useState('');
  const [sugestoesReutilizacao, setSugestoesReutilizacao] = useState<any[]>([]);

  // Formulário de Entrada
  const [tempoMaximoMinutos, setTempoMaximoMinutos] = useState<number>(240); // Padrão: 4 horas
  const [tempoMaximoCustomizado, setTempoMaximoCustomizado] = useState<string>('');
  const [crachaEntrada, setCrachaEntrada] = useState('');
  const [placaEntrada, setPlacaEntrada] = useState('');
  const [observacoesEntrada, setObservacoesEntrada] = useState('');
  const [alertaExpiracaoConfirmado, setAlertaExpiracaoConfirmado] = useState(false);

  // Formulário de Saída
  const [crachaDevolvido, setCrachaDevolvido] = useState(true);
  const [observacoesSaida, setObservacoesSaida] = useState('');

  // Formulário de Prorrogação
  const [minutosProrrogacao, setMinutosProrrogacao] = useState(60);

  // Web Audio para beeps quando há pessoas com permanência estourada
  const ultimoBeepRef = useRef<number>(0);

  // Atualiza relógio do cronômetro a cada 1 segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setTempoAtual(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Carrega dados iniciais
  useEffect(() => {
    if (idCondominio) {
      carregarTudo();
      carregarMoradores();
    }
  }, [idCondominio]);

  // Carrega moradores do condomínio para vínculo rápido
  const carregarMoradores = async () => {
    try {
      const { data } = await supabase
        .from('moradores')
        .select('id, nome, bloco, unidade, telefone')
        .eq('condominio_id', idCondominio)
        .order('unidade');
      if (data) setMoradores(data);
    } catch (e) {
      console.warn('Erro ao carregar moradores:', e);
    }
  };

  const carregarTudo = async () => {
    setLoading(true);
    try {
      // 1. Carrega todos os cadastros mestres de prestadores / autorizados
      const { data: dadosCadastros, error: erroCad } = await supabase
        .from('prestadores')
        .select('*')
        .eq('condominio_id', idCondominio)
        .order('created_at', { ascending: false });

      if (erroCad) throw erroCad;
      setCadastros(dadosCadastros || []);

      // 2. Tenta carregar acessos ativos (Dentro do Condomínio)
      // Primeiro tenta da tabela específica prestadores_acessos, senão usa status de prestadores
      let ativos: any[] = [];
      try {
        const { data: acessosDb, error: erroAcessos } = await supabase
          .from('prestadores_acessos')
          .select('*')
          .eq('condominio_id', idCondominio)
          .is('data_hora_saida', null)
          .order('data_hora_entrada', { ascending: false });

        if (!erroAcessos && acessosDb && acessosDb.length > 0) {
          ativos = acessosDb;
        } else {
          // Fallback para tabela prestadores com status_acesso = 'EM_ANDAMENTO' ou 'DENTRO'
          ativos = (dadosCadastros || []).filter((p: any) => 
            p.status_acesso === 'EM_ANDAMENTO' || p.status_acesso === 'DENTRO'
          ).map((p: any) => ({
            id: p.id,
            prestador_id: p.id,
            condominio_id: p.condominio_id,
            perfil_acesso: p.perfil_acesso || (p.atende_condominio ? 'prestador_condominio' : 'prestador_unidade'),
            nome_completo: p.nome_profissional || p.nome_completo,
            documento: p.documento,
            empresa: p.empresa,
            parentesco_vinculo: p.parentesco_vinculo,
            unidade: p.unidade,
            bloco: p.bloco,
            foto_rosto: p.foto_rosto,
            cracha: p.cracha_atribuido || p.cracha,
            placa_veiculo: p.placa_veiculo,
            data_hora_entrada: p.data_hora_entrada || p.created_at,
            tempo_maximo_minutos: p.tempo_maximo_minutos || 240,
            limite_permanencia_ate: p.limite_permanencia_ate || (
              p.data_hora_entrada ? new Date(new Date(p.data_hora_entrada).getTime() + (p.tempo_maximo_minutos || 240) * 60000).toISOString() : null
            ),
            operador_entrada_nome: p.operador_entrada_nome || 'Operador',
            status_acesso: 'DENTRO'
          }));
        }
      } catch {
        ativos = (dadosCadastros || []).filter((p: any) => 
          p.status_acesso === 'EM_ANDAMENTO' || p.status_acesso === 'DENTRO'
        );
      }
      setAcessosAtivos(ativos);

      // 3. Tenta carregar histórico recente de acessos concluídos
      try {
        const { data: histDb } = await supabase
          .from('prestadores_acessos')
          .select('*')
          .eq('condominio_id', idCondominio)
          .not('data_hora_saida', 'is', null)
          .order('data_hora_saida', { ascending: false })
          .limit(100);

        if (histDb) setHistoricoAcessos(histDb);
      } catch {}
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar dados: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Beep sonoro caso haja alguém com tempo estourado
  useEffect(() => {
    if (!alertaSonoroHabilitado || acessosAtivos.length === 0) return;

    const temAlguemEstourado = acessosAtivos.some((item) => {
      if (!item.limite_permanencia_ate) return false;
      return tempoAtual > new Date(item.limite_permanencia_ate).getTime();
    });

    if (temAlguemEstourado && Date.now() - ultimoBeepRef.current > 30000) {
      // Dispara sinal sonoro suave a cada 30 segundos
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(659, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          ultimoBeepRef.current = Date.now();
        }
      } catch {}
    }
  }, [tempoAtual, acessosAtivos, alertaSonoroHabilitado]);

  // Autocomplete / Busca rápida de histórico para reutilização de cadastro
  useEffect(() => {
    if (!termoReutilizacao || termoReutilizacao.trim().length < 2) {
      setSugestoesReutilizacao([]);
      return;
    }
    const termo = termoReutilizacao.toLowerCase();
    const filtrados = cadastros.filter((c: any) => 
      (c.nome_profissional || c.nome_completo || '').toLowerCase().includes(termo) ||
      (c.documento || '').replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
    ).slice(0, 5);
    setSugestoesReutilizacao(filtrados);
  }, [termoReutilizacao, cadastros]);

  // Preenche dados ao selecionar uma pessoa já cadastrada anteriormente
  const selecionarParaReutilizar = (item: any) => {
    setNomeCompleto(item.nome_profissional || item.nome_completo || '');
    setDocumento(item.documento || '');
    setTipoDocumento(item.tipo_documento || 'CPF');
    setEmpresa(item.empresa || '');
    setParentescoVinculo(item.parentesco_vinculo || '');
    setTelefone(item.telefone || '');
    setPlacaVeiculo(item.placa_veiculo || '');
    setFotoRosto(item.foto_rosto || '');
    setFotoDocumento(item.foto_documento || '');
    setTipoServico(item.tipo_servico || '');
    setObservacoes(item.observacoes || '');
    if (item.perfil_acesso) setPerfilAcesso(item.perfil_acesso as PerfilAcesso);
    if (item.unidade && item.unidade !== 'Condomínio') setUnidade(item.unidade);
    if (item.bloco && item.bloco !== 'Área Comum') setBloco(item.bloco);
    setSugestoesReutilizacao([]);
    setTermoReutilizacao('');
    setMensagem({ tipo: 'sucesso', texto: 'Dados do histórico recuperados com sucesso! Revise e confirme a liberação.' });
  };

  // OCR de Documentos: preenche campos automaticamente
  const handleOcrConfirmado = (dados: {
    nomeCompleto: string;
    documento: string;
    tipoDocumento: string;
    fotoDocumentoBase64?: string;
    fotoRostoBase64?: string;
    empresa?: string;
  }) => {
    setNomeCompleto(dados.nomeCompleto);
    setDocumento(dados.documento);
    setTipoDocumento(dados.tipoDocumento);
    if (dados.fotoDocumentoBase64) setFotoDocumento(dados.fotoDocumentoBase64);
    if (dados.fotoRostoBase64) setFotoRosto(dados.fotoRostoBase64);
    if (dados.empresa && !empresa) setEmpresa(dados.empresa);
    setModalOcrAberto(false);
    setMensagem({ tipo: 'sucesso', texto: 'Documento e foto do rosto extraídos com sucesso pelo OCR!' });
  };

  // Upload manual de foto do rosto
  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFotoRosto(reader.result as string);
      setMensagem({ tipo: 'sucesso', texto: 'Foto do rosto carregada!' });
    };
    reader.readAsDataURL(file);
  };

  // Helper: cálculo de datas de validade da liberação
  const calcularDatasValidade = (tipo: TipoValidade): { inicio: string; fim: string | null } => {
    const agora = new Date();
    const hojeStr = agora.toISOString().slice(0, 10);

    if (tipo === 'permanente') {
      return { inicio: hojeStr, fim: null };
    }

    if (tipo === 'hoje') {
      const fimHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);
      return { inicio: hojeStr, fim: fimHoje.toISOString() };
    }

    if (tipo === 'amanha') {
      const amanhaInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 0, 0, 0);
      const amanhaFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 23, 59, 59);
      return { inicio: amanhaInicio.toISOString(), fim: amanhaFim.toISOString() };
    }

    if (tipo === '3_dias') {
      const fim3 = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 3, 23, 59, 59);
      return { inicio: hojeStr, fim: fim3.toISOString() };
    }

    if (tipo === '7_dias') {
      const fim7 = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 7, 23, 59, 59);
      return { inicio: hojeStr, fim: fim7.toISOString() };
    }

    if (tipo === '30_dias') {
      const fim30 = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 30, 23, 59, 59);
      return { inicio: hojeStr, fim: fim30.toISOString() };
    }

    // personalizado
    return {
      inicio: dataValidadeInicio ? `${dataValidadeInicio}T00:00:00.000Z` : hojeStr,
      fim: dataValidadeFim ? `${dataValidadeFim}T23:59:59.999Z` : null
    };
  };

  // Validação de expiração da liberação
  const checarValidade = (item: any): { valido: boolean; expirou: boolean; texto: string; cor: string } => {
    if (item.tipo_validade === 'permanente' || !item.data_validade_fim) {
      return { valido: true, expirou: false, texto: 'Permanente (Sem Expiração)', cor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
    }

    const tFim = new Date(item.data_validade_fim).getTime();
    const dataFimFormatada = new Date(item.data_validade_fim).toLocaleDateString('pt-BR');

    if (Date.now() > tFim) {
      return {
        valido: false,
        expirou: true,
        texto: `Liberação expirada em ${dataFimFormatada}`,
        cor: 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      };
    }

    return {
      valido: true,
      expirou: false,
      texto: `Válido até ${dataFimFormatada}`,
      cor: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    };
  };

  // Cálculo do cronômetro de permanência interna
  const checarPermanencia = (item: any) => {
    if (!item.limite_permanencia_ate) {
      return {
        status: 'normal',
        minutosRestantes: 999,
        texto: 'Sem limite fixado',
        corFundo: 'bg-slate-900 border-slate-700',
        badge: 'bg-slate-800 text-slate-300',
        estourado: false
      };
    }

    const tLimite = new Date(item.limite_permanencia_ate).getTime();
    const diffMs = tLimite - tempoAtual;
    const estourado = diffMs <= 0;

    const absMs = Math.abs(diffMs);
    const horas = Math.floor(absMs / 3600000);
    const minutos = Math.floor((absMs % 3600000) / 60000);
    const segundos = Math.floor((absMs % 60000) / 1000);
    const formatado = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;

    if (estourado) {
      return {
        status: 'estourado',
        minutosRestantes: 0,
        texto: `ESTOURADO: +${formatado}`,
        corFundo: 'bg-red-950/60 border-red-500/70 shadow-lg shadow-red-950/50 animate-pulse',
        badge: 'bg-red-600 text-white font-black',
        estourado: true
      };
    }

    const minutosTotais = Math.floor(diffMs / 60000);
    if (minutosTotais < 15) {
      return {
        status: 'alerta',
        minutosRestantes: minutosTotais,
        texto: `Atenção: resta ${formatado}`,
        corFundo: 'bg-amber-950/40 border-amber-500/60',
        badge: 'bg-amber-500 text-slate-950 font-black',
        estourado: false
      };
    }

    return {
      status: 'normal',
      minutosRestantes: minutosTotais,
      texto: `Restante: ${formatado}`,
      corFundo: 'bg-slate-900 border-slate-800',
      badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      estourado: false
    };
  };

  // CADASTRO / LIBERAÇÃO (Pilar 1 e 2)
  const salvarCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem({ tipo: '', texto: '' });

    if (!nomeCompleto.trim()) {
      alert('O Nome Completo é obrigatório.');
      return;
    }

    if (perfilAcesso === 'autorizado' && !unidade.trim()) {
      alert('Para Autorizados (Visitantes/Família), informe a Unidade/Apartamento de destino.');
      return;
    }

    if (perfilAcesso === 'prestador_unidade' && (!documento.trim() || !unidade.trim())) {
      alert('Para Prestadores da Unidade, o Documento e a Unidade de destino são obrigatórios.');
      return;
    }

    if (perfilAcesso === 'prestador_condominio' && !documento.trim()) {
      alert('Para Prestadores do Condomínio, o Documento é obrigatório.');
      return;
    }

    setLoading(true);
    try {
      const datasValidade = calcularDatasValidade(tipoValidade);

      const payload: any = {
        condominio_id: idCondominio,
        perfil_acesso: perfilAcesso,
        nome_profissional: nomeCompleto.trim(),
        documento: documento.trim(),
        tipo_documento: tipoDocumento,
        empresa: perfilAcesso === 'autorizado' ? (parentescoVinculo || 'Visitante/Família') : empresa.trim(),
        parentesco_vinculo: parentescoVinculo.trim() || null,
        telefone: telefone.trim() || null,
        placa_veiculo: placaVeiculo.trim() || null,
        foto_rosto: fotoRosto || null,
        foto_documento: fotoDocumento || null,
        tipo_servico: tipoServico.trim() || (perfilAcesso === 'autorizado' ? 'Visita Familiar' : 'Prestação de Serviço'),
        atende_condominio: perfilAcesso === 'prestador_condominio',
        unidade: perfilAcesso === 'prestador_condominio' ? 'Condomínio' : unidade.trim(),
        bloco: perfilAcesso === 'prestador_condominio' ? 'Área Comum' : bloco.trim(),
        observacoes: observacoes.trim(),
        tipo_validade: tipoValidade,
        data_validade_inicio: datasValidade.inicio,
        data_validade_fim: datasValidade.fim,
        status_acesso: 'AUTORIZADO',
        operador_entrada_nome: operadorNome
      };

      const { data: inserido, error } = await supabase
        .from('prestadores')
        .insert([payload])
        .select()
        .single();

      if (error) {
        // Fallback gracioso caso alguma coluna nova ainda não esteja no banco
        console.warn('Erro ao salvar com colunas estendidas, tentando salvar registro base:', error.message);
        const payloadReduzido = {
          condominio_id: idCondominio,
          nome_profissional: nomeCompleto.trim(),
          empresa: empresa.trim() || parentescoVinculo || 'Geral',
          documento: documento.trim() || 'NÃO INFORMADO',
          tipo_documento: tipoDocumento,
          unidade: perfilAcesso === 'prestador_condominio' ? 'Condomínio' : unidade.trim(),
          bloco: perfilAcesso === 'prestador_condominio' ? 'Área Comum' : bloco.trim(),
          foto_rosto: fotoRosto || null,
          status_acesso: 'AUTORIZADO'
        };
        const retry = await supabase.from('prestadores').insert([payloadReduzido]);
        if (retry.error) throw retry.error;
      }

      // Registra no Histórico Absoluto
      await registrarAtividade({
        modulo: 'Prestadores',
        acao: 'CRIAR',
        descricao: `Cadastrou liberação para ${nomeCompleto.trim()} (${perfilNome(perfilAcesso)}) - Destino: ${payload.unidade} ${payload.bloco || ''}. Validade: ${tipoValidade}.`,
        detalhes: {
          nome: nomeCompleto.trim(),
          perfil: perfilAcesso,
          documento,
          unidade: payload.unidade,
          bloco: payload.bloco,
          tipoValidade,
          validadeFim: datasValidade.fim
        },
        operador_nome: operadorNome,
        condominio_id: idCondominio
      });

      setMensagem({ tipo: 'sucesso', texto: `Liberação de ${nomeCompleto} cadastrada com sucesso!` });
      fecharModalCadastro();
      await carregarTudo();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao cadastrar: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const fecharModalCadastro = () => {
    setModalNovoCadastro(false);
    setNomeCompleto('');
    setDocumento('');
    setTipoDocumento('CPF');
    setEmpresa('');
    setParentescoVinculo('');
    setTelefone('');
    setPlacaVeiculo('');
    setUnidade('');
    setBloco('');
    setTipoServico('');
    setObservacoes('');
    setFotoRosto('');
    setFotoDocumento('');
    setTipoValidade('hoje');
    setTermoReutilizacao('');
    setSugestoesReutilizacao([]);
  };

  // REGISTRO DE ENTRADA (Pilar 3)
  const abrirModalEntradaPara = (pessoa: any) => {
    setItemSelecionado(pessoa);
    setTempoMaximoMinutos(240); // 4 horas padrão
    setTempoMaximoCustomizado('');
    setCrachaEntrada(pessoa.cracha_atribuido || '');
    setPlacaEntrada(pessoa.placa_veiculo || '');
    setObservacoesEntrada('');
    setAlertaExpiracaoConfirmado(false);
    setModalEntrada(true);
  };

  const confirmarEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSelecionado) return;

    const statusValidade = checarValidade(itemSelecionado);
    if (statusValidade.expirou && !alertaExpiracaoConfirmado) {
      alert('Atenção: A liberação desta pessoa está expirada. Confirme com o morador ou marque a opção de renovação para prosseguir.');
      return;
    }

    setLoading(true);
    try {
      const minutosEfetivos = tempoMaximoCustomizado ? parseInt(tempoMaximoCustomizado, 10) || 240 : tempoMaximoMinutos;
      const agora = new Date();
      const limitePermanencia = new Date(agora.getTime() + minutosEfetivos * 60000).toISOString();

      // 1. Atualiza status no cadastro mestre
      await supabase
        .from('prestadores')
        .update({
          status_acesso: 'DENTRO',
          data_hora_entrada: agora.toISOString(),
          data_hora_saida: null,
          cracha_atribuido: crachaEntrada.trim() || null,
          tempo_maximo_minutos: minutosEfetivos,
          limite_permanencia_ate: limitePermanencia,
          operador_entrada_nome: operadorNome
        })
        .eq('id', itemSelecionado.id);

      // 2. Grava histórico na tabela prestadores_acessos se existir
      try {
        await supabase.from('prestadores_acessos').insert([{
          condominio_id: idCondominio,
          prestador_id: itemSelecionado.id,
          perfil_acesso: itemSelecionado.perfil_acesso || (itemSelecionado.atende_condominio ? 'prestador_condominio' : 'prestador_unidade'),
          nome_completo: itemSelecionado.nome_profissional || itemSelecionado.nome_completo,
          documento: itemSelecionado.documento,
          empresa: itemSelecionado.empresa,
          parentesco_vinculo: itemSelecionado.parentesco_vinculo,
          unidade: itemSelecionado.unidade,
          bloco: itemSelecionado.bloco,
          foto_rosto: itemSelecionado.foto_rosto,
          cracha: crachaEntrada.trim() || null,
          placa_veiculo: placaEntrada.trim() || itemSelecionado.placa_veiculo || null,
          data_hora_entrada: agora.toISOString(),
          tempo_maximo_minutos: minutosEfetivos,
          limite_permanencia_ate: limitePermanencia,
          status_acesso: 'DENTRO',
          operador_entrada_nome: operadorNome,
          observacoes: observacoesEntrada.trim() || null
        }]);
      } catch {}

      // 3. Auditoria no Histórico Absoluto
      await registrarAtividade({
        modulo: 'Prestadores',
        acao: 'ENTRADA',
        descricao: `Registrou ENTRADA de ${itemSelecionado.nome_profissional || itemSelecionado.nome_completo} para ${itemSelecionado.unidade} ${itemSelecionado.bloco || ''}. Tempo max: ${Math.floor(minutosEfetivos / 60)}h. Crachá: ${crachaEntrada || 'N/A'}.`,
        detalhes: {
          pessoaId: itemSelecionado.id,
          nome: itemSelecionado.nome_profissional || itemSelecionado.nome_completo,
          unidade: itemSelecionado.unidade,
          bloco: itemSelecionado.bloco,
          cracha: crachaEntrada,
          tempoMaximoMinutos: minutosEfetivos,
          limitePermanencia
        },
        operador_nome: operadorNome,
        condominio_id: idCondominio
      });

      setMensagem({ tipo: 'sucesso', texto: `Entrada de ${itemSelecionado.nome_profissional || itemSelecionado.nome_completo} registrada com sucesso!` });
      setModalEntrada(false);
      setAbaAtiva('dentro');
      await carregarTudo();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar entrada: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // REGISTRO DE SAÍDA (Pilar 3)
  const abrirModalSaidaPara = (item: any) => {
    setItemSelecionado(item);
    setCrachaDevolvido(true);
    setObservacoesSaida('');
    setModalSaida(true);
  };

  const confirmarSaida = async () => {
    if (!itemSelecionado) return;
    setLoading(true);

    try {
      const agora = new Date().toISOString();
      const targetId = itemSelecionado.prestador_id || itemSelecionado.id;

      // 1. Atualiza no cadastro mestre
      await supabase
        .from('prestadores')
        .update({
          status_acesso: 'AUTORIZADO',
          data_hora_saida: agora,
          operador_saida_nome: operadorNome
        })
        .eq('id', targetId);

      // 2. Atualiza registro de acesso
      try {
        await supabase
          .from('prestadores_acessos')
          .update({
            data_hora_saida: agora,
            status_acesso: 'CONCLUIDO',
            operador_saida_nome: operadorNome,
            observacoes: observacoesSaida.trim() || undefined
          })
          .eq('status_acesso', 'DENTRO')
          .eq('prestador_id', targetId);
      } catch {}

      // 3. Auditoria no Histórico Absoluto
      await registrarAtividade({
        modulo: 'Prestadores',
        acao: 'SAIDA',
        descricao: `Registrou SAÍDA de ${itemSelecionado.nome_completo || itemSelecionado.nome_profissional}. Crachá: ${crachaDevolvido ? 'Devolvido' : 'Pendente'}.`,
        detalhes: {
          nome: itemSelecionado.nome_completo || itemSelecionado.nome_profissional,
          cracha: itemSelecionado.cracha || itemSelecionado.cracha_atribuido,
          crachaDevolvido,
          horaSaida: agora
        },
        operador_nome: operadorNome,
        condominio_id: idCondominio
      });

      setMensagem({ tipo: 'sucesso', texto: `Saída de ${itemSelecionado.nome_completo || itemSelecionado.nome_profissional} registrada!` });
      setModalSaida(false);
      await carregarTudo();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar saída: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // PRORROGAR TEMPO DE PERMANÊNCIA (Pilar 3)
  const handleProrrogarTempo = async () => {
    if (!itemSelecionado) return;
    setLoading(true);

    try {
      const tAntigo = itemSelecionado.limite_permanencia_ate ? new Date(itemSelecionado.limite_permanencia_ate).getTime() : Date.now();
      const novoLimite = new Date(Math.max(Date.now(), tAntigo) + minutosProrrogacao * 60000).toISOString();
      const targetId = itemSelecionado.prestador_id || itemSelecionado.id;

      await supabase
        .from('prestadores')
        .update({ limite_permanencia_ate: novoLimite })
        .eq('id', targetId);

      try {
        await supabase
          .from('prestadores_acessos')
          .update({ limite_permanencia_ate: novoLimite })
          .eq('status_acesso', 'DENTRO')
          .eq('prestador_id', targetId);
      } catch {}

      await registrarAtividade({
        modulo: 'Prestadores',
        acao: 'EDITAR',
        descricao: `Prorrogou tempo de permanência de ${itemSelecionado.nome_completo || itemSelecionado.nome_profissional} em +${minutosProrrogacao} minutos.`,
        detalhes: { novoLimite, minutosAdicionados: minutosProrrogacao },
        operador_nome: operadorNome,
        condominio_id: idCondominio
      });

      setMensagem({ tipo: 'sucesso', texto: `Tempo prorrogado em +${minutosProrrogacao} minutos com sucesso!` });
      setModalProrrogar(false);
      await carregarTudo();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao prorrogar: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // DISPARO DE NOTIFICAÇÃO VIA WHATSAPP (Pilar 4)
  const dispararWhatsAppEntrada = (item: any) => {
    const nome = item.nome_profissional || item.nome_completo;
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const perfil = item.perfil_acesso || (item.atende_condominio ? 'prestador_condominio' : 'prestador_unidade');

    if (perfil === 'prestador_condominio') {
      // Notifica grupo de administração / síndico
      const telSindico = usuarioLogado?.condominio?.sindico_whatsapp?.replace(/\D/g, '') || '';
      const texto = `Aviso Portaria: O prestador *${nome}* da empresa *${item.empresa || 'Serviços'}* registrou *ENTRADA* para manutenção no condomínio às *${hora}*. Crachá: ${item.cracha || item.cracha_atribuido || 'N/A'}.`;
      const url = telSindico ? `https://wa.me/55${telSindico}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
      window.open(url, '_blank');
    } else {
      // Notifica o morador da unidade
      const moradorDestino = moradores.find((m: any) => 
        m.unidade?.toString().trim().toLowerCase() === item.unidade?.toString().trim().toLowerCase() &&
        (!item.bloco || m.bloco?.toString().trim().toLowerCase() === item.bloco?.toString().trim().toLowerCase())
      );
      const telMorador = moradorDestino?.telefone?.replace(/\D/g, '') || item.telefone?.replace(/\D/g, '') || '';
      const texto = `Olá! Informamos que *${nome}* acabou de registrar *ENTRADA* na portaria para a sua unidade (Apt ${item.unidade}${item.bloco ? ' Bloco ' + item.bloco : ''}) às *${hora}*.`;
      const url = telMorador ? `https://wa.me/55${telMorador}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
      window.open(url, '_blank');
    }
  };

  const dispararWhatsAppSaida = (item: any) => {
    const nome = item.nome_profissional || item.nome_completo;
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const perfil = item.perfil_acesso || (item.atende_condominio ? 'prestador_condominio' : 'prestador_unidade');

    if (perfil === 'prestador_condominio') {
      const telSindico = usuarioLogado?.condominio?.sindico_whatsapp?.replace(/\D/g, '') || '';
      const texto = `Aviso Portaria: O prestador *${nome}* da empresa *${item.empresa || 'Serviços'}* registrou *SAÍDA* do condomínio às *${hora}*.`;
      const url = telSindico ? `https://wa.me/55${telSindico}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
      window.open(url, '_blank');
    } else {
      const moradorDestino = moradores.find((m: any) => 
        m.unidade?.toString().trim().toLowerCase() === item.unidade?.toString().trim().toLowerCase() &&
        (!item.bloco || m.bloco?.toString().trim().toLowerCase() === item.bloco?.toString().trim().toLowerCase())
      );
      const telMorador = moradorDestino?.telefone?.replace(/\D/g, '') || item.telefone?.replace(/\D/g, '') || '';
      const texto = `Olá! Informamos que *${nome}* registrou *SAÍDA* na portaria às *${hora}*.`;
      const url = telMorador ? `https://wa.me/55${telMorador}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
      window.open(url, '_blank');
    }
  };

  // Helper visual para os 3 perfis
  const perfilNome = (p: string) => {
    switch (p) {
      case 'autorizado': return 'Visitante / Família';
      case 'prestador_unidade': return 'Prestador da Unidade';
      case 'prestador_condominio': return 'Prestador do Condomínio';
      default: return 'Prestador / Visitante';
    }
  };

  const perfilBadge = (p: string) => {
    switch (p) {
      case 'autorizado':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'prestador_unidade':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'prestador_condominio':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  // Filtros aplicados sobre cadastros
  const cadastrosFiltrados = useMemo(() => {
    return cadastros.filter((c: any) => {
      const nome = (c.nome_profissional || c.nome_completo || '').toLowerCase();
      const doc = (c.documento || '').toLowerCase();
      const emp = (c.empresa || '').toLowerCase();
      const uni = (c.unidade || '').toLowerCase();
      const buscaTermo = busca.toLowerCase();

      const bateBusca = !busca || nome.includes(buscaTermo) || doc.includes(buscaTermo) || emp.includes(buscaTermo) || uni.includes(buscaTermo);
      if (!bateBusca) return false;

      if (filtroPerfil !== 'todos' && c.perfil_acesso !== filtroPerfil) {
        return false;
      }

      if (filtroValidade !== 'todos') {
        const infoVal = checarValidade(c);
        if (filtroValidade === 'validos' && !infoVal.valido) return false;
        if (filtroValidade === 'vencidos' && !infoVal.expirou) return false;
        if (filtroValidade === 'permanentes' && c.tipo_validade !== 'permanente') return false;
      }

      return true;
    });
  }, [cadastros, busca, filtroPerfil, filtroValidade]);

  // Contagem de pessoas com tempo estourado
  const totalEstourados = useMemo(() => {
    return acessosAtivos.filter(a => checarPermanencia(a).estourado).length;
  }, [acessosAtivos, tempoAtual]);

  const copiarSqlSupabase = () => {
    const sql = `-- Script de Atualização Prestadores & Acessos
ALTER TABLE prestadores
  ADD COLUMN IF NOT EXISTS perfil_acesso TEXT DEFAULT 'prestador_unidade',
  ADD COLUMN IF NOT EXISTS parentesco_vinculo TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS placa_veiculo TEXT,
  ADD COLUMN IF NOT EXISTS tipo_validade TEXT DEFAULT 'hoje',
  ADD COLUMN IF NOT EXISTS data_validade_inicio TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_validade_fim TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tempo_maximo_minutos INTEGER DEFAULT 240,
  ADD COLUMN IF NOT EXISTS limite_permanencia_ate TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS operador_entrada_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_saida_nome TEXT;

CREATE TABLE IF NOT EXISTS prestadores_acessos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  prestador_id UUID REFERENCES prestadores(id) ON DELETE CASCADE,
  perfil_acesso TEXT NOT NULL,
  nome_completo TEXT NOT NULL,
  documento TEXT,
  empresa TEXT,
  parentesco_vinculo TEXT,
  unidade TEXT,
  bloco TEXT,
  foto_rosto TEXT,
  cracha TEXT,
  placa_veiculo TEXT,
  data_hora_entrada TIMESTAMPTZ DEFAULT NOW(),
  tempo_maximo_minutos INTEGER DEFAULT 240,
  limite_permanencia_ate TIMESTAMPTZ,
  data_hora_saida TIMESTAMPTZ,
  status_acesso TEXT DEFAULT 'DENTRO',
  operador_entrada_nome TEXT,
  operador_saida_nome TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

NOTIFY pgrst, 'reload schema';`;

    navigator.clipboard.writeText(sql);
    setCopiadoSql(true);
    setTimeout(() => setCopiadoSql(false), 3000);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      
      {/* CABEÇALHO PRINCIPAL DO MÓDULO */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shrink-0 shadow-inner">
            <HardHat className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                Controle de Prestadores & Obras
              </h2>
              {totalEstourados > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600 text-white animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> {totalEstourados} Estourado(s)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Gestão dos 3 Perfis de Acesso, Prazos de Validade, Alertas de Permanência e WhatsApp automático.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => setAlertaSonoroHabilitado(!alertaSonoroHabilitado)}
            className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              alertaSonoroHabilitado 
                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' 
                : 'bg-red-950/80 text-red-300 border-red-500/40 hover:bg-red-900'
            }`}
            title={alertaSonoroHabilitado ? 'Alertas sonoros ativados (clique para mutar)' : 'Alertas sonoros silenciados (clique para reativar)'}
          >
            {alertaSonoroHabilitado ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
            <span className="hidden sm:inline">{alertaSonoroHabilitado ? 'Som Ativo' : 'Som Mutado'}</span>
          </button>

          <button
            type="button"
            onClick={carregarTudo}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              fecharModalCadastro();
              setModalNovoCadastro(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs uppercase flex items-center gap-1.5 transition shadow-md active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nova Liberação / Cadastro</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK DE MENSAGEM */}
      {mensagem.texto && (
        <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between animate-in fade-in duration-150 ${
          mensagem.tipo === 'sucesso' 
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
            : 'bg-red-950/80 text-red-300 border-red-500/40'
        }`}>
          <div className="flex items-center gap-2">
            {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
            <span>{mensagem.texto}</span>
          </div>
          <button onClick={() => setMensagem({ tipo: '', texto: '' })} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* NAVEGAÇÃO DE ABAS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setAbaAtiva('dentro')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
            abaAtiva === 'dentro'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-850 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Timer className="w-4 h-4" />
          <span>Dentro do Condomínio</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            totalEstourados > 0 
              ? 'bg-red-600 text-white animate-pulse' 
              : abaAtiva === 'dentro' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
          }`}>
            {acessosAtivos.length}
          </span>
        </button>

        <button
          onClick={() => setAbaAtiva('cadastros')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
            abaAtiva === 'cadastros'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-850 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Liberações & Cadastros</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900/60 text-slate-300">
            {cadastros.length}
          </span>
        </button>

        <button
          onClick={() => setAbaAtiva('historico')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
            abaAtiva === 'historico'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-850 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Histórico de Entradas & Saídas</span>
        </button>

        <button
          onClick={() => setAbaAtiva('sql')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
            abaAtiva === 'sql'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-850 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Script SQL Supabase</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: DENTRO DO CONDOMÍNIO (Pessoas Presentes e Cronômetro de Permanência) */}
      {/* ========================================================================= */}
      {abaAtiva === 'dentro' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>Pessoas atualmente no condomínio: <strong className="text-white">{acessosAtivos.length}</strong></span>
            </div>
            {totalEstourados > 0 && (
              <span className="text-red-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {totalEstourados} estouraram o limite de permanência!
              </span>
            )}
          </div>

          {acessosAtivos.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-300">Nenhum prestador ou visitante no momento</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Quando alguém registrar entrada na portaria, o card com cronômetro regressivo de permanência aparecerá aqui em tempo real.
              </p>
              <button
                type="button"
                onClick={() => setAbaAtiva('cadastros')}
                className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition inline-flex items-center gap-1.5"
              >
                <span>Ver Lista de Liberações para Dar Entrada</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {acessosAtivos.map((item) => {
                const infoPermanencia = checarPermanencia(item);
                const perfil = item.perfil_acesso || (item.atende_condominio ? 'prestador_condominio' : 'prestador_unidade');
                const horaEntradaFmt = item.data_hora_entrada ? new Date(item.data_hora_entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

                return (
                  <div
                    key={item.id}
                    className={`rounded-3xl p-4 border transition duration-200 flex flex-col justify-between gap-3 text-white ${infoPermanencia.corFundo}`}
                  >
                    <div className="space-y-3">
                      {/* Topo do Card */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3">
                          {/* Foto do Rosto */}
                          <div 
                            onClick={() => item.foto_rosto && setModalVisualizarFoto(item.foto_rosto)}
                            className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-700 overflow-hidden shrink-0 cursor-pointer flex items-center justify-center text-slate-500 relative group"
                          >
                            {item.foto_rosto ? (
                              <img src={item.foto_rosto} alt={item.nome_completo} className="w-full h-full object-cover group-hover:scale-105 transition" />
                            ) : (
                              <UserCheck className="w-7 h-7" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${perfilBadge(perfil)}`}>
                              {perfilNome(perfil)}
                            </span>
                            <h4 className="font-extrabold text-sm text-white truncate mt-1">
                              {item.nome_completo || item.nome_profissional}
                            </h4>
                            <p className="text-[11px] text-slate-300 truncate">
                              {item.empresa || item.parentesco_vinculo || 'Autônomo'}
                            </p>
                          </div>
                        </div>

                        {/* Crachá */}
                        {item.cracha && (
                          <span className="px-2 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-black shrink-0">
                            Crachá {item.cracha}
                          </span>
                        )}
                      </div>

                      {/* Informações de Local e Entrada */}
                      <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Destino:</span>
                          <span className="font-bold text-white">
                            {perfil === 'prestador_condominio' ? 'Área Comum / Condomínio' : `Apto ${item.unidade} ${item.bloco ? 'Bloco ' + item.bloco : ''}`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Entrada registrada:</span>
                          <span className="font-mono text-emerald-400 font-bold">{horaEntradaFmt} ({item.operador_entrada_nome || 'Operador'})</span>
                        </div>
                        {item.placa_veiculo && (
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-400">Veículo:</span>
                            <span className="font-mono text-slate-200 uppercase font-bold flex items-center gap-1">
                              <Car className="w-3 h-3 text-slate-400" /> {item.placa_veiculo}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* CRONÔMETRO REGRESSIVO DE PERMANÊNCIA (Pilar 3) */}
                      <div className={`p-3 rounded-2xl border text-center space-y-1 ${
                        infoPermanencia.estourado 
                          ? 'bg-red-950/80 border-red-500 text-red-200' 
                          : infoPermanencia.status === 'alerta'
                          ? 'bg-amber-950/60 border-amber-500/70 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}>
                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-black uppercase">
                          <Timer className={`w-3.5 h-3.5 ${infoPermanencia.estourado ? 'animate-bounce text-red-400' : 'text-amber-400'}`} />
                          <span>{infoPermanencia.estourado ? 'Tempo Esgotado' : 'Permanência Interna'}</span>
                        </div>
                        <div className="font-mono text-base font-black tracking-wider">
                          {infoPermanencia.texto}
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação Rápida */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Botão Registrar Saída */}
                        <button
                          type="button"
                          onClick={() => abrirModalSaidaPara(item)}
                          className="bg-red-600 hover:bg-red-700 text-white font-black py-2 px-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1 transition shadow-md active:scale-95 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Dar Saída</span>
                        </button>

                        {/* Botão Notificar WhatsApp */}
                        <button
                          type="button"
                          onClick={() => dispararWhatsAppEntrada(item)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition shadow-md active:scale-95 cursor-pointer"
                          title="Enviar aviso de entrada/presença via WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>

                      {/* Botão Prorrogar Tempo de Permanência */}
                      <button
                        type="button"
                        onClick={() => {
                          setItemSelecionado(item);
                          setMinutosProrrogacao(60);
                          setModalProrrogar(true);
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition border border-slate-700 cursor-pointer"
                      >
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Prorrogar Tempo (+1h / +2h)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: LIBERAÇÕES & CADASTROS MESTRES (Cadastrados com Janela de Validade) */}
      {/* ========================================================================= */}
      {abaAtiva === 'cadastros' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Campo de Busca Livre */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Buscar Cadastrado
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome, documento, apto, empresa..."
                    className="w-full bg-slate-950 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Filtro por Perfil */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Filtrar por Perfil
                </label>
                <select
                  value={filtroPerfil}
                  onChange={(e) => setFiltroPerfil(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="todos">Todos os Perfis (3 Categorias)</option>
                  <option value="autorizado">🟣 1. Autorizados (Visitantes / Família)</option>
                  <option value="prestador_unidade">🔵 2. Prestadores da Unidade</option>
                  <option value="prestador_condominio">🟠 3. Prestadores do Condomínio</option>
                </select>
              </div>

              {/* Filtro por Validade */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Status da Validade
                </label>
                <select
                  value={filtroValidade}
                  onChange={(e) => setFiltroValidade(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="todos">Todas as Validades</option>
                  <option value="validos">🟢 Liberações Válidas</option>
                  <option value="vencidos">⚠️ Liberações Expiradas (Aviso Amarelo)</option>
                  <option value="permanentes">♾️ Permanentes / Recorrentes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lista de Cadastros */}
          {cadastrosFiltrados.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Users className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">Nenhum cadastro encontrado</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Não há pessoas cadastradas para os filtros aplicados. Clique em "Nova Liberação / Cadastro" acima para adicionar.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cadastrosFiltrados.map((item) => {
                const perfil = item.perfil_acesso || (item.atende_condominio ? 'prestador_condominio' : 'prestador_unidade');
                const infoValidade = checarValidade(item);
                const jaEstaDentro = acessosAtivos.some((a: any) => (a.prestador_id || a.id) === item.id);

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-900 hover:bg-slate-850 p-3.5 sm:p-4 rounded-2xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md ${
                      infoValidade.expirou ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      {/* Foto */}
                      <div
                        onClick={() => item.foto_rosto && setModalVisualizarFoto(item.foto_rosto)}
                        className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 cursor-pointer"
                      >
                        {item.foto_rosto ? (
                          <img src={item.foto_rosto} alt={item.nome_profissional} className="w-full h-full object-cover" />
                        ) : (
                          <UserCheck className="w-6 h-6" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${perfilBadge(perfil)}`}>
                            {perfilNome(perfil)}
                          </span>

                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${infoValidade.cor}`}>
                            {infoValidade.texto}
                          </span>

                          {jaEstaDentro && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-emerald-500 text-slate-950">
                              Dentro Agora
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-sm text-white truncate">
                          {item.nome_profissional || item.nome_completo}
                        </h4>

                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          {item.documento && (
                            <span>Doc: <strong className="text-slate-300 font-mono">{item.documento}</strong></span>
                          )}
                          {item.empresa && (
                            <span>Empresa: <strong className="text-slate-300">{item.empresa}</strong></span>
                          )}
                          {item.parentesco_vinculo && (
                            <span>Vínculo: <strong className="text-purple-300">{item.parentesco_vinculo}</strong></span>
                          )}
                          <span>
                            Destino: <strong className="text-amber-300">
                              {perfil === 'prestador_condominio' ? 'Área Comum' : `Apt ${item.unidade} ${item.bloco ? 'Bloco ' + item.bloco : ''}`}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {jaEstaDentro ? (
                        <button
                          type="button"
                          onClick={() => {
                            const ativo = acessosAtivos.find(a => (a.prestador_id || a.id) === item.id);
                            abrirModalSaidaPara(ativo || item);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white font-black px-3.5 py-2 rounded-xl text-xs uppercase flex items-center gap-1.5 transition shadow-md active:scale-95 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Dar Saída</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => abrirModalEntradaPara(item)}
                          className={`font-black px-3.5 py-2 rounded-xl text-xs uppercase flex items-center gap-1.5 transition shadow-md active:scale-95 cursor-pointer ${
                            infoValidade.expirou
                              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                              : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                          }`}
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>{infoValidade.expirou ? 'Entrada (Expirado)' : 'Registrar Entrada'}</span>
                        </button>
                      )}

                      {/* Notificar WhatsApp */}
                      <button
                        type="button"
                        onClick={() => dispararWhatsAppEntrada(item)}
                        className="bg-slate-800 hover:bg-slate-700 text-emerald-400 p-2 rounded-xl border border-slate-700 transition cursor-pointer"
                        title="Notificar Morador / Síndico via WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: HISTÓRICO DE ACESSOS (Entradas e Saídas Concluídas) */}
      {/* ========================================================================= */}
      {abaAtiva === 'historico' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <span>Últimos acessos auditados e concluídos na guarita</span>
            <span className="font-bold text-white">{historicoAcessos.length} registro(s)</span>
          </div>

          {historicoAcessos.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-2">
              <Clock className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">Nenhum acesso concluído no histórico recente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historicoAcessos.map((h: any) => {
                const entradaFmt = h.data_hora_entrada ? new Date(h.data_hora_entrada).toLocaleString('pt-BR') : '--';
                const saidaFmt = h.data_hora_saida ? new Date(h.data_hora_saida).toLocaleString('pt-BR') : '--';

                return (
                  <div
                    key={h.id}
                    className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${perfilBadge(h.perfil_acesso)}`}>
                          {perfilNome(h.perfil_acesso)}
                        </span>
                        <strong className="text-white text-sm">{h.nome_completo}</strong>
                        {h.cracha && <span className="font-mono text-amber-300">Crachá {h.cracha}</span>}
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Destino: <strong className="text-slate-200">Apt {h.unidade} {h.bloco || ''}</strong> • Empresa/Vínculo: {h.empresa || h.parentesco_vinculo || 'Geral'}
                      </p>
                    </div>

                    <div className="text-[11px] font-mono space-y-0.5 text-right self-end sm:self-center">
                      <p className="text-emerald-400">Entrada: {entradaFmt} ({h.operador_entrada_nome || 'Op'})</p>
                      <p className="text-red-400">Saída: {saidaFmt} ({h.operador_saida_nome || 'Op'})</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: SCRIPT SQL PARA ATUALIZAR O SUPABASE */}
      {/* ========================================================================= */}
      {abaAtiva === 'sql' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-white uppercase flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                Script SQL para Atualização do Supabase
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Execute o comando abaixo no <strong>SQL Editor</strong> do painel Supabase para criar as novas colunas de perfis, validades e auditoria de permanência.
              </p>
            </div>

            <button
              type="button"
              onClick={copiarSqlSupabase}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              {copiadoSql ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiadoSql ? 'Copiado para Área de Transferência!' : 'Copiar Script SQL'}</span>
            </button>
          </div>

          <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-indigo-300 font-mono text-xs overflow-x-auto max-h-96 leading-relaxed select-all">
{`-- INFPORT 1.0 - ATUALIZAÇÃO DO MÓDULO DE PRESTADORES, AUTORIZADOS & OBRAS
BEGIN;

ALTER TABLE prestadores
  ADD COLUMN IF NOT EXISTS perfil_acesso TEXT DEFAULT 'prestador_unidade',
  ADD COLUMN IF NOT EXISTS parentesco_vinculo TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS placa_veiculo TEXT,
  ADD COLUMN IF NOT EXISTS tipo_validade TEXT DEFAULT 'hoje',
  ADD COLUMN IF NOT EXISTS data_validade_inicio TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_validade_fim TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tempo_maximo_minutos INTEGER DEFAULT 240,
  ADD COLUMN IF NOT EXISTS limite_permanencia_ate TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS operador_entrada_nome TEXT,
  ADD COLUMN IF NOT EXISTS operador_saida_nome TEXT;

CREATE TABLE IF NOT EXISTS prestadores_acessos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  prestador_id UUID REFERENCES prestadores(id) ON DELETE CASCADE,
  perfil_acesso TEXT NOT NULL,
  nome_completo TEXT NOT NULL,
  documento TEXT,
  empresa TEXT,
  parentesco_vinculo TEXT,
  unidade TEXT,
  bloco TEXT,
  foto_rosto TEXT,
  cracha TEXT,
  placa_veiculo TEXT,
  data_hora_entrada TIMESTAMPTZ DEFAULT NOW(),
  tempo_maximo_minutos INTEGER DEFAULT 240,
  limite_permanencia_ate TIMESTAMPTZ,
  data_hora_saida TIMESTAMPTZ,
  status_acesso TEXT DEFAULT 'DENTRO',
  operador_entrada_nome TEXT,
  operador_saida_nome TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

NOTIFY pgrst, 'reload schema';

COMMIT;`}
          </pre>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: NOVO CADASTRO / LIBERAÇÃO (Pilar 1 e 2) */}
      {/* ========================================================================= */}
      {modalNovoCadastro && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 text-white space-y-5 shadow-2xl relative my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white uppercase">
                    Nova Liberação de Acesso
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cadastre a autorização para familiares, prestadores de apto ou condomínio
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fecharModalCadastro}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SELEÇÃO DOS 3 PERFIS DE ACESSO (Pilar 1) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase text-amber-400">
                1. Selecione a Categoria de Acesso:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPerfilAcesso('autorizado')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    perfilAcesso === 'autorizado'
                      ? 'bg-purple-600/30 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <strong className="block text-xs text-purple-300">1. Autorizados</strong>
                  <span className="text-[11px] block mt-0.5 text-slate-300">Visitantes / Família</span>
                  <span className="text-[10px] block text-slate-400 mt-1">Mães, pais, amigos, entregadores</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPerfilAcesso('prestador_unidade')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    perfilAcesso === 'prestador_unidade'
                      ? 'bg-blue-600/30 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <strong className="block text-xs text-blue-300">2. Prestador Unidade</strong>
                  <span className="text-[11px] block mt-0.5 text-slate-300">Obras e Reformas</span>
                  <span className="text-[10px] block text-slate-400 mt-1">Eletricista, pintor, faxina</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPerfilAcesso('prestador_condominio')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    perfilAcesso === 'prestador_condominio'
                      ? 'bg-amber-600/30 border-amber-500 text-white shadow-lg shadow-amber-600/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <strong className="block text-xs text-amber-300">3. Condomínio</strong>
                  <span className="text-[11px] block mt-0.5 text-slate-300">Manutenção Predial</span>
                  <span className="text-[10px] block text-slate-400 mt-1">Elevador, portão, jardim</span>
                </button>
              </div>
            </div>

            {/* REUTILIZAÇÃO RÁPIDA DE CADASTRO (Pilar 5) */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 relative">
              <label className="block text-[11px] font-black uppercase text-indigo-400 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> Reutilizar Cadastro Anterior (Busca Rápida por Nome ou CPF/RG)
              </label>
              <input
                type="text"
                value={termoReutilizacao}
                onChange={(e) => setTermoReutilizacao(e.target.value)}
                placeholder="Comece a digitar para puxar dados de quem já visitou antes..."
                className="w-full bg-slate-900 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
              />
              {sugestoesReutilizacao.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-700 rounded-2xl mt-1 shadow-2xl z-30 overflow-hidden divide-y divide-slate-800">
                  {sugestoesReutilizacao.map((sug) => (
                    <div
                      key={sug.id}
                      onClick={() => selecionarParaReutilizar(sug)}
                      className="p-2.5 hover:bg-indigo-950/60 cursor-pointer flex items-center justify-between text-xs transition"
                    >
                      <div className="flex items-center gap-2">
                        {sug.foto_rosto ? (
                          <img src={sug.foto_rosto} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                            <UserCheck className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <strong className="block text-white">{sug.nome_profissional || sug.nome_completo}</strong>
                          <span className="text-[10px] text-slate-400">Doc: {sug.documento || 'N/A'} • {sug.empresa || sug.unidade}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-400">Reutilizar Dados →</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FORMULÁRIO COMPLETO */}
            <form onSubmit={salvarCadastro} className="space-y-4">
              {/* Linha 1: Nome e OCR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Nome Completo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    placeholder="Nome completo do visitante ou prestador"
                    className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">
                    Leitor Inteligente OCR
                  </label>
                  <button
                    type="button"
                    onClick={() => setModalOcrAberto(true)}
                    className="w-full bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold text-xs p-2.5 rounded-xl border border-indigo-500/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Scan className="w-4 h-4 text-indigo-400" />
                    <span>Ler Documento / CNH</span>
                  </button>
                </div>
              </div>

              {/* Linha 2: Documentos e Empresa / Parentesco */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {perfilAcesso !== 'autorizado' && (
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                      Documento (RG / CPF) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={documento}
                      onChange={(e) => setDocumento(e.target.value)}
                      placeholder="Número do documento"
                      className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                )}

                {perfilAcesso === 'autorizado' ? (
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                      Parentesco / Vínculo
                    </label>
                    <input
                      type="text"
                      value={parentescoVinculo}
                      onChange={(e) => setParentescoVinculo(e.target.value)}
                      placeholder="Ex: Mãe, Irmão, Amigo, Namorada"
                      className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                      Empresa / Autônomo <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      placeholder="Ex: Pintor Autônomo, Elevadores Atlas"
                      className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Telefone WhatsApp
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Placa do Veículo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={placaVeiculo}
                    onChange={(e) => setPlacaVeiculo(e.target.value)}
                    placeholder="ABC-1234"
                    className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 font-mono uppercase"
                  />
                </div>
              </div>

              {/* Linha 3: Destino (Unidade / Bloco) */}
              {perfilAcesso !== 'prestador_condominio' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                      Apartamento / Unidade de Destino <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={unidade}
                      onChange={(e) => setUnidade(e.target.value)}
                      placeholder="Ex: 102"
                      className="w-full bg-slate-900 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                      Bloco (se houver)
                    </label>
                    <input
                      type="text"
                      value={bloco}
                      onChange={(e) => setBloco(e.target.value)}
                      placeholder="Ex: Bloco A"
                      className="w-full bg-slate-900 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* FOTO DO ROSTO (Obrigatória em todos os 3 perfis) */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <label className="block text-xs font-black uppercase text-emerald-400 flex items-center justify-between">
                  <span>Foto do Rosto (Obrigatória para Segurança)</span>
                  {fotoRosto && <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-bold"><CheckCircle2 className="w-3 h-3" /> Foto anexada</span>}
                </label>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-slate-500">
                    {fotoRosto ? (
                      <img src={fotoRosto} alt="Foto Rosto" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-2 rounded-xl border border-slate-700 inline-flex items-center gap-1.5 transition cursor-pointer">
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{fotoRosto ? 'Trocar Foto do Rosto' : 'Tirar Foto com Câmera ou Carregar'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleFotoUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Use a webcam da portaria, tire com o celular ou faça upload de imagem nítida do rosto.
                    </p>
                  </div>
                </div>
              </div>

              {/* PRAZO DE VALIDADE DA LIBERAÇÃO (Pilar 2) */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                <label className="block text-xs font-black uppercase text-amber-400">
                  2. Prazo de Validade da Liberação (Janela de Acesso):
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoValidade('hoje')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      tipoValidade === 'hoje'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Hoje (1 Dia)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoValidade('amanha')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      tipoValidade === 'amanha'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Amanhã
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoValidade('7_dias')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      tipoValidade === '7_dias'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    1 Semana (7d)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoValidade('permanente')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      tipoValidade === 'permanente'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Permanente ♾️
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTipoValidade('personalizado')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      tipoValidade === 'personalizado' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Data Personalizada...
                  </button>

                  {tipoValidade === 'personalizado' && (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="date"
                        value={dataValidadeInicio}
                        onChange={(e) => setDataValidadeInicio(e.target.value)}
                        className="bg-slate-900 text-white text-xs p-1.5 rounded-lg border border-slate-700"
                      />
                      <span className="text-xs text-slate-400">até</span>
                      <input
                        type="date"
                        value={dataValidadeFim}
                        onChange={(e) => setDataValidadeFim(e.target.value)}
                        className="bg-slate-900 text-white text-xs p-1.5 rounded-lg border border-slate-700"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={fecharModalCadastro}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs uppercase transition shadow-lg active:scale-95 cursor-pointer disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {loading ? 'Salvando...' : 'Salvar Liberação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTRO DE ENTRADA & TEMPO MÁXIMO DE PERMANÊNCIA (Pilar 3) */}
      {/* ========================================================================= */}
      {modalEntrada && itemSelecionado && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 text-white space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white uppercase">
                    Registrar Entrada no Condomínio
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defina o tempo máximo de permanência e crachá
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalEntrada(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo da Pessoa */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 border border-slate-700">
                {itemSelecionado.foto_rosto ? (
                  <img src={itemSelecionado.foto_rosto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserCheck className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-white text-sm truncate">
                  {itemSelecionado.nome_profissional || itemSelecionado.nome_completo}
                </h4>
                <p className="text-xs text-slate-300">
                  {itemSelecionado.empresa || itemSelecionado.parentesco_vinculo || 'Visitante'} • Destino: <strong>Apt {itemSelecionado.unidade} {itemSelecionado.bloco || ''}</strong>
                </p>
              </div>
            </div>

            {/* AVISO DE EXPIRAÇÃO (Pilar 2) */}
            {(() => {
              const infoVal = checarValidade(itemSelecionado);
              if (infoVal.expirou) {
                return (
                  <div className="bg-amber-950/70 border-2 border-amber-500 p-4 rounded-2xl space-y-2 text-xs text-amber-200 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 font-black text-amber-300 text-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <span>{infoVal.texto}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Esta autorização venceu. Ligue por interfone para o morador para confirmar se autoriza a renovação de entrada hoje.
                    </p>
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alertaExpiracaoConfirmado}
                        onChange={(e) => setAlertaExpiracaoConfirmado(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500"
                      />
                      <span className="font-bold text-white text-xs">
                        Morador confirmou liberação por interfone (Renovar para Hoje)
                      </span>
                    </label>
                  </div>
                );
              }
              return null;
            })()}

            {/* DEFINIÇÃO DO TEMPO MÁXIMO DE PERMANÊNCIA (Pilar 3) */}
            <form onSubmit={confirmarEntrada} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-amber-400 flex items-center justify-between">
                  <span>Tempo Máximo de Permanência Interna:</span>
                  <span className="text-slate-400 font-normal">
                    {tempoMaximoCustomizado ? `${tempoMaximoCustomizado} min` : `${Math.floor(tempoMaximoMinutos / 60)}h`}
                  </span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => { setTempoMaximoMinutos(60); setTempoMaximoCustomizado(''); }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      tempoMaximoMinutos === 60 && !tempoMaximoCustomizado
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    1 Hora
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTempoMaximoMinutos(120); setTempoMaximoCustomizado(''); }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      tempoMaximoMinutos === 120 && !tempoMaximoCustomizado
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    2 Horas
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTempoMaximoMinutos(240); setTempoMaximoCustomizado(''); }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      tempoMaximoMinutos === 240 && !tempoMaximoCustomizado
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    4 Horas (Meio Turno)
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTempoMaximoMinutos(480); setTempoMaximoCustomizado(''); }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      tempoMaximoMinutos === 480 && !tempoMaximoCustomizado
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    8 Horas (Comercial)
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400">Ou digite tempo em minutos:</span>
                  <input
                    type="number"
                    value={tempoMaximoCustomizado}
                    onChange={(e) => setTempoMaximoCustomizado(e.target.value)}
                    placeholder="Ex: 90"
                    className="w-24 bg-slate-950 text-white text-xs p-1.5 rounded-lg border border-slate-700"
                  />
                </div>
              </div>

              {/* CONTROLE DE CRACHÁ & VEÍCULO (Pilar 5) */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-400" /> Número do Crachá Entregue
                  </label>
                  <input
                    type="text"
                    value={crachaEntrada}
                    onChange={(e) => setCrachaEntrada(e.target.value)}
                    placeholder="Ex: #12"
                    className="w-full bg-slate-900 text-white font-mono font-bold text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1 flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-emerald-400" /> Placa do Veículo
                  </label>
                  <input
                    type="text"
                    value={placaEntrada}
                    onChange={(e) => setPlacaEntrada(e.target.value)}
                    placeholder="ABC-1234"
                    className="w-full bg-slate-900 text-white font-mono uppercase text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => dispararWhatsAppEntrada(itemSelecionado)}
                  className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-emerald-500/40 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Notificar WhatsApp</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalEntrada(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3.5 py-2.5 rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase transition shadow-lg active:scale-95 cursor-pointer disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {loading ? 'Registrando...' : 'Confirmar Entrada'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REGISTRO DE SAÍDA E DEVOLUÇÃO DE CRACHÁ */}
      {/* ========================================================================= */}
      {modalSaida && itemSelecionado && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-base uppercase text-white flex items-center gap-2">
                <LogOut className="w-5 h-5 text-red-500" />
                Registrar Saída do Condomínio
              </h3>
              <button onClick={() => setModalSaida(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
              <strong className="block text-white text-sm">
                {itemSelecionado.nome_completo || itemSelecionado.nome_profissional}
              </strong>
              <p className="text-xs text-slate-400">
                Destino: Apt {itemSelecionado.unidade} {itemSelecionado.bloco || ''}
              </p>
              {itemSelecionado.cracha && (
                <p className="text-xs text-amber-300 font-mono font-bold pt-1">
                  Crachá entregue na entrada: #{itemSelecionado.cracha}
                </p>
              )}
            </div>

            {/* Confirmação de Crachá Devolvido */}
            {itemSelecionado.cracha && (
              <label className="flex items-center gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crachaDevolvido}
                  onChange={(e) => setCrachaDevolvido(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500"
                />
                <span className="text-xs font-bold text-white">
                  Confirmar devolução do crachá #{itemSelecionado.cracha} na guarita
                </span>
              </label>
            )}

            {/* Ações */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => dispararWhatsAppSaida(itemSelecionado)}
                className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-xs px-3 py-2.5 rounded-xl border border-emerald-500/40 flex items-center gap-1.5 transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Notificar Saída (WhatsApp)</span>
              </button>

              <button
                type="button"
                onClick={confirmarSaida}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase transition shadow-lg active:scale-95 cursor-pointer"
              >
                {loading ? 'Registrando...' : 'Confirmar Saída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PRORROGAR TEMPO DE PERMANÊNCIA */}
      {/* ========================================================================= */}
      {modalProrrogar && itemSelecionado && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-white space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-sm uppercase text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Prorrogar Tempo
              </h3>
              <button onClick={() => setModalProrrogar(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Adicione mais tempo de permanência para <strong>{itemSelecionado.nome_completo || itemSelecionado.nome_profissional}</strong>:
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMinutosProrrogacao(30)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                  minutosProrrogacao === 30 ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                +30 min
              </button>

              <button
                type="button"
                onClick={() => setMinutosProrrogacao(60)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                  minutosProrrogacao === 60 ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                +1 hora
              </button>

              <button
                type="button"
                onClick={() => setMinutosProrrogacao(120)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                  minutosProrrogacao === 120 ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                +2 horas
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalProrrogar(false)}
                className="bg-slate-800 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleProrrogarTempo}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OCR */}
      {modalOcrAberto && (
        <ModalLeitorDocumentoOCR
          aberto={modalOcrAberto}
          onFechar={() => setModalOcrAberto(false)}
          onDadosConfirmados={handleOcrConfirmado}
        />
      )}

      {/* MODAL VISUALIZAR FOTO EXPANDIDA */}
      {modalVisualizarFoto && (
        <div 
          onClick={() => setModalVisualizarFoto(null)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div className="max-w-md w-full max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 p-2">
            <img src={modalVisualizarFoto} alt="Foto Expandida" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl mx-auto" />
            <p className="text-center text-xs text-slate-400 pt-2">Clique em qualquer lugar para fechar</p>
          </div>
        </div>
      )}
    </div>
  );
}
