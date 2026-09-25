import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Settings, 
  Sliders, 
  MessageSquare, 
  PhoneCall, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Plus, 
  Trash2, 
  Phone, 
  Send, 
  FileSpreadsheet,
  Package,
  Archive,
  Briefcase,
  Key,
  Wrench,
  ShieldCheck,
  BookOpen,
  ArrowRightLeft,
  HardHat,
  Database,
  Sparkles,
  Copy,
  Check,
  Boxes,
  MapPin,
  Edit3,
  ToggleLeft,
  ToggleRight,
  X
} from 'lucide-react';
import SupabaseDoctorModal from '../components/SupabaseDoctorModal';
import { generateMigrationSql } from '../services/databaseDoctor';

export interface LocalArmazenamento {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  capacidade: string;
  observacao: string;
  ativo: boolean;
}

export const LOCAIS_ARMAZENAMENTO_PADRAO: LocalArmazenamento[] = [
  { id: '1', codigo: 'PRAT-A1', nome: 'Prateleira A1 - Caixas Pequenas', categoria: 'Prateleira', capacidade: 'Até 25 pacotes', observacao: 'Volumes leves e encomendas pequenas', ativo: true },
  { id: '2', codigo: 'PRAT-A2', nome: 'Prateleira A2 - Caixas Médias', categoria: 'Prateleira', capacidade: 'Até 15 pacotes', observacao: 'Volumes médios e caixas padrão', ativo: true },
  { id: '3', codigo: 'GAV-01', nome: 'Gaveta 01 - Cartas & Envelopes', categoria: 'Gaveta', capacidade: 'Até 60 itens', observacao: 'Correspondências, cartões e documentos', ativo: true },
  { id: '4', codigo: 'ARM-01', nome: 'Armário Trancado 01', categoria: 'Armário', capacidade: 'Restrito', observacao: 'Itens de valor, eletrônicos e celulares', ativo: true },
  { id: '5', codigo: 'CHAO-01', nome: 'Chão / Área de Volumosos', categoria: 'Chão / Palete', capacidade: 'Grandes volumes', observacao: 'Eletrodomésticos, TVs e móveis', ativo: true },
  { id: '6', codigo: 'BANCADA', nome: 'Bancada Principal de Triagem', categoria: 'Bancada', capacidade: 'Saída rápida', observacao: 'Pacotes em trânsito para retirada no dia', ativo: true }
];

interface ConfiguracoesProps {
  usuarioLogado?: any;
  onConfigSalva?: (payload: any) => void;
}

