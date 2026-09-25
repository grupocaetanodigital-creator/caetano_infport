import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Repeat, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  UserCheck, 
  Lock, 
  MessageCircle, 
  FileCheck2, 
  ShieldCheck, 
  Clock, 
  User,
  CheckSquare,
  Square,
  Key,
  Radio,
  Wrench,
  Package,
  Box,
  Footprints,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  HardHat,
  Phone,
  Calendar,
  Building,
  RefreshCw,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface PassagemPostoProps {
  usuarioLogado?: any;
  onTrocarOperador?: (novoOperador: any) => void;
}

export interface ConsolidacaoPosto {
  plantaoInicio: string;
  plantaoFim: string;
  plantaoHoras: number;
  
  // 1. Encomendas / RE
  encomendas: {
    totalRePlantao: number;
    reFaltandoTriagem: number;
    qtdFaltaTriagem: number;
    qtdPacotesTriadosPlantao: number;
    qtdPacotesRetiradosPlantao: number;
    totalRetidasNoPosto: number;
    lotesPendentes: Array<{
      id: string;
      codigo: string;
      entregadorNome: string;
      entregadorEmpresa: string;
      qtdDeclarada: number;
      qtdTriada: number;
      status: string;
    }>;
  };

  // 2. Rondas
  rondas: {
    totalExecutadasPlantao: number;
    concluidas: number;
    incompletas: number;
    temDivergencias: boolean;
    rondaAtivaNaoFinalizada: boolean;
    listaDivergencias: string[];
    rondasRecentes: Array<{
      id: string;
      operador: string;
      inicio: string;
      fim?: string;
      status: string;
      pontosLidos: number;
      pontosTotais: number;
    }>;
  };

  // 3. Chaves fora do quadro
  chaves: {
    totalFora: number;
    listaChavesFora: Array<{
      id: string;
      nomeChave: string;
      codigoChave: string;
      setor: string;
      comQuemTa: string;
      documento: string;
      empresaOuApto: string;
      telefone: string;
      retiradaEm: string;
      previsaoDevolucao: string;
      atrasado: boolean;
      motivo?: string;
    }>;
  };

  // 4. Prestadores e Autorizados no condomínio
  prestadores: {
    totalPresentes: number;
    listaPresentes: Array<{
      id: string;
      nome: string;
      empresa: string;
      documento: string;
      destino: string;
      cracha: string;
      entradaEm: string;
      tipoServico?: string;
      telefone?: string;
    }>;
  };

  // 5. Custódia
  custodia: {
    totalAguardando: number;
    listaCustodias: Array<{
      id: string;
      codigo: string;
      descricao: string;
      origem: string;
      destino: string;
      entradaEm: string;
      fotoUrl?: string;
    }>;
  };

  // 6. Materiais
  materiais: {
    totalEquipamentos: number;
    perfeitos: number;
    avariados: number;
    listaAvariados: Array<{
      id: string;
      nome: string;
      categoria: string;
      codigoPatrimonio?: string;
      estado: string;
      observacao?: string;
      fotoUrl?: string;
    }>;
    alteracoesPlantao: Array<{
      id: string;
      tipo: string;
      detalhe: any;
      operador: string;
      timestamp: string;
    }>;
  };

  // 7. Ocorrências
  ocorrencias: {
    totalPendentes: number;
    listaPendentes: Array<{
      id: string;
      titulo: string;
      descricao: string;
      prioridade: string;
      tipo: string;
      unidadeBloco?: string;
      operador: string;
      criadaEm: string;
      diasEmAberto: number;
      fotoUrl?: string;
    }>;
  };
}

const estadoInicialConsolidacao: ConsolidacaoPosto = {
  plantaoInicio: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  plantaoFim: new Date().toISOString(),
  plantaoHoras: 12,
  encomendas: {
    totalRePlantao: 0,
    reFaltandoTriagem: 0,
    qtdFaltaTriagem: 0,
    qtdPacotesTriadosPlantao: 0,
    qtdPacotesRetiradosPlantao: 0,
    totalRetidasNoPosto: 0,
    lotesPendentes: []
  },
  rondas: {
    totalExecutadasPlantao: 0,
    concluidas: 0,
    incompletas: 0,
    temDivergencias: false,
    rondaAtivaNaoFinalizada: false,
    listaDivergencias: [],
    rondasRecentes: []
  },
  chaves: {
    totalFora: 0,
    listaChavesFora: []
  },
  prestadores: {
    totalPresentes: 0,
    listaPresentes: []
  },
  custodia: {
    totalAguardando: 0,
    listaCustodias: []
  },
  materiais: {
    totalEquipamentos: 0,
    perfeitos: 0,
    avariados: 0,
    listaAvariados: [],
    alteracoesPlantao: []
  },
  ocorrencias: {
    totalPendentes: 0,
    listaPendentes: []
  }
};