export default function Configuracoes({ usuarioLogado, onConfigSalva }: ConfiguracoesProps) {
  const [abaAtiva, setAbaAtiva] = useState<'flags' | 'templates' | 'emergencia' | 'backup' | 'supabase' | 'locais_triagem'>('flags');
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [modalDoctorAberto, setModalDoctorAberto] = useState(false);
  const [copiadoSql, setCopiadoSql] = useState(false);

  const [listaCondominios, setListaCondominios] = useState<any[]>([]);
  const [condominioBackupId, setCondominioBackupId] = useState(usuarioLogado?.condominio_id || '');

  const [config, setConfig] = useState<Record<string, any>>({
    id: null,
    mod02_gestao_encomendas: true,
    mod03_custodia_itens: true,
    mod04_materiais_posto: true,
    mod05_quadro_chaves: true,
    mod06_gestao_manutencao: true,
    mod07_gestao_ronda: true,
    mod08_livro_ocorrencias: true,
    mod09_passagem_posto: true,
    mod10_prestadores_servico: true
  });

  const [templates, setTemplates] = useState<any[]>([]);
  const [templateSelecionado, setTemplateSelecionado] = useState({
    codigo_evento: 'ENCOMENDA_CHEGOU',
    canal_destino: 'Morador Direct',
    corpo_texto: 'Olá {NOME_MORADOR}, sua encomenda {CODIGO} chegou na portaria do condomínio e está disponível para retirada!'
  });

  const [contatos, setContatos] = useState<any[]>([]);
  const [novoContato, setNovoContato] = useState({
    categoria: 'Órgão Público',
    nome_descricao: '',
    telefone_principal: '',
    telefone_whatsapp: '',
    exibir_menu_flutuante: true
  });

  // Estado para Locais de Triagem & Armazenamento (Tabela)
  const [locaisArmazenamento, setLocaisArmazenamento] = useState<LocalArmazenamento[]>([]);
  const [modalLocalAberto, setModalLocalAberto] = useState(false);
  const [editandoLocalId, setEditandoLocalId] = useState<string | null>(null);
  const [filtroLocais, setFiltroLocais] = useState('');
  const [formLocal, setFormLocal] = useState({
    codigo: '',
    nome: '',
    categoria: 'Prateleira',
    capacidade: 'Até 20 pacotes',
    observacao: '',
    ativo: true
  });

  const modulosVisual = [
    { 
      key: 'mod02_gestao_encomendas', 
      moduloNum: '02',
      titulo: 'Módulo 02 - Encomendas & Triagem RE', 
      desc: 'Lotes de entregas, leitura de etiquetas e baixa com foto', 
      icon: Package 
    },
    { 
      key: 'mod03_custodia_itens', 
      moduloNum: '03',
      titulo: 'Módulo 03 - Custódia de Itens', 
      desc: 'Guarda de chaves, envelopes e pertences de terceiros/moradores com alerta de 48h', 
      icon: Archive 
    },
    { 
      key: 'mod04_materiais_posto', 
      moduloNum: '04',
      titulo: 'Módulo 04 - Materiais & Inventário do Posto', 
      desc: 'Rádios HT, lanternas, bastões e controles da guarita', 
      icon: Briefcase 
    },
    { 
      key: 'mod05_quadro_chaves', 
      moduloNum: '05',
      titulo: 'Módulo 05 - Claviculário Digital de Chaves', 
      desc: 'Controle de retirada por morador/terceiro com horário limite de devolução', 
      icon: Key 
    },
    { 
      key: 'mod06_gestao_manutencao', 
      moduloNum: '06',
      titulo: 'Módulo 06 - Gestão de Manutenção & OS', 
      desc: 'Abertura de chamados com foto antes/depois e checklists diário/semanal/mensal', 
      icon: Wrench 
    },
    { 
      key: 'mod07_gestao_ronda', 
      moduloNum: '07',
      titulo: 'Módulo 07 - Ronda Patrimonial (GPS & QR/NFC)', 
      desc: 'Leitura de pontos georreferenciados e alerta sonoro de próxima ronda', 
      icon: ShieldCheck 
    },
    { 
      key: 'mod08_livro_ocorrencias', 
      moduloNum: '08',
      titulo: 'Módulo 08 - Livro de Ocorrências (Foto & Áudio)', 
      desc: 'Registro interno do posto com áudio narrado e fluxo de resolução', 
      icon: BookOpen 
    },
    { 
      key: 'mod09_passagem_posto', 
      moduloNum: '09',
      titulo: 'Módulo 09 - Passagem de Posto Auditada', 
      desc: 'Consolidação de pendências de todos os módulos e dupla validação de PIN', 
      icon: ArrowRightLeft 
    },
    { 
      key: 'mod10_prestadores_servico', 
      moduloNum: '10',
      titulo: 'Módulo 10 - Autorizados (Visitas, Diaristas e Obras)', 
      desc: 'Pré-autorizações com vigência e entrada com 1 toque sem exigência de docs', 
      icon: HardHat 
    }
  ];

  useEffect(() => {
    carregarCondominios();
    if (usuarioLogado?.condominio_id) {
      carregarConfiguracoes();
      carregarTemplates();
      carregarContatosEmergencia();
      carregarLocaisArmazenamento();
    }
  }, [usuarioLogado?.condominio_id]);

  const carregarCondominios = async () => {
    try {
      const { data, error } = await supabase
        .from('condominios')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setListaCondominios(data || []);

      if (!condominioBackupId && data && data.length > 0) {
        setCondominioBackupId(data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar lista de condomínios:', err);
    }
  };

  const carregarConfiguracoes = async () => {
    try {
      // 1. Tenta cache do localStorage primeiro para resposta instantânea
      const cached = localStorage.getItem(`infport_flags_${usuarioLogado.condominio_id}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setConfig(prev => ({
            ...prev,
            ...parsed,
            mod02_gestao_encomendas: parsed.mod02_gestao_encomendas ?? true,
            mod03_custodia_itens: parsed.mod03_custodia_itens ?? true
          }));
        } catch {
          // ignore
        }
      }

      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const flagsJson = typeof data.feature_flags === 'object' && data.feature_flags !== null ? data.feature_flags : {};

        const novasConfig = {
          id: data.id,
          mod02_gestao_encomendas: data.mod02_gestao_encomendas ?? flagsJson.mod02_gestao_encomendas ?? true,
          mod03_custodia_itens: data.mod03_custodia_itens ?? flagsJson.mod03_custodia_itens ?? true,
          mod04_materiais_posto: data.mod04_materiais_posto ?? data.mod04_materials_posto ?? flagsJson.mod04_materiais_posto ?? true,
          mod05_quadro_chaves: data.mod05_quadro_chaves ?? flagsJson.mod05_quadro_chaves ?? true,
          mod06_gestao_manutencao: data.mod06_gestao_manutencao ?? flagsJson.mod06_gestao_manutencao ?? true,
          mod07_gestao_ronda: data.mod07_gestao_ronda ?? flagsJson.mod07_gestao_ronda ?? true,
          mod08_livro_ocorrencias: data.mod08_livro_ocorrencias ?? flagsJson.mod08_livro_ocorrencias ?? true,
          mod09_passagem_posto: data.mod09_passagem_posto ?? flagsJson.mod09_passagem_posto ?? true,
          mod10_prestadores_servico: data.mod10_prestadores_servico ?? flagsJson.mod10_prestadores_servico ?? true
        };

        setConfig(novasConfig);
        localStorage.setItem(`infport_flags_${usuarioLogado.condominio_id}`, JSON.stringify(novasConfig));
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    }
  };

  const carregarTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates_whatsapp')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id);

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
    }
  };

  const carregarContatosEmergencia = async () => {
    try {
      const { data, error } = await supabase
        .from('agenda_emergencia')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('categoria', { ascending: true });

      if (error) throw error;
      setContatos(data || []);
    } catch (err) {
      console.error('Erro ao carregar contatos de emergência:', err);
    }
  };

  const carregarLocaisArmazenamento = async () => {
    const targetCondoId = usuarioLogado?.condominio_id;
    if (!targetCondoId) return;

    try {
      // 1. Tentar ler do localStorage para resposta imediata
      const cached = localStorage.getItem(`infport_locais_${targetCondoId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLocaisArmazenamento(parsed);
          }
        } catch {
          // ignore
        }
      }

      // 2. Tenta buscar da tabela dedicada locais_armazenamento
      const { data: locaisTabela, error: errTabela } = await supabase
        .from('locais_armazenamento')
        .select('*')
        .eq('condominio_id', targetCondoId)
        .order('codigo', { ascending: true });

      if (!errTabela && locaisTabela && locaisTabela.length > 0) {
        setLocaisArmazenamento(locaisTabela);
        localStorage.setItem(`infport_locais_${targetCondoId}`, JSON.stringify(locaisTabela));
        return;
      }

      // 3. Fallback: Tenta buscar da coluna locais_armazenamento na tabela configuracoes
      const { data: configData } = await supabase
        .from('configuracoes')
        .select('locais_armazenamento')
        .eq('condominio_id', targetCondoId)
        .maybeSingle();

      if (configData?.locais_armazenamento && Array.isArray(configData.locais_armazenamento) && configData.locais_armazenamento.length > 0) {
        setLocaisArmazenamento(configData.locais_armazenamento);
        localStorage.setItem(`infport_locais_${targetCondoId}`, JSON.stringify(configData.locais_armazenamento));
        return;
      }

      // 4. Se não existir nada cadastrado ainda, inicializa com os locais padrão
      setLocaisArmazenamento(LOCAIS_ARMAZENAMENTO_PADRAO);
      localStorage.setItem(`infport_locais_${targetCondoId}`, JSON.stringify(LOCAIS_ARMAZENAMENTO_PADRAO));
    } catch (err) {
      console.error('Erro ao carregar locais de armazenamento:', err);
      if (locaisArmazenamento.length === 0) {
        setLocaisArmazenamento(LOCAIS_ARMAZENAMENTO_PADRAO);
      }
    }
  };

  const persistirLocais = async (novosLocais: LocalArmazenamento[]) => {
    const targetCondoId = usuarioLogado?.condominio_id;
    if (!targetCondoId) return;

    setLocaisArmazenamento(novosLocais);
    localStorage.setItem(`infport_locais_${targetCondoId}`, JSON.stringify(novosLocais));

    // Notifica outros módulos (como Encomendas) em tempo real
    window.dispatchEvent(new CustomEvent('locais_armazenamento_atualizados', {
      detail: { condominio_id: targetCondoId, locais: novosLocais }
    }));

    // Tenta salvar no Supabase
    try {
      // Salva na tabela configuracoes (JSONB)
      await supabase
        .from('configuracoes')
        .upsert([
          { condominio_id: targetCondoId, locais_armazenamento: novosLocais }
        ], { onConflict: 'condominio_id' });

      // Salva na tabela dedicada se existir
      await supabase
        .from('locais_armazenamento')
        .upsert(
          novosLocais.map(l => ({
            id: l.id && l.id.length > 10 ? l.id : undefined,
            condominio_id: targetCondoId,
            codigo: l.codigo,
            nome: l.nome,
            categoria: l.categoria,
            capacidade: l.capacidade || '',
            observacao: l.observacao || '',
            ativo: l.ativo
          }))
        );
    } catch (e) {
      console.warn('Aviso de persistência de locais:', e);
    }
  };

  const abrirModalNovoLocal = () => {
    setEditandoLocalId(null);
    setFormLocal({
      codigo: '',
      nome: '',
      categoria: 'Prateleira',
      capacidade: 'Até 20 pacotes',
      observacao: '',
      ativo: true
    });
    setModalLocalAberto(true);
  };

  const abrirEdicaoLocal = (local: LocalArmazenamento) => {
    setEditandoLocalId(local.id);
    setFormLocal({
      codigo: local.codigo,
      nome: local.nome,
      categoria: local.categoria || 'Prateleira',
      capacidade: local.capacidade || '',
      observacao: local.observacao || '',
      ativo: local.ativo
    });
    setModalLocalAberto(true);
  };

  const salvarLocalArmazenamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLocal.codigo.trim() || !formLocal.nome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o código e o nome do local de armazenamento.' });
      return;
    }

    const codigoFormatado = formLocal.codigo.trim().toUpperCase();
    let atualizados: LocalArmazenamento[] = [];

    if (editandoLocalId) {
      atualizados = locaisArmazenamento.map(l => {
        if (l.id === editandoLocalId) {
          return {
            ...l,
            codigo: codigoFormatado,
            nome: formLocal.nome.trim(),
            categoria: formLocal.categoria,
            capacidade: formLocal.capacidade.trim(),
            observacao: formLocal.observacao.trim(),
            ativo: formLocal.ativo
          };
        }
        return l;
      });
      setMensagem({ tipo: 'sucesso', texto: `Local "${formLocal.nome}" atualizado na tabela com sucesso!` });
    } else {
      const novoLocal: LocalArmazenamento = {
        id: Date.now().toString(),
        codigo: codigoFormatado,
        nome: formLocal.nome.trim(),
        categoria: formLocal.categoria,
        capacidade: formLocal.capacidade.trim(),
        observacao: formLocal.observacao.trim(),
        ativo: formLocal.ativo
      };
      atualizados = [...locaisArmazenamento, novoLocal];
      setMensagem({ tipo: 'sucesso', texto: `Novo local "${formLocal.nome}" cadastrado na tabela!` });
    }

    await persistirLocais(atualizados);
    setModalLocalAberto(false);
  };

  const toggleStatusLocal = async (id: string) => {
    const atualizados = locaisArmazenamento.map(l => {
      if (l.id === id) {
        return { ...l, ativo: !l.ativo };
      }
      return l;
    });
    await persistirLocais(atualizados);
  };

  const excluirLocalArmazenamento = async (id: string) => {
    const local = locaisArmazenamento.find(l => l.id === id);
    if (!window.confirm(`Tem certeza que deseja remover o local "${local?.nome || id}" da tabela?`)) return;

    const atualizados = locaisArmazenamento.filter(l => l.id !== id);
    await persistirLocais(atualizados);
    setMensagem({ tipo: 'sucesso', texto: 'Local de armazenamento removido da tabela com sucesso!' });
  };

  const salvarParametrizacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    const targetCondoId = usuarioLogado?.condominio_id;
    if (!targetCondoId) {
      setMensagem({ tipo: 'erro', texto: 'Nenhum condomínio ativo selecionado para salvar.' });
      setLoading(false);
      return;
    }

    try {
      // Objeto com as flags dos módulos perfeitamente isoladas
      const featureFlagsJson = {
        mod02_gestao_encomendas: Boolean(config.mod02_gestao_encomendas),
        mod03_custodia_itens: Boolean(config.mod03_custodia_itens),
        mod04_materiais_posto: Boolean(config.mod04_materiais_posto),
        mod05_quadro_chaves: Boolean(config.mod05_quadro_chaves),
        mod06_gestao_manutencao: Boolean(config.mod06_gestao_manutencao),
        mod07_gestao_ronda: Boolean(config.mod07_gestao_ronda),
        mod08_livro_ocorrencias: Boolean(config.mod08_livro_ocorrencias),
        mod09_passagem_posto: Boolean(config.mod09_passagem_posto),
        mod10_prestadores_servico: Boolean(config.mod10_prestadores_servico)
      };

      // Salva imediatamente no localStorage para resposta offline e instantânea
      localStorage.setItem(`infport_flags_${targetCondoId}`, JSON.stringify(featureFlagsJson));

      let salvou = false;

      // 1. Tenta salvar no Supabase incluindo colunas explícitas
      try {
        const payloadCompleto: any = {
          condominio_id: targetCondoId,
          feature_flags: featureFlagsJson,
          mod02_gestao_encomendas: Boolean(config.mod02_gestao_encomendas),
          mod03_custodia_itens: Boolean(config.mod03_custodia_itens),
          mod04_materiais_posto: Boolean(config.mod04_materiais_posto),
          mod05_quadro_chaves: Boolean(config.mod05_quadro_chaves),
          mod06_gestao_manutencao: Boolean(config.mod06_gestao_manutencao),
          mod07_gestao_ronda: Boolean(config.mod07_gestao_ronda),
          mod08_livro_ocorrencias: Boolean(config.mod08_livro_ocorrencias),
          mod09_passagem_posto: Boolean(config.mod09_passagem_posto),
          mod10_prestadores_servico: Boolean(config.mod10_prestadores_servico)
        };

        if (config.id) {
          const { error } = await supabase
            .from('configuracoes')
            .update(payloadCompleto)
            .eq('id', config.id);

          if (!error) salvou = true;
        } else {
          const { data, error } = await supabase
            .from('configuracoes')
            .upsert([payloadCompleto], { onConflict: 'condominio_id' })
            .select()
            .maybeSingle();

          if (!error) {
            salvou = true;
            if (data) setConfig((prev: any) => ({ ...prev, id: data.id }));
          }
        }
      } catch {
        salvou = false;
      }

      // 2. Fallback resiliente: se der erro por coluna específica, salva direto no feature_flags (JSONB)
      if (!salvou) {
        const payloadFallback = {
          condominio_id: targetCondoId,
          feature_flags: featureFlagsJson
        };

        if (config.id) {
          const { error: fallbackErr } = await supabase
            .from('configuracoes')
            .update(payloadFallback)
            .eq('id', config.id);

          if (fallbackErr) throw fallbackErr;
        } else {
          const { data: fbData, error: fallbackErr } = await supabase
            .from('configuracoes')
            .upsert([payloadFallback], { onConflict: 'condominio_id' })
            .select()
            .maybeSingle();

          if (fallbackErr) throw fallbackErr;
          if (fbData) setConfig((prev: any) => ({ ...prev, id: fbData.id }));
        }
      }

      // Dispara evento global para atualizar o App em tempo real
      window.dispatchEvent(new CustomEvent('modulos_atualizados', { 
        detail: { condominio_id: targetCondoId, flags: featureFlagsJson } 
      }));

      setMensagem({ tipo: 'sucesso', texto: 'Parametrização dos módulos salva com sucesso!' });

      if (onConfigSalva) onConfigSalva(featureFlagsJson);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar parametrização: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const salvarTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const payload = {
        condominio_id: usuarioLogado.condominio_id,
        codigo_evento: templateSelecionado.codigo_evento,
        canal_destino: templateSelecionado.canal_destino,
        corpo_texto: templateSelecionado.corpo_texto
      };

      const { error } = await supabase
        .from('templates_whatsapp')
        .upsert([payload]);

      if (error) throw error;

      carregarTemplates();
      setMensagem({ tipo: 'sucesso', texto: 'Template de WhatsApp atualizado com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar template: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const testarTemplate = () => {
    const textoFormatado = `⚙️ *TESTE DE CONFIGURAÇÃO DE TEMPLATE DE WHATSAPP*\n` +
      `Condomínio: ${usuarioLogado?.condominio_nome || 'INFPORT'}\n` +
      `Módulo de Origem: Módulo 11 - Motor de Comunicação\n\n` +
      `• Status da Integração: 🟢 OPERACIONAL\n` +
      `• Modo de Envio: Deep Link Direct (API Nativa)\n` +
      `• Evento: ${templateSelecionado.codigo_evento}\n\n` +
      `*Texto do Template:*\n"${templateSelecionado.corpo_texto}"`;

    window.open(`https://wa.me/?text=${encodeURIComponent(textoFormatado)}`, '_blank');
  };

  const adicionarContato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoContato.nome_descricao || !novoContato.telefone_principal) return;

    setLoading(true);
    try {
      const payload = {
        condominio_id: usuarioLogado.condominio_id,
        ...novoContato
      };

      const { error } = await supabase
        .from('agenda_emergencia')
        .insert([payload]);

      if (error) throw error;

      setNovoContato({
        categoria: 'Órgão Público',
        nome_descricao: '',
        telefone_principal: '',
        telefone_whatsapp: '',
        exibir_menu_flutuante: true
      });
      carregarContatosEmergencia();
      setMensagem({ tipo: 'sucesso', texto: 'Contato de emergência adicionado com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao adicionar contato: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const excluirContato = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agenda_emergencia')
        .delete()
        .eq('id', id);

      if (error) throw error;
      carregarContatosEmergencia();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir contato: ' + err.message });
    }
  };

  const dispararPanico = (contato: any) => {
    const agora = new Date();
    const dataHoraStr = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}H`;

    const textoPanico = `🚨 *ALERTA DE EMERGÊNCIA / PÂNICO ACIONADO NA GUARITA*\n` +
      `Condomínio: ${usuarioLogado?.condominio_nome || 'INFPORT'}\n` +
      `Posto: Guarita Principal\n\n` +
      `• Acionado por: ${usuarioLogado?.login || 'OPERADOR'}\n` +
      `• Tipo de Ocorrência: Solicitação de Apoio Imediato (${contato.nome_descricao})\n` +
      `• Data/Hora do Disparo: ${dataHoraStr}\n\n` +
      `A central da INFPORT e a supervisão foram notificadas. Favor entrar em contato imediato com o posto!`;

    const num = contato.telefone_whatsapp || contato.telefone_principal;
    window.open(`https://wa.me/${num.replace(/\D/g, '')}?text=${encodeURIComponent(textoPanico)}`, '_blank');
  };

  const converterParaCSV = (nomeTabela: string, dados: any[]) => {
    if (!dados || dados.length === 0) {
      return `--- TABELA: ${nomeTabela} ---\nNenhum registro encontrado.\n\n`;
    }

    const colunas = Object.keys(dados[0]);
    let csv = `--- TABELA: ${nomeTabela} ---\n`;
    csv += colunas.join(';') + '\n';

    dados.forEach((row) => {
      const linha = colunas.map((col) => {
        let val = row[col];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') val = JSON.stringify(val);
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      });
      csv += linha.join(';') + '\n';
    });

    return csv + '\n';
  };

  const gerarBackupExcelCondominio = async () => {
    setExportando(true);
    setMensagem({ tipo: 'sucesso', texto: 'Extraindo dados e gerando arquivo formatado para Excel...' });

    try {
      const targetCondoId = condominioBackupId;
      const condoObj = listaCondominios.find(c => c.id === targetCondoId);
      const condoNome = condoObj ? condoObj.nome.replace(/[^a-zA-Z0-9]/g, '_') : 'TODOS_OS_CONDOMINIOS';

      const buscarTabela = async (tabela: string) => {
        let query = supabase.from(tabela).select('*');
        if (targetCondoId && targetCondoId !== 'TODOS') {
          query = query.eq('condominio_id', targetCondoId);
        }
        const { data, error } = await query;
        if (error) console.warn(`Aviso ao buscar tabela ${tabela}:`, error.message);
        return data || [];
      };

      const [
        condominiosData,
        operadoresData,
        moradoresData,
        encomendasItensData,
        custodiaData,
        materiaisData,
        chavesData,
        manutencaoData,
        rondasPontosData,
        rondasExecucaoData,
        rondasRegistrosData,
        passagemPostoData,
        ocorrenciasData,
        prestadoresData,
        configuracoesData,
        templatesData,
        agendaData
      ] = await Promise.all([
        targetCondoId && targetCondoId !== 'TODOS' 
          ? supabase.from('condominios').select('*').eq('id', targetCondoId).then(r => r.data || [])
          : supabase.from('condominios').select('*').then(r => r.data || []),
        buscarTabela('operadores'),
        buscarTabela('moradores'),
        buscarTabela('encomendas_itens'),
        buscarTabela('custodia'),
        buscarTabela('materiais_posto'),
        buscarTabela('chaves'),
        buscarTabela('chamados_manutencao'),
        buscarTabela('rondas_pontos'),
        buscarTabela('rondas_execucao'),
        buscarTabela('rondas_registros'),
        buscarTabela('passagens_posto'),
        buscarTabela('ocorrencias'),
        buscarTabela('prestadores'),
        buscarTabela('configuracoes'),
        buscarTabela('templates_whatsapp'),
        buscarTabela('agenda_emergencia')
      ]);

      let relatorioCSV = '\uFEFF';
      relatorioCSV += `RELATÓRIO DE BACKUP - INFPORT 1.0\n`;
      relatorioCSV += `Condomínio:;${condoObj?.nome || 'TODOS OS CONDOMÍNIOS'}\n`;
      relatorioCSV += `Data de Exportação:;${new Date().toLocaleString('pt-BR')}\n`;
      relatorioCSV += `Solicitado Por:;${usuarioLogado?.login || 'ADMIN'}\n\n`;

      relatorioCSV += converterParaCSV('CONDOMINIOS', condominiosData);
      relatorioCSV += converterParaCSV('OPERADORES', operadoresData);
      relatorioCSV += converterParaCSV('MORADORES', moradoresData);
      relatorioCSV += converterParaCSV('ENCOMENDAS_ITENS', encomendasItensData);
      relatorioCSV += converterParaCSV('CUSTODIA', custodiaData);
      relatorioCSV += converterParaCSV('MATERIAIS_POSTO', materiaisData);
      relatorioCSV += converterParaCSV('QUADRO_CHAVES', chavesData);
      relatorioCSV += converterParaCSV('CHAMADOS_MANUTENCAO', manutencaoData);
      relatorioCSV += converterParaCSV('RONDAS_PONTOS', rondasPontosData);
      relatorioCSV += converterParaCSV('RONDAS_EXECUCAO', rondasExecucaoData);
      relatorioCSV += converterParaCSV('RONDAS_REGISTROS', rondasRegistrosData);
      relatorioCSV += converterParaCSV('PASSAGENS_POSTO', passagemPostoData);
      relatorioCSV += converterParaCSV('OCORRENCIAS', ocorrenciasData);
      relatorioCSV += converterParaCSV('PRESTADORES', prestadoresData);
      relatorioCSV += converterParaCSV('CONFIGURACOES', configuracoesData);
      relatorioCSV += converterParaCSV('TEMPLATES_WHATSAPP', templatesData);
      relatorioCSV += converterParaCSV('AGENDA_EMERGENCIA', agendaData);

      const blob = new Blob([relatorioCSV], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      const dataHoje = new Date().toISOString().split('T')[0];

      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', `BACKUP_EXCEL_${condoNome}_${dataHoje}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setMensagem({ tipo: 'sucesso', texto: `Planilha Excel (.csv) baixada com sucesso!` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao gerar planilha do backup: ' + err.message });
    } finally {
      setExportando(false);
    }
  };

  const copiarSqlDireto = () => {
    const sql = generateMigrationSql();
    navigator.clipboard.writeText(sql);
    setCopiadoSql(true);
    setTimeout(() => setCopiadoSql(false), 3000);
  };

  return (
    <div className="space-y-6 relative pb-10">
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded flex items-center gap-1.5 w-fit">
            <Settings className="w-3.5 h-3.5" /> Módulo 11 - Configurações & Regras
          </span>
          <h3 className="font-bold text-lg mt-1">Painel Administrador Master & Parametrização</h3>
          <p className="text-xs text-slate-300">Feature Flags, Motor de Templates WhatsApp, Agenda, Backup e Limpeza do Supabase.</p>
        </div>

        <button
          onClick={() => setModalDoctorAberto(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-md whitespace-nowrap"
        >
          <Database className="w-4 h-4" /> Diagnóstico do Supabase
        </button>
      </div>

      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium shadow-sm border ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* Menu de Abas */}
      <div className="flex flex-wrap border border-slate-200 gap-2 bg-white p-2 rounded-xl shadow-sm">
        <button
          onClick={() => setAbaAtiva('flags')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
            abaAtiva === 'flags' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" /> 11.1 Parametrização
        </button>

        <button
          onClick={() => setAbaAtiva('templates')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
            abaAtiva === 'templates' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> 11.2 Templates WhatsApp
        </button>

        <button
          onClick={() => setAbaAtiva('emergencia')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
            abaAtiva === 'emergencia' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PhoneCall className="w-4 h-4" /> 11.3 Agenda & Escala
        </button>

        <button
          onClick={() => setAbaAtiva('backup')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
            abaAtiva === 'backup' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className={`w-4 h-4 ${abaAtiva === 'backup' ? 'text-emerald-400' : 'text-emerald-600'}`} /> 11.4 Backup Excel
        </button>

        <button
          onClick={() => setAbaAtiva('supabase')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
            abaAtiva === 'supabase' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <Database className="w-4 h-4" /> 11.5 Arrumar Supabase
        </button>
      </div>

      {/* ABA 11.1: PARAMETRIZAÇÃO */}
      {abaAtiva === 'flags' && (
        <form onSubmit={salvarParametrizacao} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-600" /> Ativação de Módulos (Feature Flags)
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Ative ou desative as funções do sistema exclusivas para este condomínio.
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 shadow-sm transition whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modulosVisual.map((modulo) => {
                const Icone = modulo.icon;
                const isAtivo = Boolean(config[modulo.key]);
                return (
                  <div 
                    key={modulo.key} 
                    className={`relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col justify-between h-full ${
                      isAtivo 
                        ? 'bg-emerald-50/50 border-emerald-500 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 opacity-75 grayscale-[0.3]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className={`p-2.5 rounded-lg ${isAtivo ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                        <Icone className="w-5 h-5" />
                      </div>
                      
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAtivo}
                          onChange={(e) => setConfig({ ...config, [modulo.key]: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isAtivo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          Módulo {modulo.moduloNum}
                        </span>
                        <span className={`text-[11px] font-bold ${isAtivo ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isAtivo ? '● Ativo' : '○ Desativado'}
                        </span>
                      </div>
                      <h5 className="font-bold text-sm text-slate-900 mt-1 leading-tight">
                        {modulo.titulo.replace(/^Módulo \d+ - /, '')}
                      </h5>
                      <p className="text-xs text-slate-500 mt-1">{modulo.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      )}

      {/* ABA 11.2: TEMPLATES WHATSAPP */}
      {abaAtiva === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" /> Editor de Templates do WhatsApp
            </h4>

            <form onSubmit={salvarTemplate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Evento Desencadeador</label>
                  <select
                    value={templateSelecionado.codigo_evento}
                    onChange={(e) => setTemplateSelecionado({ ...templateSelecionado, codigo_evento: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="ENCOMENDA_CHEGOU">ENCOMENDA_CHEGOU</option>
                    <option value="CUSTODIA_GUARDADA">CUSTODIA_GUARDADA</option>
                    <option value="CHAVE_ATRASADA">CHAVE_ATRASADA</option>
                    <option value="CHAMADO_ABERTO">CHAMADO_ABERTO</option>
                    <option value="RONDA_AUSENTE">RONDA_AUSENTE</option>
                    <option value="PRESTADOR_ENTROU">PRESTADOR_ENTROU</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Canal de Destino</label>
                  <select
                    value={templateSelecionado.canal_destino}
                    onChange={(e) => setTemplateSelecionado({ ...templateSelecionado, canal_destino: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="Morador Direct">WhatsApp Morador Direct</option>
                    <option value="Grupo Gestão">Grupo Gestão / Síndico</option>
                    <option value="WhatsApp Supervisor">WhatsApp Supervisor INFPORT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Corpo do Texto do Template
                </label>
                <textarea
                  rows={4}
                  value={templateSelecionado.corpo_texto}
                  onChange={(e) => setTemplateSelecionado({ ...templateSelecionado, corpo_texto: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono resize-none"
                ></textarea>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={testarTemplate}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition w-full sm:w-auto justify-center"
                >
                  <Send className="w-3.5 h-3.5" /> Testar Envio no WhatsApp
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <Save className="w-4 h-4" /> Salvar Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ABA 11.3: AGENDA & ESCALA */}
      {abaAtiva === 'emergencia' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" /> Cadastrar Novo Contato de Emergência
            </h4>

            <form onSubmit={adicionarContato} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoria</label>
                  <select
                    value={novoContato.categoria}
                    onChange={(e) => setNovoContato({ ...novoContato, categoria: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="Órgão Público">Órgão Público (Polícia/Bombeiro)</option>
                    <option value="Manutenção / Concessionária">Manutenção / Concessionária</option>
                    <option value="Supervisão / Síndico">Supervisão / Síndico</option>
                    <option value="Emergência Médica">Emergência Médica / SAMU</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome / Descrição</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Polícia Militar (190) ou Zelador"
                    value={novoContato.nome_descricao}
                    onChange={(e) => setNovoContato({ ...novoContato, nome_descricao: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Telefone Principal</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 190 ou (11) 99999-9999"
                    value={novoContato.telefone_principal}
                    onChange={(e) => setNovoContato({ ...novoContato, telefone_principal: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">WhatsApp (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 11999999999"
                    value={novoContato.telefone_whatsapp}
                    onChange={(e) => setNovoContato({ ...novoContato, telefone_whatsapp: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novoContato.exibir_menu_flutuante}
                    onChange={(e) => setNovoContato({ ...novoContato, exibir_menu_flutuante: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>Exibir no menu rápido da Guarita</span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs uppercase flex items-center gap-2 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Contato
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-600" /> Agenda de Contatos Cadastrados
            </h4>

            {contatos.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhum contato de emergência cadastrado para este condomínio.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {contatos.map((c) => (
                  <div key={c.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {c.categoria}
                      </span>
                      <h5 className="font-bold text-xs text-slate-900">{c.nome_descricao}</h5>
                      <div className="text-xs text-slate-600 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.telefone_principal}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(c.telefone_whatsapp || c.telefone_principal) && (
                        <button
                          type="button"
                          onClick={() => dispararPanico(c)}
                          title="Disparar Alerta / Pânico no WhatsApp"
                          className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-lg transition shadow-sm flex items-center gap-1 text-xs font-bold"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          <span className="hidden sm:inline">Pânico</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => excluirContato(c.id)}
                        title="Excluir Contato"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 11.4: BACKUP PARA EXCEL */}
      {abaAtiva === 'backup' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Exportação de Backup para Excel (.csv)
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Gere um relatório completo em formato compatível com Excel contendo todas as tabelas de dados do sistema INFPORT 1.0.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Selecione o Condomínio para Exportação
                </label>
                <select
                  value={condominioBackupId}
                  onChange={(e) => setCondominioBackupId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                >
                  <option value="TODOS">🌐 VISÃO GLOBAL (Todos os Condomínios)</option>
                  {listaCondominios.map((condo) => (
                    <option key={condo.id} value={condo.id}>
                      🏢 {condo.nome}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={gerarBackupExcelCondominio}
                disabled={exportando}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase flex items-center justify-center gap-2 shadow-sm transition h-[42px]"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {exportando ? 'Exportando Dados...' : 'Baixar Planilha Excel (.csv)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 11.5: ARRUMAR SUPABASE */}
      {abaAtiva === 'supabase' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" /> Assistente de Limpeza & Organização do Supabase
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Resolva a zona de tabelas duplicadas que foi criada durante os testes.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copiarSqlDireto}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition"
                >
                  {copiadoSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiadoSql ? 'Copiado!' : 'Copiar Script SQL'}
                </button>

                <button
                  type="button"
                  onClick={() => setModalDoctorAberto(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-sm"
                >
                  <Sparkles className="w-4 h-4" /> Abrir Painel Completo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 border rounded-xl space-y-1">
                <span className="font-bold text-slate-900 block">1. O que foi corrigido no código?</span>
                <p className="text-slate-600 leading-relaxed">
                  Todas as páginas agora usam nomes canônicos padronizados: <code>materiais_posto</code>, <code>passagens_posto</code>, <code>custodia</code>, <code>rondas_pontos</code> e <code>rondas_execucao</code>.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border rounded-xl space-y-1">
                <span className="font-bold text-slate-900 block">2. E as tabelas antigas com dados?</span>
                <p className="text-slate-600 leading-relaxed">
                  O script SQL copia primeiro os registros de <code>materiais</code>, <code>rondas_passagem_posto</code>, <code>pontos_ronda</code> para as tabelas certas antes de dar DROP.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border rounded-xl space-y-1">
                <span className="font-bold text-slate-900 block">3. O Storage precisa de mudança?</span>
                <p className="text-slate-600 leading-relaxed">
                  Não! Todas as fotos continuam salvas no bucket público <code>encomendas</code> sem interrupção nem perda de imagens.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPABASE DOCTOR */}
      <SupabaseDoctorModal 
        isOpen={modalDoctorAberto} 
        onClose={() => setModalDoctorAberto(false)} 
      />
    </div>
  );
}