export default function PassagemPosto({ usuarioLogado, onTrocarOperador }: PassagemPostoProps) {
  const [passagens, setPassagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [modalNova, setModalNova] = useState(false);
  const [etapa, setEtapa] = useState(1);
  const [loginEntrante, setLoginEntrante] = useState('');
  const [senhaEntrante, setSenhaEntrante] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [divergencia, setDivergencia] = useState('');
  const [temDivergencia, setTemDivergencia] = useState(false);

  // Módulo ativo para visualização detalhada na etapa 1
  const [moduloAtivo, setModuloAtivo] = useState<string>('todos');

  // Estado consolidado completo
  const [consolidacao, setConsolidacao] = useState<ConsolidacaoPosto>(estadoInicialConsolidacao);

  // Modal para ver relatório histórico completo
  const [modalHistoricoDetalhes, setModalHistoricoDetalhes] = useState<any | null>(null);

  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    encomendasOk: true,
    custodiaOk: true,
    materiaisOk: true,
    chavesOk: true,
    rondasOk: true,
    prestadoresOk: true,
    ocorrenciasCientes: true,
    limpezaOk: true
  });

  useEffect(() => {
    carregarPassagens();
  }, [usuarioLogado?.condominio_id]);

  const carregarPassagens = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('passagens_posto')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPassagens(data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar histórico: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const abrirNovaPassagem = async () => {
    setModalNova(true);
    setEtapa(1);
    setMensagem({ tipo: '', texto: '' });
    setModuloAtivo('todos');
    await consolidarModulosPosto();
  };

  const consolidarModulosPosto = async () => {
    const condId = usuarioLogado?.condominio_id;
    if (!condId) return;

    setLoadingAuditoria(true);
    try {
      // 0. Determinar intervalo do plantão atual (desde a última passagem de posto ou 12h padrão)
      const { data: ultimasPassagens } = await supabase
        .from('passagens_posto')
        .select('created_at')
        .eq('condominio_id', condId)
        .order('created_at', { ascending: false })
        .limit(1);

      let plantaoInicioDate = new Date(Date.now() - 12 * 60 * 60 * 1000);
      if (ultimasPassagens && ultimasPassagens.length > 0 && ultimasPassagens[0].created_at) {
        const ultData = new Date(ultimasPassagens[0].created_at);
        // Se a última passagem ocorreu há menos de 48 horas, usamos ela como início do turno
        if (Date.now() - ultData.getTime() < 48 * 60 * 60 * 1000) {
          plantaoInicioDate = ultData;
        }
      }

      const plantaoInicioStr = plantaoInicioDate.toISOString();
      const plantaoFimStr = new Date().toISOString();
      const diffMs = Date.now() - plantaoInicioDate.getTime();
      const plantaoHoras = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

      // 1. MÓDULO 02 - ENCOMENDAS & RE
      // 1.1 REs criadas no plantão
      const { data: lotesPlantao } = await supabase
        .from('lotes_re')
        .select('*, entregadores(nome, empresa)')
        .eq('condominio_id', condId)
        .gte('created_at', plantaoInicioStr);

      // 1.2 REs pendentes de triagem (todas que ainda faltam triagem geral)
      const { data: lotesPendentesGerais } = await supabase
        .from('lotes_re')
        .select('*, entregadores(nome, empresa)')
        .eq('condominio_id', condId)
        .in('status', ['aguardando_triagem', 'em_triagem'])
        .order('created_at', { ascending: false });

      const lotesPendentesFormatados = (lotesPendentesGerais || []).map((l: any) => ({
        id: l.id,
        codigo: l.codigo || 'RE-LOTE',
        entregadorNome: l.entregadores?.nome || 'Não informado',
        entregadorEmpresa: l.entregadores?.empresa || 'Entregador',
        qtdDeclarada: Number(l.qtd_declarada) || 0,
        qtdTriada: Number(l.qtd_triada) || 0,
        status: l.status
      }));

      const totalRePlantao = lotesPlantao?.length || 0;
      const reFaltandoTriagem = lotesPendentesFormatados.length;
      const qtdFaltaTriagem = lotesPendentesFormatados.reduce(
        (acc: number, l: any) => acc + Math.max(0, l.qtdDeclarada - l.qtdTriada),
        0
      );

      // 1.3 Pacotes triados no plantão
      const { data: itensTriadosPlantao } = await supabase
        .from('encomendas_itens')
        .select('id')
        .eq('condominio_id', condId)
        .gte('created_at', plantaoInicioStr);

      // 1.4 Pacotes entregues/retirados no plantão
      const { data: itensRetiradosPlantao } = await supabase
        .from('encomendas_itens')
        .select('id')
        .eq('condominio_id', condId)
        .eq('status', 'entregue')
        .gte('data_retirada', plantaoInicioStr);

      // 1.5 Total de encomendas físicas retidas no posto aguardando moradores retirarem
      const { data: todosRetidosPosto } = await supabase
        .from('encomendas_itens')
        .select('id')
        .eq('condominio_id', condId)
        .eq('status', 'retido');

      // 2. MÓDULO 07 - RONDAS PATRIMONIAIS
      const { data: rondasPlantaoData } = await supabase
        .from('rondas_execucao')
        .select('*')
        .eq('condominio_id', condId)
        .gte('data_inicio', plantaoInicioStr)
        .order('data_inicio', { ascending: false });

      const rondasPlantao = rondasPlantaoData || [];
      const concluidasRondas = rondasPlantao.filter((r: any) => r.status === 'Concluída').length;
      const incompletasRondas = rondasPlantao.filter((r: any) => r.status === 'Incompleta' || (r.status !== 'Concluída' && r.status !== 'Em Andamento')).length;
      const rondaAtiva = rondasPlantao.some((r: any) => r.status === 'Em Andamento');

      const listaDivergenciasRonda: string[] = [];
      if (rondaAtiva) {
        listaDivergenciasRonda.push('Existe 1 ronda com status "Em Andamento" que não foi finalizada antes da troca de turno!');
      }

      rondasPlantao.forEach((r: any) => {
        if (r.status === 'Incompleta') {
          listaDivergenciasRonda.push(`Ronda das ${new Date(r.data_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} finalizada incompleta (${r.pontos_lidos || 0} de ${r.pontos_totais || 0} pontos).`);
        }
        if (r.resumo_detalhado && (r.resumo_detalhado.includes('FORA DA ÁREA') || r.resumo_detalhado.includes('ALERTAS DE VALIDAÇÃO'))) {
          listaDivergenciasRonda.push(`Alerta antifraude GPS na ronda das ${new Date(r.data_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: Ponto validado com distância acima do permitido!`);
        }
        if (r.resumo_detalhado && r.resumo_detalhado.includes('AVARIAS REGISTRADAS')) {
          listaDivergenciasRonda.push(`Avaria patrimonial apontada durante ronda das ${new Date(r.data_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
        }
      });

      const rondasRecentesFormatadas = rondasPlantao.slice(0, 5).map((r: any) => ({
        id: r.id,
        operador: r.operador_nome || 'Ronda',
        inicio: r.data_inicio,
        fim: r.data_fim,
        status: r.status,
        pontosLidos: r.pontos_lidos || 0,
        pontosTotais: r.pontos_totais || 0
      }));

      // 3. MÓDULO 05 - QUADRO DE CHAVES (Chaves fora do quadro, quem está com ela)
      const { data: movsChavesData } = await supabase
        .from('movimentacao_chaves')
        .select('*, chaves(*)')
        .eq('condominio_id', condId)
        .eq('status', 'Em Andamento')
        .order('data_hora_retirada', { ascending: false });

      const agora = new Date();
      const listaChavesFora = (movsChavesData || []).map((m: any) => {
        const previsao = m.previsao_devolucao ? new Date(m.previsao_devolucao) : null;
        const atrasado = previsao ? agora > previsao : false;
        return {
          id: m.id,
          nomeChave: m.chaves?.nome_chave || m.nome_chave || 'Chave do Posto',
          codigoChave: m.chaves?.codigo_chave || m.codigo_chave || 'S/C',
          setor: m.chaves?.setor || 'Geral',
          comQuemTa: m.nome_retirante || 'Não informado',
          documento: m.documento_retirante || 'Não informado',
          empresaOuApto: m.empresa_ou_apto || 'Morador/Terceiro',
          telefone: m.telefone_retirante || 'Não informado',
          retiradaEm: m.data_hora_retirada,
          previsaoDevolucao: m.previsao_devolucao,
          atrasado,
          motivo: m.motivo_retirada
        };
      });

      // 4. MÓDULO 06 - PRESTADORES E AUTORIZADOS PRESENTES NO CONDOMÍNIO
      const { data: prestadoresData } = await supabase
        .from('prestadores')
        .select('*')
        .eq('condominio_id', condId)
        .order('data_hora_entrada', { ascending: false });

      const prestadoresPresentes = (prestadoresData || []).filter((p: any) => {
        const st = (p.status_acesso || '').trim().toUpperCase();
        return st === 'EM_ANDAMENTO' || st === 'PRESENTE' || st === 'EM ANDAMENTO';
      }).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        empresa: p.empresa || 'Autônomo',
        documento: p.documento || 'Não informado',
        destino: `${p.unidade_destino ? 'Apt ' + p.unidade_destino : ''} ${p.bloco_destino ? 'Bloco ' + p.bloco_destino : ''}`.trim() || 'Área Comum',
        cracha: p.cracha_atribuido || 'Portaria',
        entradaEm: p.data_hora_entrada || p.created_at,
        tipoServico: p.tipo_servico || p.tipo,
        telefone: p.telefone || 'Não informado'
      }));

      // 5. MÓDULO 03 - CUSTÓDIA DE OBJETOS NA PORTARIA
      const { data: custodiaData } = await supabase
        .from('custodia')
        .select('*')
        .eq('condominio_id', condId)
        .order('created_at', { ascending: false });

      const itensCustodiaAguardando = (custodiaData || []).filter((c: any) => {
        const st = (c.status || '').trim().toLowerCase();
        return st === 'aguardando retirada' || st === 'retido' || st === 'pendente';
      }).map((c: any) => ({
        id: c.id,
        codigo: c.codigo_custodia || 'CUST',
        descricao: c.descricao || 'Item em custódia',
        origem: `${c.origem_nome_doc || 'Origem'} (${c.origem_unidade ? 'Apt ' + c.origem_unidade : c.origem_tipo || 'Externo'})`,
        destino: `${c.destino_nome_doc || 'Destino'} (${c.destino_unidade ? 'Apt ' + c.destino_unidade : c.destino_tipo || 'Morador'})`,
        entradaEm: c.created_at,
        fotoUrl: c.foto_entrada_url
      }));

      // 6. MÓDULO 04 - MATERIAIS DO POSTO E EQUIPAMENTOS
      const { data: materiaisData } = await supabase
        .from('materiais_posto')
        .select('*')
        .eq('condominio_id', condId)
        .order('nome');

      const materiaisLista = materiaisData || [];
      const materiaisAvariados = materiaisLista.filter((m: any) => m.estado && m.estado !== 'Perfeito').map((m: any) => ({
        id: m.id,
        nome: m.nome,
        categoria: m.categoria,
        codigoPatrimonio: m.codigo_patrimonio,
        estado: m.estado,
        observacao: m.observacao_avaria,
        fotoUrl: m.foto_avaria_url
      }));

      // Buscar log de alterações de materiais (adições, exclusões e mudanças de status)
      let alteracoesMateriais: any[] = [];
      try {
        const rawLog = localStorage.getItem(`infport_materiais_log_${condId}`);
        if (rawLog) {
          const parsed = JSON.parse(rawLog);
          if (Array.isArray(parsed)) {
            alteracoesMateriais = parsed.filter((item: any) => {
              const dt = new Date(item.timestamp).getTime();
              return dt >= plantaoInicioDate.getTime();
            });
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar log local de materiais:', e);
      }

      // Se houver materiais atualizados no plantão que não estão no log local
      materiaisLista.forEach((m: any) => {
        if (m.updated_at && new Date(m.updated_at).getTime() >= plantaoInicioDate.getTime()) {
          const jaTem = alteracoesMateriais.some((a: any) => a.detalhe?.id === m.id || a.detalhe?.nome === m.nome);
          if (!jaTem && m.estado !== 'Perfeito') {
            alteracoesMateriais.push({
              id: m.id,
              tipo: 'ALTERACAO_STATUS',
              detalhe: { nome: m.nome, estado: m.estado, observacao: m.observacao_avaria },
              operador: m.operador_atualizacao || 'Portaria',
              timestamp: m.updated_at
            });
          }
        }
      });

      // 7. MÓDULO 08 - LIVRO DE OCORRÊNCIAS PENDENTES (Mesmo que esteja há 10+ dias!)
      const { data: ocorrenciasData } = await supabase
        .from('ocorrencias')
        .select('*')
        .eq('condominio_id', condId)
        .order('created_at', { ascending: true }); // mais antigas primeiro

      const ocorrenciasPendentes = (ocorrenciasData || []).filter((o: any) => {
        const st = (o.status || '').trim().toLowerCase();
        return !st || (!st.includes('resolv') && !st.includes('conclui') && !st.includes('fechad'));
      }).map((o: any) => {
        const dtCriada = new Date(o.created_at || Date.now());
        const diasEmAberto = Math.max(0, Math.floor((Date.now() - dtCriada.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          id: o.id,
          titulo: o.titulo || 'Ocorrência sem título',
          descricao: o.descricao || '',
          prioridade: o.prioridade || 'Média',
          tipo: o.tipo || 'Interna',
          unidadeBloco: o.unidade_bloco,
          operador: o.operador_nome || 'Operador',
          criadaEm: o.created_at,
          diasEmAberto,
          fotoUrl: o.foto_url
        };
      });

      // Montar objeto consolidado completo
      const consolidacaoFinal: ConsolidacaoPosto = {
        plantaoInicio: plantaoInicioStr,
        plantaoFim: plantaoFimStr,
        plantaoHoras,
        encomendas: {
          totalRePlantao,
          reFaltandoTriagem,
          qtdFaltaTriagem,
          qtdPacotesTriadosPlantao: itensTriadosPlantao?.length || 0,
          qtdPacotesRetiradosPlantao: itensRetiradosPlantao?.length || 0,
          totalRetidasNoPosto: todosRetidosPosto?.length || 0,
          lotesPendentes: lotesPendentesFormatados
        },
        rondas: {
          totalExecutadasPlantao: rondasPlantao.length,
          concluidas: concluidasRondas,
          incompletas: incompletasRondas,
          temDivergencias: listaDivergenciasRonda.length > 0,
          rondaAtivaNaoFinalizada: rondaAtiva,
          listaDivergencias: listaDivergenciasRonda,
          rondasRecentes: rondasRecentesFormatadas
        },
        chaves: {
          totalFora: listaChavesFora.length,
          listaChavesFora
        },
        prestadores: {
          totalPresentes: prestadoresPresentes.length,
          listaPresentes: prestadoresPresentes
        },
        custodia: {
          totalAguardando: itensCustodiaAguardando.length,
          listaCustodias: itensCustodiaAguardando
        },
        materiais: {
          totalEquipamentos: materiaisLista.length,
          perfeitos: materiaisLista.length - materiaisAvariados.length,
          avariados: materiaisAvariados.length,
          listaAvariados: materiaisAvariados,
          alteracoesPlantao: alteracoesMateriais
        },
        ocorrencias: {
          totalPendentes: ocorrenciasPendentes.length,
          listaPendentes: ocorrenciasPendentes
        }
      };

      setConsolidacao(consolidacaoFinal);

    } catch (err) {
      console.error('Erro na auditoria consolidada:', err);
    } finally {
      setLoadingAuditoria(false);
    }
  };

  const toggleChecklist = (item: string) => {
    setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const realizarPassagemPosto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const { data: opEntrante, error: opError } = await supabase
        .from('operadores')
        .select('*')
        .eq('login', loginEntrante.trim())
        .eq('senha', senhaEntrante.trim())
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('ativo', true)
        .maybeSingle();

      if (opError) throw opError;

      if (!opEntrante) {
        setMensagem({ tipo: 'erro', texto: 'Credenciais do operador entrante incorretas ou operador inativo.' });
        setLoading(false);
        return;
      }

      if (opEntrante.id === usuarioLogado.id) {
        setMensagem({ tipo: 'erro', texto: 'O operador entrante deve ser diferente do sainte.' });
        setLoading(false);
        return;
      }

      const agora = new Date();
      const dia = String(agora.getDate()).padStart(2, '0');
      const mes = String(agora.getMonth() + 1).padStart(2, '0');
      const ano = String(agora.getFullYear()).slice(-2);
      const codigoPas = `PAS:${dia}${mes}${ano}OPER${String(agora.getMinutes()).padStart(2, '0')}`;

      // Montamos o snapshot completo garantindo compatibilidade com versões antigas e a nova auditoria
      const snapshotConsolidado = {
        ...consolidacao,
        // campos legado para visualizadores antigos
        chavesFora: consolidacao.chaves.totalFora,
        listaChaves: consolidacao.chaves.listaChavesFora,
        materiaisOk: consolidacao.materiais.avariados === 0,
        qtdMateriais: consolidacao.materiais.totalEquipamentos,
        listaMateriaisAvariados: consolidacao.materiais.listaAvariados,
        ocorrenciasAbertas: consolidacao.ocorrencias.totalPendentes,
        listaOcorrencias: consolidacao.ocorrencias.listaPendentes,
        encomendasPendentes: consolidacao.encomendas.totalRetidasNoPosto,
        custodiasPendentes: consolidacao.custodia.totalAguardando,
        rondasUltimas12h: consolidacao.rondas.totalExecutadasPlantao,
        ultimaRondaStatus: consolidacao.rondas.temDivergencias ? 'Divergências Mapeadas' : '100% Auditada'
      };

      const novaPassagem = {
        condominio_id: usuarioLogado.condominio_id,
        codigo: codigoPas,
        operador_sainte_nome: usuarioLogado?.nome || usuarioLogado?.login,
        operador_entrante_nome: opEntrante.nome || opEntrante.login,
        checklist: checklist,
        pendencias: snapshotConsolidado,
        observacoes: observacoes.trim() || 'Sem observações gravadas para o próximo turno.',
        divergencia: temDivergencia ? divergencia.trim() : null,
        status: temDivergencia ? 'Divergência Registrada' : 'Concluída'
      };

      const { error } = await supabase
        .from('passagens_posto')
        .insert([novaPassagem]);

      if (error) throw error;

      setModalNova(false);
      setLoginEntrante('');
      setSenhaEntrante('');
      setObservacoes('');
      setDivergencia('');
      setTemDivergencia(false);

      if (onTrocarOperador) {
        onTrocarOperador(opEntrante);
      } else {
        carregarPassagens();
        setMensagem({ tipo: 'sucesso', texto: `Passagem de posto registrada com sucesso! Operador ativo: ${opEntrante.nome}` });
      }

    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar passagem: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const gerarLinkWhatsApp = (item: any) => {
    const dataHora = new Date(item.created_at).toLocaleString('pt-BR');
    const c = item.pendencias || {};
    const enc = c.encomendas || {};
    const ron = c.rondas || {};
    const cha = c.chaves || {};
    const pre = c.prestadores || {};
    const cus = c.custodia || {};
    const mat = c.materiais || {};
    const oco = c.ocorrencias || {};

    let texto = `🔄 *RELATÓRIO CONSOLIDADO DE PASSAGEM DE POSTO - INFPORT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 *Código:* ${item.codigo || 'PAS:INFPORT'}\n` +
      `📅 *Data/Hora da Troca:* ${dataHora}\n` +
      `👤 *Operador Sainte (Saindo):* ${item.operador_sainte_nome}\n` +
      `👤 *Operador Entrante (Assumiu):* ${item.operador_entrante_nome}\n` +
      `📌 *Status do Turno:* ${item.status === 'Divergência Registrada' ? '⚠️ DIVERGÊNCIA APONTADA' : '🟢 100% AUDITADO E VALIDADO'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 1. RE / Encomendas
    texto += `📦 *MÓDULO 02 - RECEBIMENTO DE ENCOMENDAS (RE)*\n` +
      `• REs recebidas no plantão: *${enc.totalRePlantao ?? (c.encomendasPendentes ? 'Auditado' : 0)}*\n` +
      `• REs aguardando triagem: *${enc.reFaltandoTriagem ?? 0} lote(s)*\n` +
      `• Volumes que faltam triar: *${enc.qtdFaltaTriagem ?? 0} pacote(s)*\n` +
      `• Pacotes triados no plantão: *${enc.qtdPacotesTriadosPlantao ?? 0}*\n` +
      `• Pacotes entregues/retirados no plantão: *${enc.qtdPacotesRetiradosPlantao ?? 0}*\n` +
      `• Total retido no posto aguardando moradores: *${enc.totalRetidasNoPosto ?? c.encomendasPendentes ?? 0} volume(s)*\n`;
    if (enc.lotesPendentes && enc.lotesPendentes.length > 0) {
      texto += `  _Lotes que faltam triar:_\n` +
        enc.lotesPendentes.map((l: any) => `  ↳ ${l.codigo} (${l.entregadorEmpresa || 'Entregador'}): faltam ${l.qtdDeclarada - l.qtdTriada} de ${l.qtdDeclarada} vol.`).join('\n') + `\n`;
    }
    texto += `\n`;

    // 2. Rondas
    texto += `🛡️ *MÓDULO 07 - RONDAS PATRIMONIAIS NO PLANTÃO*\n` +
      `• Rondas executadas no plantão: *${ron.totalExecutadasPlantao ?? c.rondasUltimas12h ?? 0}*\n` +
      `• Rondas concluídas 100%: *${ron.concluidas ?? 0}*\n` +
      `• Rondas incompletas / com falhas: *${ron.incompletas ?? 0}*\n`;
    if (ron.temDivergencias && ron.listaDivergencias && ron.listaDivergencias.length > 0) {
      texto += `🚨 *Divergências/Alertas nas Rondas:*\n` +
        ron.listaDivergencias.map((d: string) => `  ⚠️ ${d}`).join('\n') + `\n`;
    } else {
      texto += `• Auditoria de rondas: *Sem divergências registradas*\n`;
    }
    texto += `\n`;

    // 3. Chaves fora do quadro
    const totalChavesFora = cha.totalFora ?? c.chavesFora ?? 0;
    texto += `🔑 *MÓDULO 05 - QUADRO DE CHAVES*\n` +
      `• Chaves fora do quadro: *${totalChavesFora}*\n`;
    const listaChaves = cha.listaChavesFora || c.listaChaves || [];
    if (totalChavesFora > 0 && listaChaves.length > 0) {
      texto += `🚨 *Chaves em posse de terceiros/moradores:*\n` +
        listaChaves.map((k: any) => 
          `  🔑 *${k.nomeChave || k.nome_chave || 'Chave'}* (${k.codigoChave || k.codigo_chave || 'S/C'})\n` +
          `     ↳ Com quem tá: *${k.comQuemTa || k.nome_retirante || 'Portador'}* (${k.empresaOuApto || k.empresa_ou_apto || 'N/A'})\n` +
          `     ↳ Doc: ${k.documento || k.documento_retirante || 'N/A'} | Fone: ${k.telefone || k.telefone_retirante || 'N/A'}\n` +
          `     ↳ Retirada em: ${new Date(k.retiradaEm || k.data_hora_retirada || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${k.atrasado ? ' ⚠️ *ATRASADO!*' : ''}`
        ).join('\n\n') + `\n`;
    } else {
      texto += `• Situação: *Todas as chaves guardadas no quadro*\n`;
    }
    texto += `\n`;

    // 4. Prestadores presentes
    const totalPrestadores = pre.totalPresentes ?? 0;
    texto += `👷 *MÓDULO 06 - PRESTADORES E AUTORIZADOS NO CONDOMÍNIO*\n` +
      `• Prestadores presentes no momento: *${totalPrestadores}*\n`;
    if (totalPrestadores > 0 && pre.listaPresentes && pre.listaPresentes.length > 0) {
      texto += pre.listaPresentes.map((p: any) => 
        `  • *${p.nome}* (${p.empresa || 'Autônomo'})\n` +
        `    ↳ Destino: ${p.destino || 'Área Comum'} | Crachá: ${p.cracha || 'N/A'}\n` +
        `    ↳ Entrada: ${new Date(p.entradaEm).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      ).join('\n') + `\n`;
    } else {
      texto += `• Situação: *Nenhum prestador ativo no momento*\n`;
    }
    texto += `\n`;

    // 5. Custódia
    const totalCustodia = cus.totalAguardando ?? c.custodiasPendentes ?? 0;
    texto += `🎁 *MÓDULO 03 - CUSTÓDIA DE OBJETOS NA PORTARIA*\n` +
      `• Itens guardados aguardando retirada: *${totalCustodia}*\n`;
    if (totalCustodia > 0 && cus.listaCustodias && cus.listaCustodias.length > 0) {
      texto += cus.listaCustodias.map((cItem: any) => 
        `  • [${cItem.codigo}] *${cItem.descricao}*\n` +
        `    ↳ De: ${cItem.origem} ➔ Para: ${cItem.destino}`
      ).join('\n') + `\n`;
    }
    texto += `\n`;

    // 6. Materiais do posto
    const totalAvariados = mat.avariados ?? (c.materiaisOk === false ? 1 : 0);
    texto += `📻 *MÓDULO 04 - EQUIPAMENTOS E MATERIAIS DA GUARITA*\n` +
      `• Total de itens inventariados: *${mat.totalEquipamentos ?? c.qtdMateriais ?? 0}*\n` +
      `• Em perfeito estado: *${mat.perfeitos ?? (c.materiaisOk ? '100% OK' : 'Com Avarias')}*\n` +
      `• Com avaria / em manutenção: *${totalAvariados}*\n`;
    const listaAvarias = mat.listaAvariados || c.listaMateriaisAvariados || [];
    if (totalAvariados > 0 && listaAvarias.length > 0) {
      texto += `  🚨 *Itens com Avaria/Defeito:*\n` +
        listaAvarias.map((a: any) => `  ↳ *${a.nome}*: ${a.observacao || a.observacao_avaria || a.estado}`).join('\n') + `\n`;
    }
    if (mat.alteracoesPlantao && mat.alteracoesPlantao.length > 0) {
      texto += `  📝 *Alterações/Movimentações no Turno:*\n` +
        mat.alteracoesPlantao.map((alt: any) => `  ↳ [${alt.tipo}] ${alt.detalhe?.nome || 'Item'} por ${alt.operador}`).join('\n') + `\n`;
    }
    texto += `\n`;

    // 7. Ocorrências pendentes
    const totalOcorrencias = oco.totalPendentes ?? c.ocorrenciasAbertas ?? 0;
    texto += `⚠️ *MÓDULO 08 - LIVRO DE OCORRÊNCIAS PENDENTES*\n` +
      `• Total de ocorrências não resolvidas: *${totalOcorrencias}*\n`;
    const listaOcorrencias = oco.listaPendentes || c.listaOcorrencias || [];
    if (totalOcorrencias > 0 && listaOcorrencias.length > 0) {
      texto += `🚨 *Atenção aos casos pendentes (independente de quantos dias em aberto):*\n` +
        listaOcorrencias.map((o: any) => 
          `  • [${(o.prioridade || 'Média').toUpperCase()}] *${o.titulo}*\n` +
          `    ↳ ⏳ *Há ${o.diasEmAberto ?? 'X'} dia(s) em aberto!* (${new Date(o.criadaEm || o.created_at || Date.now()).toLocaleDateString('pt-BR')})\n` +
          `    ↳ Local: ${o.unidadeBloco || o.unidade_bloco || 'Área Geral'} | Reg: ${o.operador || o.operador_nome || 'Portaria'}\n` +
          `    ↳ Resumo: ${o.descricao}`
        ).join('\n\n') + `\n`;
    } else {
      texto += `• Situação: *Nenhuma ocorrência pendente no posto*\n`;
    }
    texto += `\n`;

    // Recados e Divergências
    texto += `💬 *INSTRUÇÕES E RECADOS DO TURNO:*\n"${item.observacoes || 'Nenhuma observação registrada.'}"\n`;
    if (item.divergencia) {
      texto += `\n🚨 *DIVERGÊNCIA APONTADA PELO OPERADOR:*\n"${item.divergencia}"\n`;
    }

    texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_INFPORT Portaria Digital Inteligente_`;
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg border border-slate-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-3 py-1 rounded flex items-center gap-1.5 w-fit">
            <Repeat className="w-3.5 h-3.5" /> Módulo 09 - Passagem de Posto Auditada
          </span>
          <h2 className="font-bold text-xl mt-1.5 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" /> Auditoria & Passagem de Posto
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Consolidação completa automática de Encomendas/RE, Rondas, Chaves, Prestadores, Custódia, Materiais e Ocorrências.
          </p>
        </div>

        <button
          onClick={abrirNovaPassagem}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-3 rounded-xl text-xs flex items-center gap-2 transition uppercase shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" /> Iniciar Troca de Turno
        </button>
      </div>

      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* Histórico de Trocas de Turno */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" /> Histórico de Trocas de Turno Registradas
          </h4>
          <span className="text-xs text-slate-500 font-medium">
            {passagens.length} troca(s) auditada(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {passagens.map((item) => {
            const p = item.pendencias || {};
            const enc = p.encomendas || {};
            const cha = p.chaves || {};
            const oco = p.ocorrencias || {};
            const ron = p.rondas || {};
            const pre = p.prestadores || {};

            return (
              <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5 flex flex-col justify-between hover:border-slate-300 transition">
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2.5">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                      <FileCheck2 className="w-4 h-4 text-emerald-600" /> {item.codigo || 'PAS:CONCLUÍDO'}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      item.status === 'Divergência Registrada' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {item.status || 'Concluída'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Sainte (Saindo):</span>
                      <strong className="text-slate-800">{item.operador_sainte_nome}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Entrante (Assumiu):</span>
                      <strong className="text-emerald-700">{item.operador_entrante_nome}</strong>
                    </div>
                  </div>

                  {/* Resumo Consolidado em Chips */}
                  <div className="text-[11px] space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-700 uppercase text-[10px] block border-b pb-1">Snapshot Consolidado do Plantão:</span>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-purple-600" />
                        <span>REs / Retidas: <strong>{enc.totalRetidasNoPosto ?? p.encomendasPendentes ?? 0} vol.</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-600" />
                        <span>Chaves Fora: <strong className={(cha.totalFora ?? p.chavesFora) > 0 ? 'text-amber-700' : ''}>{cha.totalFora ?? p.chavesFora ?? 0}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Footprints className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Rondas: <strong>{ron.totalExecutadasPlantao ?? p.rondasUltimas12h ?? 0} feitas</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HardHat className="w-3.5 h-3.5 text-blue-600" />
                        <span>Prestadores: <strong>{pre.totalPresentes ?? 0} ativos</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        <span>Ocorrências: <strong className={(oco.totalPendentes ?? p.ocorrenciasAbertas) > 0 ? 'text-red-700' : ''}>{oco.totalPendentes ?? p.ocorrenciasAbertas ?? 0} abertas</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Equipamentos: <strong>{p.materiaisOk !== false ? '100% OK' : 'Com Avaria'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    "{item.observacoes}"
                  </p>

                  {item.divergencia && (
                    <div className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <strong>Divergência Registrada:</strong> {item.divergencia}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setModalHistoricoDetalhes(item)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                      title="Ver Auditoria Completa dos Módulos"
                    >
                      <Eye className="w-3.5 h-3.5" /> Detalhes
                    </button>
                    <a
                      href={gerarLinkWhatsApp(item)}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            );
          })}

          {passagens.length === 0 && !loading && (
            <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 italic text-xs">
              Nenhuma passagem de posto registrada até o momento.
            </div>
          )}
        </div>
      </div>

      {/* MODAL NOVA PASSAGEM DE POSTO COM CONSOLIDAÇÃO TOTAL */}
      {modalNova && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] flex flex-col">
            <button 
              onClick={() => setModalNova(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b pb-3 pr-8">
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" /> Relatório Completo de Troca de Plantão
                </h3>
                <p className="text-[11px] text-slate-500">
                  Consolidação automática dos 7 módulos com verificação em tempo real
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                Etapa {etapa} de 3
              </span>
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {etapa === 1 && (
                <div className="space-y-4">
                  {/* Banner do Plantão */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-xl text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-sm">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Plantão Vigente Sendo Auditado:</span>
                      <strong className="text-emerald-400 text-xs sm:text-sm">
                        Desde {new Date(consolidacao.plantaoInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} de {new Date(consolidacao.plantaoInicio).toLocaleDateString('pt-BR')} ({consolidacao.plantaoHoras}h de turno)
                      </strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-300">Operador Sainte:</span>
                      <strong className="bg-slate-700/80 px-2.5 py-1 rounded text-white font-mono">
                        {usuarioLogado?.nome || usuarioLogado?.login}
                      </strong>
                    </div>
                  </div>

                  {loadingAuditoria && (
                    <div className="p-4 bg-slate-50 border rounded-xl text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> Varrimento e consolidação em tempo real dos módulos...
                    </div>
                  )}

                  {/* CARDS RESUMO DE ALTO NÍVEL */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* RE / Encomendas */}
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('encomendas')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'encomendas' ? 'ring-2 ring-purple-600 bg-purple-50/50 border-purple-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-purple-700 mb-1">
                        <span className="text-[10px] font-bold uppercase">RE & Encomendas</span>
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.encomendas.totalRePlantao} REs no plantão
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {consolidacao.encomendas.reFaltandoTriagem > 0 ? (
                          <span className="text-amber-600 font-bold">{consolidacao.encomendas.reFaltandoTriagem} RE(s) a triar ({consolidacao.encomendas.qtdFaltaTriagem} vol.)</span>
                        ) : (
                          <span className="text-emerald-600">Triagem 100% em dia</span>
                        )}
                      </div>
                    </button>

                    {/* Rondas */}
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('rondas')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'rondas' ? 'ring-2 ring-indigo-600 bg-indigo-50/50 border-indigo-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-indigo-700 mb-1">
                        <span className="text-[10px] font-bold uppercase">Rondas Patrimoniais</span>
                        <Footprints className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.rondas.totalExecutadasPlantao} ronda(s) feitas
                      </div>
                      <div className="text-[10px]">
                        {consolidacao.rondas.temDivergencias ? (
                          <span className="text-red-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Divergência notada
                          </span>
                        ) : (
                          <span className="text-emerald-600">100% Concluídas</span>
                        )}
                      </div>
                    </button>

                    {/* Chaves */}
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('chaves')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'chaves' ? 'ring-2 ring-amber-600 bg-amber-50/50 border-amber-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-amber-700 mb-1">
                        <span className="text-[10px] font-bold uppercase">Quadro de Chaves</span>
                        <Key className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.chaves.totalFora} chave(s) fora
                      </div>
                      <div className="text-[10px]">
                        {consolidacao.chaves.totalFora > 0 ? (
                          <span className="text-amber-700 font-bold">Ver com quem está</span>
                        ) : (
                          <span className="text-emerald-600">Todas no quadro</span>
                        )}
                      </div>
                    </button>

                    {/* Prestadores */}
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('prestadores')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'prestadores' ? 'ring-2 ring-blue-600 bg-blue-50/50 border-blue-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-blue-700 mb-1">
                        <span className="text-[10px] font-bold uppercase">Prestadores no Cond.</span>
                        <HardHat className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.prestadores.totalPresentes} presente(s)
                      </div>
                      <div className="text-[10px]">
                        {consolidacao.prestadores.totalPresentes > 0 ? (
                          <span className="text-blue-700 font-bold">Ver crachás e aptos</span>
                        ) : (
                          <span className="text-slate-500">Nenhum no momento</span>
                        )}
                      </div>
                    </button>

                    {/* Custódia */}
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('custodia')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'custodia' ? 'ring-2 ring-sky-600 bg-sky-50/50 border-sky-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-sky-700 mb-1">
                        <span className="text-[10px] font-bold uppercase">Custódia Portaria</span>
                        <Box className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.custodia.totalAguardando} item(ns)
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Aguardando retirada
                      </div>
                    </button>

                    {/* Materiais */}
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('materiais')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'materiais' ? 'ring-2 ring-emerald-600 bg-emerald-50/50 border-emerald-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-emerald-700 mb-1">
                        <span className="text-[10px] font-bold uppercase">Inventário do Posto</span>
                        <Radio className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.materiais.totalEquipamentos} equipamentos
                      </div>
                      <div className="text-[10px]">
                        {consolidacao.materiais.avariados > 0 ? (
                          <span className="text-red-600 font-bold">{consolidacao.materiais.avariados} avariado(s)</span>
                        ) : (
                          <span className="text-emerald-600">100% Perfeitos</span>
                        )}
                      </div>
                    </button>

                    {/* Ocorrências Pendentes */}
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('ocorrencias')}
                      className={`p-3 rounded-xl border text-left transition col-span-2 ${
                        moduloAtivo === 'ocorrencias' ? 'ring-2 ring-red-600 bg-red-50/50 border-red-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-red-700 mb-1">
                        <span className="text-[10px] font-bold uppercase flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> Livro de Ocorrências Pendentes
                        </span>
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.ocorrencias.totalPendentes} ocorrência(s) não resolvida(s)
                      </div>
                      <div className="text-[10px]">
                        {consolidacao.ocorrencias.totalPendentes > 0 ? (
                          <span className="text-red-700 font-bold">
                            Mesmo de dias anteriores (sai até ser resolvida!)
                          </span>
                        ) : (
                          <span className="text-emerald-600">Nenhuma pendência</span>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* ABAS / SEÇÕES DETALHADAS DE CADA MÓDULO */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                        {moduloAtivo === 'encomendas' && <><Package className="w-4 h-4 text-purple-600" /> Detalhamento: Encomendas e Lotes de RE</>}
                        {moduloAtivo === 'rondas' && <><Footprints className="w-4 h-4 text-indigo-600" /> Detalhamento: Rondas e Auditoria de Pontos</>}
                        {moduloAtivo === 'chaves' && <><Key className="w-4 h-4 text-amber-600" /> Detalhamento: Chaves Fora do Quadro</>}
                        {moduloAtivo === 'prestadores' && <><HardHat className="w-4 h-4 text-blue-600" /> Detalhamento: Prestadores e Autorizados Presentes</>}
                        {moduloAtivo === 'custodia' && <><Box className="w-4 h-4 text-sky-600" /> Detalhamento: Objetos de Custódia</>}
                        {moduloAtivo === 'materiais' && <><Radio className="w-4 h-4 text-emerald-600" /> Detalhamento: Inventário e Equipamentos</>}
                        {moduloAtivo === 'ocorrencias' && <><AlertTriangle className="w-4 h-4 text-red-600" /> Detalhamento: Ocorrências Pendentes (Sem importar a data!)</>}
                        {moduloAtivo === 'todos' && <><ShieldCheck className="w-4 h-4 text-emerald-600" /> Visão Consolidada Completa</>}
                      </span>

                      <button
                        type="button"
                        onClick={() => setModuloAtivo('todos')}
                        className={`text-[10px] font-bold px-2 py-1 rounded transition ${
                          moduloAtivo === 'todos' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Ver Todos
                      </button>
                    </div>

                    {/* SEÇÃO 1: RE / ENCOMENDAS */}
                    {(moduloAtivo === 'todos' || moduloAtivo === 'encomendas') && (
                      <div className="bg-white p-3.5 rounded-xl border border-purple-100 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-purple-950 flex items-center gap-1.5 font-bold uppercase">
                            <Package className="w-4 h-4 text-purple-600" /> Módulo 02 - Encomendas & REs
                          </strong>
                          <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded">
                            {consolidacao.encomendas.totalRetidasNoPosto} pacote(s) retidos no posto
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                          <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-100">
                            <span className="text-[10px] text-purple-700 block">REs no Turno:</span>
                            <strong className="text-purple-950">{consolidacao.encomendas.totalRePlantao} recebida(s)</strong>
                          </div>
                          <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                            <span className="text-[10px] text-amber-800 block">Faltam Triagem:</span>
                            <strong className="text-amber-950">{consolidacao.encomendas.reFaltandoTriagem} RE(s) pendente(s)</strong>
                          </div>
                          <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                            <span className="text-[10px] text-amber-800 block">Qtd a Triar:</span>
                            <strong className="text-amber-950">{consolidacao.encomendas.qtdFaltaTriagem} pacote(s)</strong>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                            <span className="text-[10px] text-emerald-700 block">Triados no Turno:</span>
                            <strong className="text-emerald-950">{consolidacao.encomendas.qtdPacotesTriadosPlantao} pacote(s)</strong>
                          </div>
                          <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <span className="text-[10px] text-blue-700 block">Entregues no Turno:</span>
                            <strong className="text-blue-950">{consolidacao.encomendas.qtdPacotesRetiradosPlantao} pacote(s)</strong>
                          </div>
                        </div>

                        {consolidacao.encomendas.lotesPendentes.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase text-amber-800 block">
                              ⚠️ REs Aguardando / Em Triagem:
                            </span>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {consolidacao.encomendas.lotesPendentes.map((lote) => (
                                <div key={lote.id} className="text-[11px] bg-amber-50/80 p-2 rounded-lg border border-amber-200 flex justify-between items-center">
                                  <div>
                                    <strong className="text-amber-950">{lote.codigo}</strong> — {lote.entregadorEmpresa} ({lote.entregadorNome})
                                  </div>
                                  <div className="text-amber-900 font-bold">
                                    Faltam {lote.qtdDeclarada - lote.qtdTriada} de {lote.qtdDeclarada} vol.
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SEÇÃO 2: RONDAS */}
                    {(moduloAtivo === 'todos' || moduloAtivo === 'rondas') && (
                      <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-indigo-950 flex items-center gap-1.5 font-bold uppercase">
                            <Footprints className="w-4 h-4 text-indigo-600" /> Módulo 07 - Rondas Patrimoniais
                          </strong>
                          <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">
                            {consolidacao.rondas.totalExecutadasPlantao} executada(s) no plantão
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                            <span className="text-[10px] text-indigo-700 block">Total no Plantão:</span>
                            <strong className="text-indigo-950">{consolidacao.rondas.totalExecutadasPlantao}</strong>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                            <span className="text-[10px] text-emerald-700 block">100% Concluídas:</span>
                            <strong className="text-emerald-950">{consolidacao.rondas.concluidas}</strong>
                          </div>
                          <div className={`p-2 rounded-lg border ${consolidacao.rondas.incompletas > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                            <span className={`text-[10px] block ${consolidacao.rondas.incompletas > 0 ? 'text-red-700' : 'text-slate-500'}`}>Incompletas / Falhas:</span>
                            <strong className={consolidacao.rondas.incompletas > 0 ? 'text-red-950' : 'text-slate-700'}>{consolidacao.rondas.incompletas}</strong>
                          </div>
                        </div>

                        {consolidacao.rondas.temDivergencias && (
                          <div className="bg-red-50 p-2.5 rounded-lg border border-red-200 space-y-1">
                            <span className="text-[10px] font-bold text-red-800 uppercase flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Erros & Divergências Detectadas nas Rondas:
                            </span>
                            <ul className="text-[11px] text-red-900 space-y-0.5 list-disc pl-4">
                              {consolidacao.rondas.listaDivergencias.map((div, i) => (
                                <li key={i}>{div}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SEÇÃO 3: CHAVES FORA DO QUADRO */}
                    {(moduloAtivo === 'todos' || moduloAtivo === 'chaves') && (
                      <div className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-amber-950 flex items-center gap-1.5 font-bold uppercase">
                            <Key className="w-4 h-4 text-amber-600" /> Módulo 05 - Quadro de Chaves
                          </strong>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            consolidacao.chaves.totalFora > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {consolidacao.chaves.totalFora > 0 ? `${consolidacao.chaves.totalFora} chave(s) fora` : 'Todas no quadro'}
                          </span>
                        </div>

                        {consolidacao.chaves.totalFora > 0 ? (
                          <div className="space-y-2 pt-1">
                            <span className="text-[10px] font-bold text-amber-800 uppercase block">
                              Chaves Fora do Quadro — Qual é e com quem está:
                            </span>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {consolidacao.chaves.listaChavesFora.map((k) => (
                                <div key={k.id} className="p-2.5 rounded-lg border bg-amber-50/70 border-amber-200 text-xs space-y-1">
                                  <div className="flex justify-between items-center">
                                    <strong className="text-amber-950 flex items-center gap-1">
                                      <Key className="w-3.5 h-3.5 text-amber-700" /> {k.nomeChave} ({k.codigoChave}) — Setor {k.setor}
                                    </strong>
                                    {k.atrasado && (
                                      <span className="bg-red-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded uppercase">
                                        Devolução Atrasada!
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-700">
                                    <div>
                                      👤 <strong>Com quem tá:</strong> {k.comQuemTa} ({k.empresaOuApto})
                                    </div>
                                    <div>
                                      📄 <strong>Doc:</strong> {k.documento} | 📞 {k.telefone}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      🕒 Retirada: {new Date(k.retiradaEm).toLocaleString('pt-BR')}
                                    </div>
                                    {k.motivo && (
                                      <div className="text-[10px] text-slate-600 italic">
                                        Motivo: {k.motivo}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-700 italic">
                            ✓ Nenhuma chave fora do quadro. Todas conferidas no painel físico.
                          </p>
                        )}
                      </div>
                    )}

                    {/* SEÇÃO 4: PRESTADORES E AUTORIZADOS */}
                    {(moduloAtivo === 'todos' || moduloAtivo === 'prestadores') && (
                      <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-blue-950 flex items-center gap-1.5 font-bold uppercase">
                            <HardHat className="w-4 h-4 text-blue-600" /> Módulo 06 - Prestadores & Autorizados no Condomínio
                          </strong>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            consolidacao.prestadores.totalPresentes > 0 ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {consolidacao.prestadores.totalPresentes} presente(s)
                          </span>
                        </div>

                        {consolidacao.prestadores.totalPresentes > 0 ? (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {consolidacao.prestadores.listaPresentes.map((p) => (
                              <div key={p.id} className="p-2.5 rounded-lg border bg-blue-50/60 border-blue-200 text-xs flex justify-between items-start">
                                <div>
                                  <strong className="text-blue-950">{p.nome}</strong> ({p.empresa})
                                  <p className="text-[11px] text-slate-600">
                                    🏢 Destino: <strong>{p.destino}</strong> | Crachá: <strong>{p.cracha}</strong>
                                  </p>
                                  <span className="text-[10px] text-slate-500">
                                    Entrada: {new Date(p.entradaEm).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Doc: {p.documento}
                                  </span>
                                </div>
                                <span className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                  No Condomínio
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 italic">
                            Nenhum prestador ou terceiro com crachá ativo dentro do condomínio no momento.
                          </p>
                        )}
                      </div>
                    )}

                    {/* SEÇÃO 5: CUSTÓDIA */}
                    {(moduloAtivo === 'todos' || moduloAtivo === 'custodia') && (
                      <div className="bg-white p-3.5 rounded-xl border border-sky-100 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-sky-950 flex items-center gap-1.5 font-bold uppercase">
                            <Box className="w-4 h-4 text-sky-600" /> Módulo 03 - Custódia de Objetos na Portaria
                          </strong>
                          <span className="text-[10px] font-bold text-sky-900 bg-sky-100 px-2 py-0.5 rounded">
                            {consolidacao.custodia.totalAguardando} item(ns) aguardando retirada
                          </span>
                        </div>

                        {consolidacao.custodia.totalAguardando > 0 ? (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {consolidacao.custodia.listaCustodias.map((c) => (
                              <div key={c.id} className="p-2 rounded-lg border bg-sky-50/50 border-sky-200 text-xs flex justify-between items-center">
                                <div>
                                  <strong className="text-sky-950">[{c.codigo}] {c.descricao}</strong>
                                  <p className="text-[11px] text-slate-600">
                                    De: {c.origem} ➔ Para: {c.destino}
                                  </p>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(c.entradaEm).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 italic">
                            Nenhum item sob custódia temporária na guarita.
                          </p>
                        )}
                      </div>
                    )}

                    {/* SEÇÃO 6: MATERIAIS */}
                    {(moduloAtivo === 'todos' || moduloAtivo === 'materiais') && (
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-emerald-950 flex items-center gap-1.5 font-bold uppercase">
                            <Radio className="w-4 h-4 text-emerald-600" /> Módulo 04 - Inventário & Materiais do Posto
                          </strong>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            consolidacao.materiais.avariados > 0 ? 'bg-red-100 text-red-900' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {consolidacao.materiais.avariados > 0 ? `${consolidacao.materiais.avariados} avaria(s)` : '100% Operacional'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-500 block">Total Inventariado:</span>
                            <strong className="text-slate-900">{consolidacao.materiais.totalEquipamentos} itens</strong>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                            <span className="text-[10px] text-emerald-700 block">100% Perfeitos:</span>
                            <strong className="text-emerald-950">{consolidacao.materiais.perfeitos} itens</strong>
                          </div>
                          <div className={`p-2 rounded-lg border ${consolidacao.materiais.avariados > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                            <span className={`text-[10px] block ${consolidacao.materiais.avariados > 0 ? 'text-red-700' : 'text-slate-500'}`}>Com Avaria / Manutenção:</span>
                            <strong className={consolidacao.materiais.avariados > 0 ? 'text-red-950' : 'text-slate-700'}>{consolidacao.materiais.avariados} itens</strong>
                          </div>
                        </div>

                        {consolidacao.materiais.listaAvariados.length > 0 && (
                          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg space-y-1">
                            <span className="text-[10px] font-bold uppercase text-red-800 block">
                              Equipamentos com Avaria Mapeada:
                            </span>
                            <div className="space-y-1">
                              {consolidacao.materiais.listaAvariados.map((m) => (
                                <div key={m.id} className="text-xs text-red-950 flex justify-between">
                                  <span><strong>{m.nome}</strong> ({m.categoria})</span>
                                  <span className="text-red-700 italic">{m.observacao || m.estado}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {consolidacao.materiais.alteracoesPlantao.length > 0 && (
                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-700 block">
                              📝 Alterações, Adições ou Exclusões no Plantão:
                            </span>
                            <div className="space-y-1 text-[11px] text-slate-700">
                              {consolidacao.materiais.alteracoesPlantao.map((alt, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <span>
                                    <strong>[{alt.tipo}]</strong> {alt.detalhe?.nome || 'Item'} — {alt.detalhe?.observacao || alt.detalhe?.estado || ''}
                                  </span>
                                  <span className="text-[10px] text-slate-400">por {alt.operador}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SEÇÃO 7: OCORRÊNCIAS PENDENTES (MESMO HÁ 10+ DIAS!) */}
                    {(moduloAtivo === 'todos' || moduloAtivo === 'ocorrencias') && (
                      <div className="bg-white p-3.5 rounded-xl border border-red-200 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-red-950 flex items-center gap-1.5 font-bold uppercase">
                            <AlertTriangle className="w-4 h-4 text-red-600" /> Módulo 08 - Livro de Ocorrências Pendentes
                          </strong>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            consolidacao.ocorrencias.totalPendentes > 0 ? 'bg-red-100 text-red-900' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {consolidacao.ocorrencias.totalPendentes} pendência(s) em aberto
                          </span>
                        </div>

                        {consolidacao.ocorrencias.totalPendentes > 0 ? (
                          <div className="space-y-2">
                            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 font-medium">
                              ⚠️ <strong>Atenção Obrigatória:</strong> As ocorrências abaixo continuam em aberto e exigem atenção contínua do próximo operador, independente de quantos dias já se passaram!
                            </div>

                            <div className="space-y-2 max-h-56 overflow-y-auto">
                              {consolidacao.ocorrencias.listaPendentes.map((oco) => (
                                <div key={oco.id} className="p-3 bg-red-50/50 rounded-lg border border-red-200 text-xs space-y-1.5">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <strong className="text-slate-900 text-sm block">{oco.titulo}</strong>
                                      <span className="text-[10px] text-slate-500">
                                        Local: {oco.unidadeBloco || 'Área Geral'} • Tipo: {oco.tipo} • Registrado por: {oco.operador}
                                      </span>
                                    </div>

                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                      <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-xs">
                                        🚨 Há {oco.diasEmAberto} dia(s) em aberto!
                                      </span>
                                      <span className="text-[9px] font-bold uppercase text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                                        Prioridade {oco.prioridade}
                                      </span>
                                    </div>
                                  </div>

                                  <p className="text-slate-700 text-xs italic bg-white/80 p-2 rounded border border-red-100">
                                    "{oco.descricao}"
                                  </p>

                                  <div className="text-[10px] text-slate-400">
                                    Aberta em: {new Date(oco.criadaEm).toLocaleString('pt-BR')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-700 italic">
                            ✓ Nenhuma ocorrência pendente no livro. Todas resolvidas ou finalizadas!
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CHECKLIST FÍSICO DA GUARITA */}
                  <div className="space-y-2 border-t pt-3 bg-white p-4 rounded-xl border">
                    <label className="block text-xs font-bold text-slate-800 uppercase">
                      Checklist Físico Obrigatório da Guarita
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <button type="button" onClick={() => toggleChecklist('encomendasOk')} className="flex items-center gap-2 text-left p-1.5 rounded hover:bg-slate-50">
                        {checklist.encomendasOk ? <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        <span>Volumes físicos de encomendas conferidos com saldo retido.</span>
                      </button>

                      <button type="button" onClick={() => toggleChecklist('custodiaOk')} className="flex items-center gap-2 text-left p-1.5 rounded hover:bg-slate-50">
                        {checklist.custodiaOk ? <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        <span>Itens de custódia na portaria conferidos.</span>
                      </button>

                      <button type="button" onClick={() => toggleChecklist('chavesOk')} className="flex items-center gap-2 text-left p-1.5 rounded hover:bg-slate-50">
                        {checklist.chavesOk ? <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        <span>Quadro de chaves confere com devoluções e retiradas ativas.</span>
                      </button>

                      <button type="button" onClick={() => toggleChecklist('materiaisOk')} className="flex items-center gap-2 text-left p-1.5 rounded hover:bg-slate-50">
                        {checklist.materiaisOk ? <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        <span>HTs, celulares e lanternas testados e carregando.</span>
                      </button>

                      <button type="button" onClick={() => toggleChecklist('rondasOk')} className="flex items-center gap-2 text-left p-1.5 rounded hover:bg-slate-50">
                        {checklist.rondasOk ? <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        <span>Relatório de rondas e divergências GPS/NFC verificado.</span>
                      </button>

                      <button type="button" onClick={() => toggleChecklist('prestadoresOk')} className="flex items-center gap-2 text-left p-1.5 rounded hover:bg-slate-50">
                        {checklist.prestadoresOk ? <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        <span>Prestadores e crachás ativos no condomínio conferidos.</span>
                      </button>

                      <button type="button" onClick={() => toggleChecklist('ocorrenciasCientes')} className="flex items-center gap-2 text-left p-1.5 rounded hover:bg-slate-50">
                        {checklist.ocorrenciasCientes ? <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        <span>Ciente de todas as ocorrências pendentes (mesmo de 10+ dias).</span>
                      </button>

                      <button type="button" onClick={() => toggleChecklist('limpezaOk')} className="flex items-center gap-2 text-left p-1.5 rounded hover:bg-slate-50">
                        {checklist.limpezaOk ? <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        <span>Guarita e bancadas limpas e organizadas.</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEtapa(2)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition uppercase shadow-md"
                  >
                    Avançar para Observações & Divergências <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {etapa === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                      Recados, Avisos e Instruções do Turno
                    </label>
                    <textarea
                      rows={4}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Avisos sobre agendamentos de mudanças, moradores, entregas programadas, alertas de segurança para o próximo operador..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    ></textarea>
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Registrar Divergência Encontrada
                      </label>
                      <input
                        type="checkbox"
                        checked={temDivergencia}
                        onChange={(e) => setTemDivergencia(e.target.checked)}
                        className="w-4 h-4 rounded accent-amber-600 cursor-pointer"
                      />
                    </div>

                    {temDivergencia && (
                      <textarea
                        rows={3}
                        required
                        value={divergencia}
                        onChange={(e) => setDivergencia(e.target.value)}
                        placeholder="Descreva detalhadamente a divergência notada (ex: volume de encomenda não encontrado fisicamente, chave em falta sem registro, equipamento com defeito não informado)..."
                        className="w-full p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs"
                      ></textarea>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEtapa(1)}
                      className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-xs transition"
                    >
                      Voltar à Consolidação
                    </button>
                    <button
                      type="button"
                      onClick={() => setEtapa(3)}
                      className="w-2/3 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1 transition uppercase shadow-md"
                    >
                      Avançar para Dupla Assinatura Digital <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {etapa === 3 && (
                <form onSubmit={realizarPassagemPosto} className="space-y-4">
                  <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 space-y-3">
                    <label className="block text-xs font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-emerald-700" /> Autenticação do Operador Entrante (Dupla Assinatura)
                    </label>
                    <p className="text-[11px] text-emerald-800">
                      O operador que está assumindo o posto deve inserir seu login e senha abaixo para validar a auditoria e autenticar a troca de turno.
                    </p>

                    <div className="space-y-2">
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        <input
                          type="text"
                          required
                          value={loginEntrante}
                          onChange={(e) => setLoginEntrante(e.target.value)}
                          placeholder="Login do Operador Entrante"
                          className="w-full pl-9 pr-3 py-3 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        />
                      </div>

                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        <input
                          type="password"
                          required
                          value={senhaEntrante}
                          onChange={(e) => setSenhaEntrante(e.target.value)}
                          placeholder="Senha do Operador Entrante"
                          className="w-full pl-9 pr-3 py-3 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEtapa(2)}
                      className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-xs transition"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl uppercase text-xs transition shadow-md flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Assinando e Finalizando...
                        </>
                      ) : (
                        'Assinar e Finalizar Passagem de Posto'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DO RELATÓRIO HISTÓRICO */}
      {modalHistoricoDetalhes && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setModalHistoricoDetalhes(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b pb-3 pr-8">
              <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded">
                Snapshot Histórico de Auditoria
              </span>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2 mt-1">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                Passagem {modalHistoricoDetalhes.codigo}
              </h3>
              <p className="text-xs text-slate-500">
                Registrada em {new Date(modalHistoricoDetalhes.created_at).toLocaleString('pt-BR')} por {modalHistoricoDetalhes.operador_sainte_nome} para {modalHistoricoDetalhes.operador_entrante_nome}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              {/* Observações */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Observações do Turno:</strong>
                <p className="italic text-slate-700">"{modalHistoricoDetalhes.observacoes}"</p>
              </div>

              {modalHistoricoDetalhes.divergencia && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <strong className="block text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Divergência Registrada:
                  </strong>
                  <p>{modalHistoricoDetalhes.divergencia}</p>
                </div>
              )}

              {/* Snapshot Detalhado */}
              <div className="space-y-3">
                <h5 className="font-bold uppercase text-[11px] text-slate-700 border-b pb-1">
                  Módulos Consolidados no Momento da Troca:
                </h5>

                {/* Encomendas */}
                <div className="p-3 rounded-xl border border-purple-100 bg-purple-50/30 space-y-1">
                  <div className="font-bold text-purple-950 flex items-center gap-1.5 uppercase text-[11px]">
                    <Package className="w-3.5 h-3.5 text-purple-600" /> Módulo Encomendas & RE
                  </div>
                  <p className="text-slate-600">
                    Retidas no posto: <strong>{modalHistoricoDetalhes.pendencias?.encomendas?.totalRetidasNoPosto ?? modalHistoricoDetalhes.pendencias?.encomendasPendentes ?? 0} vol.</strong> • 
                    REs no turno: <strong>{modalHistoricoDetalhes.pendencias?.encomendas?.totalRePlantao ?? 'N/A'}</strong> • 
                    Triadas no turno: <strong>{modalHistoricoDetalhes.pendencias?.encomendas?.qtdPacotesTriadosPlantao ?? 'N/A'}</strong> • 
                    Entregues no turno: <strong>{modalHistoricoDetalhes.pendencias?.encomendas?.qtdPacotesRetiradosPlantao ?? 'N/A'}</strong>
                  </p>
                </div>

                {/* Rondas */}
                <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-1">
                  <div className="font-bold text-indigo-950 flex items-center gap-1.5 uppercase text-[11px]">
                    <Footprints className="w-3.5 h-3.5 text-indigo-600" /> Módulo Rondas Patrimoniais
                  </div>
                  <p className="text-slate-600">
                    Total executadas: <strong>{modalHistoricoDetalhes.pendencias?.rondas?.totalExecutadasPlantao ?? modalHistoricoDetalhes.pendencias?.rondasUltimas12h ?? 0}</strong> • 
                    Status: <strong>{modalHistoricoDetalhes.pendencias?.ultimaRondaStatus || 'Auditada'}</strong>
                  </p>
                </div>

                {/* Chaves Fora */}
                <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/30 space-y-1">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5 uppercase text-[11px]">
                    <Key className="w-3.5 h-3.5 text-amber-600" /> Módulo Quadro de Chaves
                  </div>
                  <p className="text-slate-600">
                    Chaves fora do quadro: <strong>{modalHistoricoDetalhes.pendencias?.chaves?.totalFora ?? modalHistoricoDetalhes.pendencias?.chavesFora ?? 0}</strong>
                  </p>
                  {((modalHistoricoDetalhes.pendencias?.chaves?.listaChavesFora || modalHistoricoDetalhes.pendencias?.listaChaves || []).length > 0) && (
                    <div className="pt-1 space-y-1">
                      {(modalHistoricoDetalhes.pendencias?.chaves?.listaChavesFora || modalHistoricoDetalhes.pendencias?.listaChaves || []).map((k: any, idx: number) => (
                        <div key={idx} className="bg-white p-2 rounded border border-amber-200 text-[11px]">
                          <strong>{k.nomeChave || k.nome_chave} ({k.codigoChave || k.codigo_chave})</strong> — Com quem: {k.comQuemTa || k.nome_retirante} ({k.empresaOuApto || k.empresa_ou_apto})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ocorrências */}
                <div className="p-3 rounded-xl border border-red-100 bg-red-50/30 space-y-1">
                  <div className="font-bold text-red-950 flex items-center gap-1.5 uppercase text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Módulo Ocorrências Pendentes
                  </div>
                  <p className="text-slate-600">
                    Pendências abertas: <strong>{modalHistoricoDetalhes.pendencias?.ocorrencias?.totalPendentes ?? modalHistoricoDetalhes.pendencias?.ocorrenciasAbertas ?? 0}</strong>
                  </p>
                  {((modalHistoricoDetalhes.pendencias?.ocorrencias?.listaPendentes || modalHistoricoDetalhes.pendencias?.listaOcorrencias || []).length > 0) && (
                    <div className="pt-1 space-y-1">
                      {(modalHistoricoDetalhes.pendencias?.ocorrencias?.listaPendentes || modalHistoricoDetalhes.pendencias?.listaOcorrencias || []).map((o: any, idx: number) => (
                        <div key={idx} className="bg-white p-2 rounded border border-red-200 text-[11px]">
                          <strong>{o.titulo}</strong> ({o.prioridade}) — Há {o.diasEmAberto ?? 'X'} dia(s) em aberto!
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-between items-center">
              <button
                onClick={() => setModalHistoricoDetalhes(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Fechar
              </button>
              <a
                href={gerarLinkWhatsApp(modalHistoricoDetalhes)}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
              >
                <MessageCircle className="w-4 h-4" /> Enviar para WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
