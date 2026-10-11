import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { 
  Building2, 
  Users, 
  UserPlus, 
  Home, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Pencil, 
  X,
  Filter,
  ShieldCheck,
  Clock,
  MessageCircle,
  ExternalLink,
  Phone,
  Sparkles,
  Edit3,
  LayoutGrid,
  List,
  Trash2,
  Check,
  ArrowRight,
  UserCheck,
  Layers,
  ChevronRight,
  Info,
  Hash
} from 'lucide-react';
import { 
  carregarCondominioConfig, 
  salvarCondominioConfig, 
  OPCOES_ESCALA, 
  OPCOES_TIPO_ESTRUTURA,
  isEstruturaCasas,
  isEstruturaTorres,
  isEstruturaBlocos,
  isEstruturaNumeralDireto,
  getNomeRotuloBloco,
  getNomeRotuloUnidade,
  obterListaBlocosOuTorres,
  formatarIdentificacaoUnidade,
  gerarCardsUnidadesCondominio,
  saoUnidadesEquivalentes,
  normalizarNumeroUnidade,
  formatarComZeroEsquerda,
  UnidadeEstruturada,
  CondominioConfig 
} from '../services/condominioService';
import GerenciamentoPermissoes from '../components/GerenciamentoPermissoes';
import { 
  carregarNiveisAcesso, 
  obterNiveisLocal, 
  obterNomeNivel, 
  NivelAcessoItem 
} from '../services/permissoesService';

interface CadastrosProps {
  usuarioLogado?: any;
}

export default function Cadastros({ usuarioLogado }: CadastrosProps) {
  const eAdmin = usuarioLogado?.perfil === 'admin' || usuarioLogado?.nivel_acesso === 0;
  const eMaster = usuarioLogado?.perfil === 'master' || usuarioLogado?.nivel_acesso === 1;
  const eSupervisor = usuarioLogado?.perfil === 'supervisor' || usuarioLogado?.nivel_acesso === 2;
  const eOperador = usuarioLogado?.perfil === 'operador' || usuarioLogado?.nivel_acesso === 3;

  const [condominioFiltroAdmin, setCondominioFiltroAdmin] = useState('');
  const [abaAtiva, setAbaAtiva] = useState(eAdmin ? 'condominios' : 'moradores');

  const [condominios, setCondominios] = useState<any[]>([]);
  const [mapaConfigsCondos, setMapaConfigsCondos] = useState<Record<string, CondominioConfig>>({});
  const [operadores, setOperadores] = useState<any[]>([]);
  const [moradores, setMoradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Controle do Menu Flutuante / Modal de Cadastro e Edição no Card
  const [modalFlutuanteAberto, setModalFlutuanteAberto] = useState(false);
  const [tipoModalFlutuante, setTipoModalFlutuante] = useState<'condominio' | 'operador' | 'morador'>('morador');
  const [idEdicao, setIdEdicao] = useState<string | null>(null);

  // Filtros de busca individuais
  const [buscaCondominio, setBuscaCondominio] = useState('');
  const [buscaOperador, setBuscaOperador] = useState('');
  const [termoBuscaMorador, setTermoBuscaMorador] = useState('');

  // Estrutura e Visualização de Unidades
  const [modoVisaoMoradores, setModoVisaoMoradores] = useState<'cards_unidades' | 'lista_moradores'>('cards_unidades');
  const [filtroStatusUnidade, setFiltroStatusUnidade] = useState<'todas' | 'ocupadas' | 'vagas'>('todas');

  // Formulário Condomínio
  const [nomeCondominio, setNomeCondominio] = useState('');
  const [enderecoCondominio, setEnderecoCondominio] = useState('');
  const [tipoEstruturaCondominio, setTipoEstruturaCondominio] = useState<string>('casas');
  const [unidadesPorBlocoCondominio, setUnidadesPorBlocoCondominio] = useState<number>(117);
  const [qtdBlocosCondominio, setQtdBlocosCondominio] = useState<number>(1);
  const [nomesBlocosCondominio, setNomesBlocosCondominio] = useState<string>('');
  const [escalaPlantao, setEscalaPlantao] = useState<'06_18' | '07_19' | '08_20' | 'personalizado'>('06_18');
  const [horarioDiurnoInicio, setHorarioDiurnoInicio] = useState('06:00');
  const [horarioNoturnoInicio, setHorarioNoturnoInicio] = useState('18:00');
  const [whatsappGrupoUrl, setWhatsappGrupoUrl] = useState('');
  const [telefonePortaria, setTelefonePortaria] = useState('');
  const [sindicoNome, setSindicoNome] = useState('');
  const [sindicoWhatsapp, setSindicoWhatsapp] = useState('');
  const [zerosEsquerdaCondominio, setZerosEsquerdaCondominio] = useState<boolean>(true);

  // Formulário Operador
  const [nomeOperador, setNomeOperador] = useState('');
  const [loginOperador, setLoginOperador] = useState('');
  const [senhaOperador, setSenhaOperador] = useState('');
  const [nivelAcesso, setNivelAcesso] = useState('nivel_3');
  const [condominioIdOperador, setCondominioIdOperador] = useState('');
  const [listaNiveis, setListaNiveis] = useState<NivelAcessoItem[]>(() => obterNiveisLocal());

  // Formulário Morador
  const [nomeMorador, setNomeMorador] = useState('');
  const [blocoMorador, setBlocoMorador] = useState('');
  const [unidadeMorador, setUnidadeMorador] = useState('');
  const [telefoneMorador, setTelefoneMorador] = useState('');
  const [condominioIdMorador, setCondominioIdMorador] = useState('');

  // Identificação do condomínio ativo em foco
  const condoAtivoId = eAdmin 
    ? (condominioFiltroAdmin || (condominios[0]?.id || ''))
    : (usuarioLogado?.condominio_id || '');
  const configCondoAtivo = mapaConfigsCondos[condoAtivoId];
  const eEstruturaCasasAtivo = isEstruturaCasas(configCondoAtivo?.tipo_estrutura);

  // Estados para edição dos números das unidades/casas nos cards (ex: "Casa 1" -> "Casa 12A")
  const [unidadeEditandoId, setUnidadeEditandoId] = useState<string | null>(null);
  const [novoNumeroUnidade, setNovoNumeroUnidade] = useState<string>('');
  const [salvandoNumeroUnidade, setSalvandoNumeroUnidade] = useState<boolean>(false);

  // Estados para Modal de Personalização em Lote e Adição de Casas Avulsas
  const [modalRenumeracaoAberto, setModalRenumeracaoAberto] = useState<boolean>(false);
  const [textoListaUnidades, setTextoListaUnidades] = useState<string>('');
  const [modalAddUnidadeAvulsaAberto, setModalAddUnidadeAvulsaAberto] = useState<boolean>(false);
  const [novaUnidadeAvulsaNumero, setNovaUnidadeAvulsaNumero] = useState<string>('');
  const [unidadeModalAberta, setUnidadeModalAberta] = useState<any | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setListaNiveis(e.detail);
      }
    };
    window.addEventListener('niveis_acesso_atualizados', handler);
    return () => window.removeEventListener('niveis_acesso_atualizados', handler);
  }, []);

  useEffect(() => {
    carregarDados();
  }, [abaAtiva, condominioFiltroAdmin]);

  const limparFormularios = () => {
    setIdEdicao(null);
    setNomeCondominio('');
    setEnderecoCondominio('');
    setTipoEstruturaCondominio('casas');
    setUnidadesPorBlocoCondominio(117);
    setQtdBlocosCondominio(1);
    setNomesBlocosCondominio('');
    setEscalaPlantao('06_18');
    setHorarioDiurnoInicio('06:00');
    setHorarioNoturnoInicio('18:00');
    setWhatsappGrupoUrl('');
    setTelefonePortaria('');
    setSindicoNome('');
    setSindicoWhatsapp('');
    setZerosEsquerdaCondominio(true);
    setNomeOperador('');
    setLoginOperador('');
    setSenhaOperador('');
    setNivelAcesso('nivel_3');
    setCondominioIdOperador(eAdmin ? (condominioFiltroAdmin || '') : (usuarioLogado?.condominio_id || ''));
    setNomeMorador('');
    setBlocoMorador(eEstruturaCasasAtivo ? 'Casa' : '');
    setUnidadeMorador('');
    setTelefoneMorador('');
    setCondominioIdMorador(eAdmin ? (condominioFiltroAdmin || '') : (usuarioLogado?.condominio_id || ''));
  };

  const fecharModalFlutuante = () => {
    setModalFlutuanteAberto(false);
    limparFormularios();
  };

  const abrirNovoCondominio = () => {
    limparFormularios();
    setTipoModalFlutuante('condominio');
    setModalFlutuanteAberto(true);
  };

  const abrirNovoOperador = () => {
    limparFormularios();
    setCondominioIdOperador(condominioFiltroAdmin || usuarioLogado?.condominio_id || (condominios[0]?.id || ''));
    setTipoModalFlutuante('operador');
    setModalFlutuanteAberto(true);
  };

  const abrirNovoMorador = (unidadePredefinida?: { numero: string; bloco?: string }) => {
    limparFormularios();
    const targetCondo = condoAtivoId;
    setCondominioIdMorador(targetCondo);
    const cfg = mapaConfigsCondos[targetCondo];
    const eCasas = isEstruturaCasas(cfg?.tipo_estrutura);

    if (eCasas) {
      setBlocoMorador('Casa');
    } else if (unidadePredefinida?.bloco) {
      setBlocoMorador(unidadePredefinida.bloco);
    } else {
      setBlocoMorador('');
    }

    if (unidadePredefinida?.numero) {
      setUnidadeMorador(unidadePredefinida.numero);
    }

    setTipoModalFlutuante('morador');
    setModalFlutuanteAberto(true);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      // 0. Garante que a lista de condomínios esteja disponível desde o primeiro carregamento
      let listaCondos = condominios;
      if (listaCondos.length === 0) {
        const { data: condoData } = await supabase.from('condominios').select('*').order('nome');
        if (condoData && condoData.length > 0) {
          listaCondos = condoData;
          setCondominios(condoData);
          if (!condominioFiltroAdmin) {
            const initialId = usuarioLogado?.condominio_id || condoData[0].id;
            setCondominioFiltroAdmin(initialId);
          }
        }
      }

      const activeCondoId = eAdmin
        ? (condominioFiltroAdmin || listaCondos[0]?.id || '')
        : (usuarioLogado?.condominio_id || listaCondos[0]?.id || '');

      if (abaAtiva === 'condominios' && eAdmin) {
        const { data, error } = await supabase.from('condominios').select('*').order('nome');
        if (error) throw error;
        setCondominios(data || []);
        listaCondos = data || [];

        const configs: Record<string, CondominioConfig> = {};
        for (const c of (data || [])) {
          const cfg = await carregarCondominioConfig(c.id);
          configs[c.id] = cfg;
        }
        setMapaConfigsCondos(configs);
      } else if (abaAtiva === 'operadores' && !eOperador) {
        let query = supabase.from('operadores').select('*').order('nome');
        if (eAdmin && activeCondoId) {
          query = query.eq('condominio_id', activeCondoId);
        } else if (!eAdmin && usuarioLogado?.condominio_id) {
          query = query.eq('condominio_id', usuarioLogado.condominio_id);
        }
        const { data, error } = await query;
        if (error) throw error;
        setOperadores(data || []);
      } else if (abaAtiva === 'moradores') {
        let query = supabase.from('moradores').select('*').order('unidade');
        const targetCondo = activeCondoId;
        if (targetCondo) {
          query = query.eq('condominio_id', targetCondo);
        }

        const { data, error } = await query;
        if (error) throw error;
        setMoradores(data || []);

        const configs = { ...mapaConfigsCondos };
        for (const c of listaCondos) {
          configs[c.id] = await carregarCondominioConfig(c.id);
        }
        setMapaConfigsCondos(configs);
      } else if (abaAtiva === 'niveis' && !eOperador) {
        let query = supabase.from('operadores').select('*').order('nome');
        if (eAdmin && activeCondoId) {
          query = query.eq('condominio_id', activeCondoId);
        } else if (!eAdmin && usuarioLogado?.condominio_id) {
          query = query.eq('condominio_id', usuarioLogado.condominio_id);
        }
        const { data: opsData } = await query;
        if (opsData) setOperadores(opsData);
      }

      // Sempre atualiza os níveis em segundo plano
      const niveisCarregados = await carregarNiveisAcesso(condoAtivoId);
      setListaNiveis(niveisCarregados);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao carregar dados: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const getNomeCondominioPorId = (id: string) => {
    const c = condominios.find(item => item.id === id);
    return c ? c.nome : (id ? 'Condomínio Vinculado' : 'Não atribuído');
  };

  const salvarCondominio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eAdmin) return;
    if (!nomeCondominio.trim()) {
      setMensagem({ tipo: 'erro', texto: 'O nome do condomínio é obrigatório.' });
      return;
    }
    setLoading(true);

    try {
      let targetId = idEdicao;

      const opt = OPCOES_ESCALA.find(o => o.id === escalaPlantao);
      const configCondo: Partial<CondominioConfig> = {
        id: targetId || '',
        nome: nomeCondominio.trim(),
        endereco: enderecoCondominio.trim(),
        tipo_estrutura: tipoEstruturaCondominio || 'casas',
        unidades_por_bloco: Number(unidadesPorBlocoCondominio) || 117,
        qtd_blocos: Number(qtdBlocosCondominio) || 1,
        nomes_blocos: nomesBlocosCondominio.trim(),
        zeros_esquerda: zerosEsquerdaCondominio,
        escala_plantao: escalaPlantao,
        horario_diurno_inicio: horarioDiurnoInicio,
        horario_noturno_inicio: horarioNoturnoInicio,
        escala_label: escalaPlantao === 'personalizado'
          ? `Personalizado (${horarioDiurnoInicio} às ${horarioNoturnoInicio})`
          : (opt?.label || '06:00 às 18:00 / 18:00 às 06:00'),
        whatsapp_grupo_url: whatsappGrupoUrl.trim() || '',
        telefone_portaria: telefonePortaria.trim() || '',
        sindico_nome: sindicoNome.trim() || '',
        sindico_whatsapp: sindicoWhatsapp.trim() || ''
      };

      if (idEdicao) {
        await salvarCondominioConfig(idEdicao, configCondo);
        setMensagem({ 
          tipo: 'sucesso', 
          texto: isEstruturaCasas(tipoEstruturaCondominio)
            ? `Condomínio de Casas atualizado! ${unidadesPorBlocoCondominio || 117} cards de casas gerados para moradores.`
            : 'Condomínio e estrutura atualizados com sucesso!' 
        });
      } else {
        const { data: novoCond, error } = await supabase
          .from('condominios')
          .insert([{ 
            nome: nomeCondominio.trim(), 
            endereco: enderecoCondominio.trim(),
            tipo_estrutura: tipoEstruturaCondominio || 'casas',
            unidades_por_bloco: Number(unidadesPorBlocoCondominio) || 117,
            qtd_blocos: Number(qtdBlocosCondominio) || 1
          }])
          .select()
          .single();

        if (error) throw error;
        targetId = novoCond.id;
        configCondo.id = novoCond.id;
        await salvarCondominioConfig(novoCond.id, configCondo);
        setMensagem({ 
          tipo: 'sucesso', 
          texto: isEstruturaCasas(tipoEstruturaCondominio)
            ? `Condomínio cadastrado com sucesso! ${unidadesPorBlocoCondominio || 117} cards de casas gerados para moradores.`
            : 'Condomínio e configurações cadastrados com sucesso!' 
        });
      }

      fecharModalFlutuante();
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicaoCondominio = (c: any) => {
    if (!eAdmin) return;
    setIdEdicao(c.id);
    setNomeCondominio(c.nome);
    setEnderecoCondominio(c.endereco || '');

    const cfg = mapaConfigsCondos[c.id];
    if (cfg) {
      setTipoEstruturaCondominio(cfg.tipo_estrutura || 'casas');
      setUnidadesPorBlocoCondominio(cfg.unidades_por_bloco !== undefined ? Number(cfg.unidades_por_bloco) : 117);
      setQtdBlocosCondominio(cfg.qtd_blocos !== undefined ? Number(cfg.qtd_blocos) : 1);
      setNomesBlocosCondominio(cfg.nomes_blocos || '');
      setZerosEsquerdaCondominio(cfg.zeros_esquerda !== false);
      setEscalaPlantao(cfg.escala_plantao || '06_18');
      setHorarioDiurnoInicio(cfg.horario_diurno_inicio || '06:00');
      setHorarioNoturnoInicio(cfg.horario_noturno_inicio || '18:00');
      setWhatsappGrupoUrl(cfg.whatsapp_grupo_url || '');
      setTelefonePortaria(cfg.telefone_portaria || '');
      setSindicoNome(cfg.sindico_nome || '');
      setSindicoWhatsapp(cfg.sindico_whatsapp || '');
    } else {
      setTipoEstruturaCondominio(c.tipo_estrutura || 'casas');
      setUnidadesPorBlocoCondominio(c.unidades_por_bloco ? Number(c.unidades_por_bloco) : 117);
      setQtdBlocosCondominio(c.qtd_blocos ? Number(c.qtd_blocos) : 1);
      setNomesBlocosCondominio(c.nomes_blocos || '');
      setZerosEsquerdaCondominio(true);
      setEscalaPlantao('06_18');
      setHorarioDiurnoInicio('06:00');
      setHorarioNoturnoInicio('18:00');
      setWhatsappGrupoUrl('');
      setTelefonePortaria('');
      setSindicoNome('');
      setSindicoWhatsapp('');
    }
    setTipoModalFlutuante('condominio');
    setModalFlutuanteAberto(true);
  };

  const salvarOperador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (eOperador) {
      setMensagem({ tipo: 'erro', texto: 'Operadores de portaria não possuem permissão para criar usuários.' });
      return;
    }

    const targetCondominioId = (eAdmin ? (condominioIdOperador || condominioFiltroAdmin || condoAtivoId) : usuarioLogado?.condominio_id) || condoAtivoId || condominios[0]?.id;

    if (!nomeOperador.trim() || !loginOperador.trim() || !targetCondominioId) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o nome, login e selecione um condomínio.' });
      return;
    }

    setLoading(true);

    try {
      let nivelNum = 3;
      let perfilStr = 'operador';
      let customId: string | null = null;

      if (nivelAcesso.startsWith('nivel_')) {
        const parsed = parseInt(nivelAcesso.replace('nivel_', ''), 10);
        nivelNum = !isNaN(parsed) ? parsed : 3;
        perfilStr = nivelNum === 0 ? 'admin' : nivelNum === 1 ? 'master' : nivelNum === 2 ? 'supervisor' : nivelNum === 4 ? 'sindico' : 'operador';
        customId = nivelAcesso;
      } else if (!isNaN(parseInt(nivelAcesso, 10)) && !nivelAcesso.startsWith('custom_')) {
        nivelNum = parseInt(nivelAcesso, 10);
        perfilStr = nivelNum === 0 ? 'admin' : nivelNum === 1 ? 'master' : nivelNum === 2 ? 'supervisor' : nivelNum === 4 ? 'sindico' : 'operador';
        customId = `nivel_${nivelNum}`;
      } else {
        const objCustom = listaNiveis.find(n => n.id === nivelAcesso);
        customId = nivelAcesso;
        perfilStr = objCustom?.nome || 'custom';
        nivelNum = 3;
      }

      if (idEdicao) {
        const dadosAtualizacao: any = {
          nome: nomeOperador.trim(),
          login: loginOperador.trim().toLowerCase(),
          nivel_acesso: nivelNum,
          nivel_acesso_custom_id: customId,
          perfil: perfilStr,
          condominio_id: targetCondominioId
        };
        if (senhaOperador.trim()) {
          dadosAtualizacao.senha = senhaOperador.trim();
        }

        let { error } = await supabase
          .from('operadores')
          .update(dadosAtualizacao)
          .eq('id', idEdicao);

        if (error && (error.message?.includes('nivel_acesso_custom_id') || error.message?.includes('perfil') || (error as any).code === '42703')) {
          console.warn('Fallback: salvando operador sem colunas extras de RBAC...');
          const fallback: any = {
            nome: nomeOperador.trim(),
            login: loginOperador.trim().toLowerCase(),
            nivel_acesso: nivelNum,
            condominio_id: targetCondominioId
          };
          if (dadosAtualizacao.senha) fallback.senha = dadosAtualizacao.senha;
          const retry = await supabase.from('operadores').update(fallback).eq('id', idEdicao);
          error = retry.error;
        }

        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Operador atualizado com sucesso!' });
      } else {
        if (!senhaOperador.trim()) {
          setMensagem({ tipo: 'erro', texto: 'Informe a senha para o novo operador.' });
          setLoading(false);
          return;
        }

        const novoOp: any = {
          nome: nomeOperador.trim(),
          login: loginOperador.trim().toLowerCase(),
          senha: senhaOperador.trim(),
          nivel_acesso: nivelNum,
          nivel_acesso_custom_id: customId,
          perfil: perfilStr,
          condominio_id: targetCondominioId,
          ativo: true
        };

        let { error } = await supabase.from('operadores').insert([novoOp]);

        if (error && (error.message?.includes('nivel_acesso_custom_id') || error.message?.includes('perfil') || (error as any).code === '42703')) {
          console.warn('Fallback: cadastrando operador sem colunas extras de RBAC...');
          delete novoOp.nivel_acesso_custom_id;
          delete novoOp.perfil;
          const retry = await supabase.from('operadores').insert([novoOp]);
          error = retry.error;
        }

        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Operador cadastrado com sucesso!' });
      }

      fecharModalFlutuante();
      carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar operador: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicaoOperador = (op: any) => {
    if (eOperador) return;
    setIdEdicao(op.id);
    setNomeOperador(op.nome || '');
    setLoginOperador(op.login || '');
    setSenhaOperador('');
    const nivelDefinido = op.nivel_acesso_custom_id ||
      (op.nivel_acesso !== undefined && op.nivel_acesso !== null && !isNaN(Number(op.nivel_acesso)) ? `nivel_${op.nivel_acesso}` : null) ||
      (op.perfil === 'admin' ? 'nivel_0' : op.perfil === 'master' ? 'nivel_1' : op.perfil === 'supervisor' ? 'nivel_2' : (op.perfil === 'sindico' || op.perfil === 'Síndico') ? 'nivel_4' : 'nivel_3');
    setNivelAcesso(nivelDefinido);
    setCondominioIdOperador(op.condominio_id || '');
    setTipoModalFlutuante('operador');
    setModalFlutuanteAberto(true);
  };

  const salvarMorador = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetCondominioId = (eAdmin ? (condominioIdMorador || condominioFiltroAdmin || condoAtivoId) : usuarioLogado?.condominio_id) || condoAtivoId || condominios[0]?.id;

    if (!nomeMorador.trim() || !unidadeMorador.trim() || !targetCondominioId) {
      setMensagem({ tipo: 'erro', texto: 'Nome, Unidade e Condomínio são obrigatórios.' });
      return;
    }
    setLoading(true);

    const cfg = mapaConfigsCondos[targetCondominioId];
    const eCasas = isEstruturaCasas(cfg?.tipo_estrutura);
    const blocoFinal = eCasas ? 'Casa' : (blocoMorador.trim() || '');

    try {
      if (idEdicao) {
        const { error } = await supabase
          .from('moradores')
          .update({
            nome: nomeMorador.trim(),
            bloco: blocoFinal,
            unidade: unidadeMorador.trim(),
            telefone: telefoneMorador.trim(),
            condominio_id: targetCondominioId
          })
          .eq('id', idEdicao);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Morador atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('moradores').insert([
          {
            nome: nomeMorador.trim(),
            bloco: blocoFinal,
            unidade: unidadeMorador.trim(),
            telefone: telefoneMorador.trim(),
            condominio_id: targetCondominioId,
            tipo: 'Morador'
          }
        ]);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Morador cadastrado com sucesso!' });
      }

      fecharModalFlutuante();
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar morador: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicaoMorador = (m: any) => {
    setIdEdicao(m.id);
    setNomeMorador(m.nome);
    const cfg = mapaConfigsCondos[m.condominio_id || condoAtivoId];
    const eCasas = isEstruturaCasas(cfg?.tipo_estrutura);
    setBlocoMorador(eCasas ? 'Casa' : (m.bloco || ''));
    setUnidadeMorador(m.unidade || '');
    setTelefoneMorador(m.telefone || '');
    setCondominioIdMorador(m.condominio_id || '');
    setTipoModalFlutuante('morador');
    setModalFlutuanteAberto(true);
  };

  const excluirMorador = async (m: any) => {
    const ident = m.bloco ? `${m.bloco} - Unidade ${m.unidade}` : `Unidade ${m.unidade}`;
    if (!window.confirm(`Tem certeza que deseja remover o morador "${m.nome}" (${ident})?`)) {
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('moradores').delete().eq('id', m.id);
      if (error) throw error;
      setMensagem({ tipo: 'sucesso', texto: `Morador "${m.nome}" removido com sucesso!` });
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao remover morador: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Métodos para edição individual ou em lote do número das unidades (ex: "Casa 1" -> "Casa 12A")
  const iniciarEdicaoNumero = (u: UnidadeEstruturada) => {
    setUnidadeEditandoId(u.id);
    setNovoNumeroUnidade(u.numero);
  };

  const salvarEdicaoNumeroUnidade = async (u: UnidadeEstruturada, novoNumInput: string) => {
    const numLimpo = novoNumInput.trim();
    if (!numLimpo) {
      setMensagem({ tipo: 'erro', texto: 'O número da casa/unidade não pode ficar vazio.' });
      return;
    }

    if (numLimpo === u.numero) {
      setUnidadeEditandoId(null);
      return;
    }

    setSalvandoNumeroUnidade(true);
    setLoading(true);

    try {
      const targetCondoId = condoAtivoId;
      if (!targetCondoId) throw new Error('Condomínio não identificado.');

      // 1. Atualizar no banco os moradores que pertencem a essa unidade (respeitando zeros à esquerda)
      const moradoresAfetados = moradores.filter(m => 
        (m.condominio_id === targetCondoId || !m.condominio_id) && 
        saoUnidadesEquivalentes(m.unidade, u.numero)
      );

      for (const mor of moradoresAfetados) {
        await supabase
          .from('moradores')
          .update({ 
            unidade: numLimpo,
            bloco: eEstruturaCasasAtivo ? 'Casa' : (mor.bloco || '')
          })
          .eq('id', mor.id);
      }

      // Fallback direto por query caso algum morador não estivesse no cache de estado
      await supabase
        .from('moradores')
        .update({ unidade: numLimpo })
        .eq('condominio_id', targetCondoId)
        .eq('unidade', u.numero);

      // 2. Atualizar a lista de unidades customizadas da configuração
      const totalQtd = configCondoAtivo?.unidades_por_bloco ? Number(configCondoAtivo.unidades_por_bloco) : 117;
      let listaBase: string[] = [];
      if (Array.isArray(configCondoAtivo?.unidades_customizadas) && configCondoAtivo.unidades_customizadas.length > 0) {
        listaBase = [...configCondoAtivo.unidades_customizadas];
      } else {
        listaBase = Array.from({ length: totalQtd }, (_, i) => {
          const n = i + 1;
          return (configCondoAtivo?.zeros_esquerda !== false && n < 10) ? String(n).padStart(2, '0') : String(n);
        });
      }

      // Garantir tamanho
      while (listaBase.length < totalQtd) {
        const n = listaBase.length + 1;
        listaBase.push((configCondoAtivo?.zeros_esquerda !== false && n < 10) ? String(n).padStart(2, '0') : String(n));
      }

      if (u.indiceOriginal !== undefined && u.indiceOriginal >= 0 && u.indiceOriginal < listaBase.length) {
        listaBase[u.indiceOriginal] = numLimpo;
      } else {
        const idx = listaBase.findIndex(val => saoUnidadesEquivalentes(val, u.numero));
        if (idx !== -1) {
          listaBase[idx] = numLimpo;
        } else {
          listaBase.push(numLimpo);
        }
      }

      // 3. Salvar no Supabase (turnos_plantao.unidades_customizadas) e LocalStorage
      const configSalva = await salvarCondominioConfig(targetCondoId, {
        unidades_customizadas: listaBase
      });

      // 4. Atualizar o estado em memória
      setMapaConfigsCondos(prev => ({
        ...prev,
        [targetCondoId]: configSalva
      }));

      setMensagem({ 
        tipo: 'sucesso', 
        texto: `Identificação alterada de "${u.bloco ? `${u.bloco} ` : ''}${u.numero}" para "${u.bloco ? `${u.bloco} ` : ''}${numLimpo}" com sucesso!` 
      });

      setUnidadeEditandoId(null);
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar novo número: ${err.message}` });
    } finally {
      setSalvandoNumeroUnidade(false);
      setLoading(false);
    }
  };

  const abrirModalRenumeracao = () => {
    const numsAtuais = listaCardsGerados.map(c => c.numero).join('\n');
    setTextoListaUnidades(numsAtuais);
    setModalRenumeracaoAberto(true);
  };

  const salvarRenumeracaoEmLote = async () => {
    // Suportar quebra de linha (\n), vírgula (,), ponto e vírgula (;) e espaços
    const linhas = textoListaUnidades
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (linhas.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Informe ao menos um número de unidade/casa.' });
      return;
    }

    setLoading(true);
    try {
      const targetCondoId = condoAtivoId;

      // Sincronizar moradores existentes com o novo formato de unidade correspondente
      for (const m of moradores) {
        if (!m.unidade) continue;
        const novoEquiv = linhas.find(n => saoUnidadesEquivalentes(n, m.unidade));
        if (novoEquiv && novoEquiv !== m.unidade) {
          await supabase
            .from('moradores')
            .update({ unidade: novoEquiv })
            .eq('id', m.id);
        }
      }

      const configSalva = await salvarCondominioConfig(targetCondoId, {
        unidades_customizadas: linhas,
        unidades_por_bloco: linhas.length
      });

      setMapaConfigsCondos(prev => ({
        ...prev,
        [targetCondoId]: configSalva
      }));

      setMensagem({ 
        tipo: 'sucesso', 
        texto: `${linhas.length} números de ${eEstruturaCasasAtivo ? 'casas' : 'unidades'} salvos com sucesso!` 
      });

      setModalRenumeracaoAberto(false);
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao renumerar unidades: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const formatarTodasComZeroEsquerda = async () => {
    setLoading(true);
    try {
      const targetCondoId = condoAtivoId;
      const totalQtd = configCondoAtivo?.unidades_por_bloco ? Number(configCondoAtivo.unidades_por_bloco) : 117;
      
      const listaFormatada: string[] = [];
      const listaAtual = Array.isArray(configCondoAtivo?.unidades_customizadas) && configCondoAtivo.unidades_customizadas.length > 0
        ? [...configCondoAtivo.unidades_customizadas]
        : Array.from({ length: totalQtd }, (_, i) => String(i + 1));

      for (let i = 0; i < Math.max(totalQtd, listaAtual.length); i++) {
        const val = listaAtual[i] || String(i + 1);
        listaFormatada.push(formatarComZeroEsquerda(val, 2));
      }

      // Sincronizar moradores existentes no banco para 2 dígitos (01..09)
      for (const m of moradores) {
        if (!m.unidade) continue;
        const formatada = formatarComZeroEsquerda(normalizarNumeroUnidade(m.unidade), 2);
        if (formatada && formatada !== m.unidade) {
          await supabase
            .from('moradores')
            .update({ unidade: formatada })
            .eq('id', m.id);
        }
      }

      const configSalva = await salvarCondominioConfig(targetCondoId, {
        unidades_customizadas: listaFormatada,
        zeros_esquerda: true
      });

      setMapaConfigsCondos(prev => ({
        ...prev,
        [targetCondoId]: configSalva
      }));

      setMensagem({
        tipo: 'sucesso',
        texto: 'Todas as casas 1 a 9 foram formatadas com zero no início (01, 02, 03... 117) com sucesso!'
      });

      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao formatar com zero no início: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const adicionarCasaAvulsa = async () => {
    const numLimpo = novaUnidadeAvulsaNumero.trim();
    if (!numLimpo) {
      setMensagem({ tipo: 'erro', texto: 'Informe o número da casa/unidade.' });
      return;
    }

    setLoading(true);
    try {
      const targetCondoId = condoAtivoId;
      const totalQtd = configCondoAtivo?.unidades_por_bloco ? Number(configCondoAtivo.unidades_por_bloco) : 117;
      let listaAtual = Array.isArray(configCondoAtivo?.unidades_customizadas) && configCondoAtivo.unidades_customizadas.length > 0
        ? [...configCondoAtivo.unidades_customizadas]
        : Array.from({ length: totalQtd }, (_, i) => {
            const seq = i + 1;
            return (configCondoAtivo?.zeros_esquerda !== false && seq < 10) 
              ? String(seq).padStart(2, '0') 
              : String(seq);
          });

      if (listaAtual.some(n => saoUnidadesEquivalentes(n, numLimpo))) {
        setMensagem({ tipo: 'erro', texto: `A casa/unidade "${numLimpo}" já existe na lista!` });
        setLoading(false);
        return;
      }
      listaAtual.push(numLimpo);

      const configSalva = await salvarCondominioConfig(targetCondoId, {
        unidades_customizadas: listaAtual,
        unidades_por_bloco: Math.max(Number(configCondoAtivo?.unidades_por_bloco || 0), listaAtual.length)
      });

      setMapaConfigsCondos(prev => ({
        ...prev,
        [targetCondoId]: configSalva
      }));

      setMensagem({ tipo: 'sucesso', texto: `Nova ${eEstruturaCasasAtivo ? 'Casa' : 'Unidade'} "${numLimpo}" adicionada!` });
      setModalAddUnidadeAvulsaAberto(false);
      setNovaUnidadeAvulsaNumero('');
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao adicionar unidade: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Processamento e geração dos cards de unidades para a aba Moradores
  const listaCardsGerados = useMemo(() => {
    const cards = gerarCardsUnidadesCondominio(configCondoAtivo);
    // Assegura que se houver moradores com unidades fora do range, eles também ganhem card (sem duplicar unidades equivalentes)
    const extras: UnidadeEstruturada[] = [];
    moradores.forEach(m => {
      const num = (m.unidade || '').toString().trim();
      if (!num) return;
      const jaExiste = cards.some(c => saoUnidadesEquivalentes(c.numero, num)) || 
                       extras.some(e => saoUnidadesEquivalentes(e.numero, num));
      if (!jaExiste) {
        extras.push({
          id: `extra-${num}`,
          numero: num,
          bloco: m.bloco || (eEstruturaCasasAtivo ? 'Casa' : ''),
          label: eEstruturaCasasAtivo ? `Casa ${num}` : `${m.bloco ? `${m.bloco} - ` : ''}Ap. ${num}`
        });
      }
    });
    return [...cards, ...extras];
  }, [configCondoAtivo, moradores, eEstruturaCasasAtivo]);

  const unidadesComMoradores = useMemo(() => {
    return listaCardsGerados.map(u => {
      const moradoresDestaUnidade = moradores.filter(m => {
        const numMatch = saoUnidadesEquivalentes(m.unidade, u.numero);
        if (!numMatch) return false;
        if (eEstruturaCasasAtivo) return true;
        if (u.bloco && m.bloco) {
          return m.bloco.toString().trim().toLowerCase() === u.bloco.toString().trim().toLowerCase();
        }
        return true;
      });
      return {
        unidade: u,
        moradores: moradoresDestaUnidade,
        ocupada: moradoresDestaUnidade.length > 0
      };
    });
  }, [listaCardsGerados, moradores, eEstruturaCasasAtivo]);

  const contadoresUnidades = useMemo(() => {
    const total = unidadesComMoradores.length;
    const ocupadas = unidadesComMoradores.filter(u => u.ocupada).length;
    const vagas = total - ocupadas;
    return { total, ocupadas, vagas, totalMoradores: moradores.length };
  }, [unidadesComMoradores, moradores]);

  return (
    <div className="space-y-4 pb-12">
      {/* Header Compacto com Nível e Multi-Tenant */}
      <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm border border-slate-800">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Nível: {eAdmin ? 'ADMINISTRADOR GERAL' : eMaster ? 'MASTER (SÍNDICO)' : eSupervisor ? 'SUPERVISOR' : 'OPERADOR (PORTARIA)'}
          </span>
          <h3 className="font-bold text-base sm:text-lg mt-1 text-white">
            Cadastros Base do Sistema
          </h3>
          <p className="text-xs text-slate-300">
            {eAdmin 
              ? 'Gerenciamento global de condomínios, equipe operacional e moradores.' 
              : `Condomínio Ativo: ${getNomeCondominioPorId(usuarioLogado?.condominio_id)}`}
          </p>
        </div>

        {eAdmin && (
          <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700 w-full md:w-auto min-w-[260px] space-y-1">
            <label className="block text-[9px] font-bold text-emerald-400 uppercase flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtrar Condomínio em Gerenciamento
            </label>
            <select
              value={condominioFiltroAdmin}
              onChange={(e) => {
                setCondominioFiltroAdmin(e.target.value);
                setCondominioIdOperador(e.target.value);
                setCondominioIdMorador(e.target.value);
              }}
              className="w-full bg-slate-950 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              <option value="">🏢 Todos os Condomínios (Visão Global)</option>
              {condominios.map((c) => (
                <option key={c.id} value={c.id}>🏢 {c.nome}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navegação de Abas Fluida com Contadores */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl border border-slate-300 gap-1.5 shadow-2xs">
        {eAdmin && (
          <button
            onClick={() => setAbaAtiva('condominios')}
            className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-2 rounded-xl transition cursor-pointer ${
              abaAtiva === 'condominios'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Condomínios</span>
            <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
              abaAtiva === 'condominios' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-300 text-slate-700'
            }`}>
              {condominios.length}
            </span>
          </button>
        )}

        {!eOperador && (
          <button
            onClick={() => setAbaAtiva('operadores')}
            className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-2 rounded-xl transition cursor-pointer ${
              abaAtiva === 'operadores'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>Operadores</span>
            <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
              abaAtiva === 'operadores' ? 'bg-slate-800 text-blue-300' : 'bg-slate-300 text-slate-700'
            }`}>
              {operadores.length}
            </span>
          </button>
        )}

        <button
          onClick={() => setAbaAtiva('moradores')}
          className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-2 rounded-xl transition cursor-pointer ${
            abaAtiva === 'moradores'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <Home className="w-4 h-4 text-purple-400" />
          <span>Moradores & Unidades</span>
          <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
            abaAtiva === 'moradores' ? 'bg-slate-800 text-purple-300' : 'bg-slate-300 text-slate-700'
          }`}>
            {moradores.length}
          </span>
        </button>

        {!eOperador && (
          <button
            onClick={() => setAbaAtiva('niveis')}
            className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-2 rounded-xl transition cursor-pointer ${
              abaAtiva === 'niveis'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Níveis de Acesso & Permissões</span>
            <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
              abaAtiva === 'niveis' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-300 text-slate-700'
            }`}>
              {listaNiveis.length}
            </span>
          </button>
        )}
      </div>

      {/* Alertas e Notificações */}
      {mensagem.texto && (
        <div
          className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
            mensagem.tipo === 'sucesso'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensagem.tipo === 'sucesso' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{mensagem.texto}</span>
          </div>
          <button onClick={() => setMensagem({ tipo: '', texto: '' })} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* 1. ABA CONDOMÍNIOS (VISÃO DE CARDS COMPLETA COM MENU FLUTUANTE) */}
      {abaAtiva === 'condominios' && eAdmin && (
        <div className="space-y-4">
          {/* Barra de Ações: Busca e Botão de Novo Condomínio */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={buscaCondominio}
                onChange={(e) => setBuscaCondominio(e.target.value)}
                placeholder="Buscar condomínio por nome ou endereço..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={abrirNovoCondominio}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" /> Cadastrar Novo Condomínio
            </button>
          </div>

          {/* Grid de Cards dos Condomínios */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {condominios
              .filter(c => {
                if (!buscaCondominio.trim()) return true;
                const termo = buscaCondominio.toLowerCase();
                return (c.nome || '').toLowerCase().includes(termo) || (c.endereco || '').toLowerCase().includes(termo);
              })
              .map((c) => {
                const cfg = mapaConfigsCondos[c.id] || {};
                const temGrupo = !!cfg.whatsapp_grupo_url;

                return (
                  <div 
                    key={c.id} 
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-emerald-300 transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Condomínio
                          </span>
                          <h4 className="font-extrabold text-slate-900 text-sm mt-1">{c.nome}</h4>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full">
                          Ativo
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">
                        📍 {c.endereco || 'Endereço não informado'}
                      </p>

                      {/* Informações de Estrutura de Casas / Unidades */}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-800">
                          <span className="font-bold flex items-center gap-1.5">
                            {isEstruturaCasas(cfg.tipo_estrutura) ? (
                              <Home className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            {isEstruturaCasas(cfg.tipo_estrutura) ? 'Condomínio de Casas' : 'Condomínio Vertical'}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                            {isEstruturaCasas(cfg.tipo_estrutura) 
                              ? `${cfg.unidades_por_bloco || 117} Casas Totais` 
                              : `${(cfg.qtd_blocos || 1) * (cfg.unidades_por_bloco || 20)} Unidades`}
                          </span>
                        </div>
                        {isEstruturaCasas(cfg.tipo_estrutura) && (
                          <p className="text-[10px] text-emerald-800 font-medium">
                            ✓ Onde seria Bloco fica <strong>FIXO como "Casa"</strong> automaticamente.
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-700 pt-0.5 border-t border-slate-200/60">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Plantão: <strong>{cfg.escala_label || '06:00 às 18:00 / 18:00 às 06:00'}</strong></span>
                        </div>
                        {cfg.telefone_portaria && (
                          <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>Portaria: <strong>{cfg.telefone_portaria}</strong></span>
                          </div>
                        )}
                        {cfg.sindico_nome && (
                          <div className="text-[11px] text-slate-500">
                            Síndico(a): <strong>{cfg.sindico_nome}</strong> {cfg.sindico_whatsapp ? `(${cfg.sindico_whatsapp})` : ''}
                          </div>
                        )}
                      </div>

                      {temGrupo && (
                        <a
                          href={cfg.whatsapp_grupo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Grupo WhatsApp do Posto</span>
                          <ExternalLink className="w-3 h-3 text-emerald-500" />
                        </a>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCondominioFiltroAdmin(c.id);
                          setCondominioIdMorador(c.id);
                          setAbaAtiva('moradores');
                        }}
                        className="w-full py-2 px-3 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black rounded-xl border border-emerald-200 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                        title="Ver e gerenciar cards de casas e moradores deste condomínio"
                      >
                        <Home className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">Gerenciar {isEstruturaCasas(cfg.tipo_estrutura) ? `${cfg.unidades_por_bloco || 117} Casas` : `${(cfg.qtd_blocos || 1) * (cfg.unidades_por_bloco || 20)} Unidades`}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCondominioFiltroAdmin(c.id)}
                          className="flex-1 py-1.5 px-2.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition cursor-pointer text-center"
                        >
                          Filtrar
                        </button>

                        <button
                          type="button"
                          onClick={() => prepararEdicaoCondominio(c)}
                          className="flex-2 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
                        >
                          <Pencil className="w-3.5 h-3.5 shrink-0" />
                          <span>Editar no Card</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {condominios.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Nenhum condomínio cadastrado ainda.</p>
              <button
                onClick={abrirNovoCondominio}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Cadastrar Primeiro Condomínio
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. ABA OPERADORES (VISÃO DE CARDS COMPLETA COM MENU FLUTUANTE) */}
      {abaAtiva === 'operadores' && !eOperador && (
        <div className="space-y-4">
          {/* Barra de Ações: Busca e Botão de Novo Operador */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={buscaOperador}
                onChange={(e) => setBuscaOperador(e.target.value)}
                placeholder="Buscar operador por nome ou login..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={abrirNovoOperador}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" /> Cadastrar Novo Operador
            </button>
          </div>

          {/* Grid de Cards dos Operadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {operadores
              .filter(op => {
                if (!buscaOperador.trim()) return true;
                const termo = buscaOperador.toLowerCase();
                return (op.nome || '').toLowerCase().includes(termo) || (op.login || '').toLowerCase().includes(termo);
              })
              .map((op) => {
                const nivelStr = obterNomeNivel(op.nivel_acesso_custom_id || op.nivel_acesso || op.perfil, listaNiveis);

                const badgeCor = (op.nivel_acesso === 0 || op.perfil === 'admin' || op.nivel_acesso_custom_id === 'nivel_0')
                  ? 'bg-purple-100 text-purple-900 border-purple-200' 
                  : (op.nivel_acesso === 1 || op.perfil === 'master' || op.nivel_acesso_custom_id === 'nivel_1')
                  ? 'bg-amber-100 text-amber-900 border-amber-200' 
                  : (op.nivel_acesso === 2 || op.perfil === 'supervisor' || op.nivel_acesso_custom_id === 'nivel_2')
                  ? 'bg-blue-100 text-blue-900 border-blue-200'
                  : (op.nivel_acesso === 4 || op.perfil === 'sindico' || op.nivel_acesso_custom_id === 'nivel_4')
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                  : 'bg-teal-100 text-teal-900 border-teal-200';

                return (
                  <div 
                    key={op.id} 
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-300 transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${badgeCor}`}>
                            {nivelStr}
                          </span>
                          <h4 className="font-extrabold text-slate-900 text-sm mt-1">{op.nome}</h4>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full">
                          Ativo
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div>Login de Acesso: <strong className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{op.login}</strong></div>
                        <div className="text-[11px] text-slate-500">
                          🏢 Condomínio: <strong>{getNomeCondominioPorId(op.condominio_id)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => prepararEdicaoOperador(op)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar no Card</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {operadores.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Nenhum operador encontrado.</p>
              <button
                onClick={abrirNovoOperador}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Cadastrar Primeiro Operador
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. ABA MORADORES & UNIDADES (VISÃO DE CARDS POR CASAS/UNIDADES EDITÁVEIS) */}
      {abaAtiva === 'moradores' && (
        <div className="space-y-4">
          {/* Banner de Identificação do Condomínio e Estrutura */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl border border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-emerald-400" />
                  {eEstruturaCasasAtivo ? 'Condomínio de Casas (Horizontal)' : 'Condomínio Vertical'}
                </span>
                <span className="text-[10px] font-bold text-slate-300">
                  {eEstruturaCasasAtivo ? '• Bloco FIXO como "Casa"' : `• ${configCondoAtivo?.qtd_blocos || 1} Bloco(s)`}
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-black text-white mt-1">
                {getNomeCondominioPorId(condoAtivoId)}
              </h4>
              <p className="text-xs text-slate-300">
                {eEstruturaCasasAtivo
                  ? `Gestão direta por Casas: ${contadoresUnidades.total} cards de casas prontos para cadastro e edição dos moradores.`
                  : `Gestão de unidades e moradores vinculados ao posto.`}
              </p>
            </div>

            {/* Contadores em Tempo Real */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
              <div className="bg-slate-800/90 border border-slate-700 p-2.5 rounded-xl text-center min-w-[85px]">
                <p className="text-[10px] font-bold uppercase text-slate-400">Total Unidades</p>
                <p className="text-base font-black text-emerald-400">{contadoresUnidades.total}</p>
              </div>
              <div className="bg-slate-800/90 border border-slate-700 p-2.5 rounded-xl text-center min-w-[85px]">
                <p className="text-[10px] font-bold uppercase text-emerald-400">Ocupadas</p>
                <p className="text-base font-black text-white">{contadoresUnidades.ocupadas}</p>
              </div>
              <div className="bg-slate-800/90 border border-slate-700 p-2.5 rounded-xl text-center min-w-[85px]">
                <p className="text-[10px] font-bold uppercase text-slate-400">Disponíveis</p>
                <p className="text-base font-black text-slate-300">{contadoresUnidades.vagas}</p>
              </div>
              <div className="bg-slate-800/90 border border-slate-700 p-2.5 rounded-xl text-center min-w-[85px]">
                <p className="text-[10px] font-bold uppercase text-purple-400">Moradores</p>
                <p className="text-base font-black text-white">{contadoresUnidades.totalMoradores}</p>
              </div>
            </div>
          </div>

          {/* Barra de Controle: Alternador de Visualização, Filtros e Busca */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              {/* Alternador de Modo de Visualização */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModoVisaoMoradores('cards_unidades')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    modoVisaoMoradores === 'cards_unidades'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cards de Unidades ({contadoresUnidades.total})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoVisaoMoradores('lista_moradores')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    modoVisaoMoradores === 'lista_moradores'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5 text-purple-600" />
                  <span>Lista de Moradores ({moradores.length})</span>
                </button>
              </div>

              {/* Botões de Ação da Aba Moradores */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Botão de Personalizar Numeração em Lote */}
                <button
                  type="button"
                  onClick={abrirModalRenumeracao}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
                  title="Editar ou colar sequência personalizada de números das casas"
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-700" />
                  <span>Personalizar Numeração</span>
                </button>

                {/* Botão de Formatar com Zero no Início (01, 02, 03...) */}
                <button
                  type="button"
                  onClick={formatarTodasComZeroEsquerda}
                  disabled={loading}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
                  title="Formatar automaticamente todas as casas 1 a 9 com zero no início (01, 02, 03...)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Salvar 01, 02, 03...</span>
                </button>

                {/* Botão de Adicionar Casa Avulsa */}
                <button
                  type="button"
                  onClick={() => {
                    setNovaUnidadeAvulsaNumero('');
                    setModalAddUnidadeAvulsaAberto(true);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
                  title="Adicionar uma casa ou unidade avulsa à lista"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                  <span>+ {eEstruturaCasasAtivo ? 'Casa Avulsa' : 'Unidade Avulsa'}</span>
                </button>

                {/* Botão de Adicionar Novo Morador */}
                <button
                  type="button"
                  onClick={() => abrirNovoMorador()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Novo Morador
                </button>
              </div>
            </div>

            {/* Linha de Busca e Filtros de Status */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1 border-t border-slate-100">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={termoBuscaMorador}
                  onChange={(e) => setTermoBuscaMorador(e.target.value)}
                  placeholder={eEstruturaCasasAtivo ? "Buscar casa (ex: 15, 117), nome ou telefone..." : "Buscar unidade, bloco, nome ou telefone..."}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Filtro por Status da Unidade */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setFiltroStatusUnidade('todas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    filtroStatusUnidade === 'todas'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Todas ({contadoresUnidades.total})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusUnidade('ocupadas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    filtroStatusUnidade === 'ocupadas'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Ocupadas ({contadoresUnidades.ocupadas})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusUnidade('vagas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    filtroStatusUnidade === 'vagas'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Disponíveis ({contadoresUnidades.vagas})
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MODO 1: GRID DE CARDS POR CASAS / UNIDADES (117 CARDS GERADOS)            */}
          {/* ========================================================================= */}
          {modoVisaoMoradores === 'cards_unidades' && (
            <div className="space-y-3">
              {/* Contagem de cards exibidos */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Exibindo{' '}
                  <strong className="text-slate-800">
                    {unidadesComMoradores.filter(item => {
                      if (filtroStatusUnidade === 'ocupadas' && !item.ocupada) return false;
                      if (filtroStatusUnidade === 'vagas' && item.ocupada) return false;
                      if (termoBuscaMorador.trim()) {
                        const t = termoBuscaMorador.trim().toLowerCase();
                        const num = item.unidade.numero.toLowerCase();
                        const lbl = item.unidade.label.toLowerCase();
                        const matchNum = num === t || num.includes(t) || lbl.includes(t);
                        const matchMorador = item.moradores.some(m => 
                          (m.nome || '').toLowerCase().includes(t) || 
                          (m.telefone || '').includes(t)
                        );
                        return matchNum || matchMorador;
                      }
                      return true;
                    }).length}
                  </strong>{' '}
                  de {contadoresUnidades.total} {eEstruturaCasasAtivo ? 'casas' : 'unidades'}
                </span>
                {eEstruturaCasasAtivo && (
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    🏡 Bloco Fixo como "Casa"
                  </span>
                )}
              </div>

              {/* Grid Responsivo de Cards de Casas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {unidadesComMoradores
                  .filter(item => {
                    if (filtroStatusUnidade === 'ocupadas' && !item.ocupada) return false;
                    if (filtroStatusUnidade === 'vagas' && item.ocupada) return false;
                    if (termoBuscaMorador.trim()) {
                      const t = termoBuscaMorador.trim().toLowerCase();
                      const num = item.unidade.numero.toLowerCase();
                      const lbl = item.unidade.label.toLowerCase();
                      const matchNum = num === t || num.includes(t) || lbl.includes(t);
                      const matchMorador = item.moradores.some(m => 
                        (m.nome || '').toLowerCase().includes(t) || 
                        (m.telefone || '').includes(t)
                      );
                      return matchNum || matchMorador;
                    }
                    return true;
                  })
                  .map((item) => {
                    return (
                      <div
                        key={item.unidade.id}
                        onClick={() => setUnidadeModalAberta(item)}
                        className={`rounded-2xl border p-3.5 shadow-2xs hover:shadow-md transition flex flex-col justify-between gap-3 cursor-pointer group select-none ${
                          item.ocupada 
                            ? 'bg-white hover:bg-emerald-50/40 border-slate-200 hover:border-emerald-400' 
                            : 'bg-slate-50/70 hover:bg-slate-100 border-dashed border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                              item.ocupada ? 'bg-amber-100 text-amber-900 border border-amber-300 group-hover:scale-105' : 'bg-slate-200 text-slate-500'
                            }`}>
                              <Home className="w-4 h-4 text-amber-800" />
                            </div>

                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-black text-slate-900 block truncate group-hover:text-emerald-950">
                                {eEstruturaCasasAtivo ? `CASA ${item.unidade.numero}` : item.unidade.label}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {item.ocupada ? `${item.moradores.length} ${item.moradores.length > 1 ? 'moradores cadastrados' : 'morador cadastrado'}` : 'Casa disponível'}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {item.ocupada ? (
                              <span className="text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {item.moradores.length} {item.moradores.length > 1 ? 'Moradores' : 'Morador'}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 border border-slate-300">
                                Disponível
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-emerald-700 transition font-bold">
                          <span>Ver / Gerenciar Moradores</span>
                          <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODO 2: LISTA DE MORADORES (VISÃO EM TABELA / CARDS DE PESSOAS)           */}
          {/* ========================================================================= */}
          {modoVisaoMoradores === 'lista_moradores' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {moradores
                  .filter(m => {
                    if (!termoBuscaMorador.trim()) return true;
                    const termo = termoBuscaMorador.toLowerCase();
                    const nm = (m.nome || '').toLowerCase();
                    const und = (m.unidade || '').toString().toLowerCase();
                    const blc = (m.bloco || '').toLowerCase();
                    return nm.includes(termo) || und.includes(termo) || blc.includes(termo);
                  })
                  .map((m) => {
                    const telLimpo = (m.telefone || '').replace(/\D/g, '');

                    return (
                      <div 
                        key={m.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-purple-300 transition space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-200">
                                {eEstruturaCasasAtivo ? `Casa ${m.unidade}` : `${m.bloco ? `${m.bloco} - ` : ''}Ap. ${m.unidade}`}
                              </span>
                              <h4 className="font-extrabold text-slate-900 text-sm mt-1">{m.nome}</h4>
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                              Morador
                            </span>
                          </div>

                          <div className="space-y-1 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{m.telefone || 'Telefone não informado'}</span>
                            </div>
                            {eAdmin && (
                              <div className="text-[11px] text-slate-400">
                                🏢 {getNomeCondominioPorId(m.condominio_id)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          {telLimpo ? (
                            <a
                              href={`https://wa.me/55${telLimpo}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition"
                              title="Conversar no WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Sem WhatsApp</span>
                          )}

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => prepararEdicaoMorador(m)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => excluirMorador(m)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {moradores.length === 0 && (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                  <Home className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">Nenhum morador encontrado com os filtros atuais.</p>
                  <button
                    onClick={() => abrirNovoMorador()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    + Cadastrar Primeiro Morador
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. ABA GESTÃO DINÂMICA DE NÍVEIS DE ACESSO E PERMISSÕES (RBAC) */}
      {abaAtiva === 'niveis' && !eOperador && (
        <div className="space-y-4">
          <GerenciamentoPermissoes
            condominioId={condoAtivoId}
            operadores={operadores}
            onAtualizacao={carregarDados}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MENU FLUTUANTE / MODAL DE CADASTRO E EDIÇÃO DIRETAMENTE NO CARD           */}
      {/* ========================================================================= */}
      {modalFlutuanteAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-8 relative">
            {/* Header do Menu Flutuante */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className={`p-2.5 rounded-2xl ${
                  tipoModalFlutuante === 'condominio' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : tipoModalFlutuante === 'operador' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {tipoModalFlutuante === 'condominio' ? (
                    <Building2 className="w-5 h-5" />
                  ) : tipoModalFlutuante === 'operador' ? (
                    <UserPlus className="w-5 h-5" />
                  ) : (
                    <Home className="w-5 h-5" />
                  )}
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    {idEdicao ? (
                      tipoModalFlutuante === 'condominio' 
                        ? `Editar Condomínio: ${nomeCondominio}` 
                        : tipoModalFlutuante === 'operador' 
                        ? `Editar Operador: ${nomeOperador}` 
                        : `Editar Morador: ${nomeMorador}`
                    ) : (
                      tipoModalFlutuante === 'condominio' 
                        ? 'Novo Cadastro de Condomínio' 
                        : tipoModalFlutuante === 'operador' 
                        ? 'Novo Cadastro de Operador' 
                        : 'Novo Cadastro de Morador'
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menu flutuante de edição rápida e parametrização
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fecharModalFlutuante}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FORMULÁRIO 1: CONDOMÍNIO */}
            {tipoModalFlutuante === 'condominio' && (
              <form onSubmit={salvarCondominio} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nome do Condomínio *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeCondominio}
                    onChange={(e) => setNomeCondominio(e.target.value)}
                    placeholder="Ex: Residencial Flores do Bosque"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={enderecoCondominio}
                    onChange={(e) => setEnderecoCondominio(e.target.value)}
                    placeholder="Av. Exemplo, 1234 - Bairro, Cidade/UF"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Estrutura das Casas / Unidades */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-900 uppercase flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-emerald-600" />
                      Estrutura do Condomínio & Unidades
                    </label>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Geração Automática de Cards
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Tipo de Condomínio *
                    </label>
                    <select
                      value={tipoEstruturaCondominio}
                      onChange={(e) => {
                        const novoTipo = e.target.value;
                        setTipoEstruturaCondominio(novoTipo);
                        if (isEstruturaCasas(novoTipo)) {
                          if (!unidadesPorBlocoCondominio || unidadesPorBlocoCondominio <= 1) {
                            setUnidadesPorBlocoCondominio(117);
                          }
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    >
                      {OPCOES_TIPO_ESTRUTURA.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Se for Condomínio de Casas */}
                  {isEstruturaCasas(tipoEstruturaCondominio) && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2 animate-fade-in">
                      <div className="flex items-start gap-2">
                        <Home className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black text-emerald-950">
                            Modo Casas Ativo: Bloco FIXO como "Casa"
                          </p>
                          <p className="text-[11px] text-emerald-800 leading-relaxed">
                            Onde seria Bloco vira <strong>"Casa" fixo</strong> sem precisar editar nem o operador selecionar! O sistema gera automaticamente os cards editáveis em Moradores.
                          </p>
                        </div>
                      </div>

                      <div className="pt-1">
                        <label className="block text-[10px] font-black text-emerald-950 uppercase mb-1">
                          Quantidade Total de Casas / Unidades * (Ex: 117)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          required
                          value={unidadesPorBlocoCondominio}
                          onChange={(e) => setUnidadesPorBlocoCondominio(Math.max(1, parseInt(e.target.value) || 1))}
                          placeholder="Ex: 117"
                          className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                        />
                        <p className="text-[10px] text-emerald-700 mt-1 font-semibold">
                          ✓ Serão criados {unidadesPorBlocoCondominio || 117} cards editáveis ({zerosEsquerdaCondominio ? 'Casa 01 a Casa ' : 'Casa 1 a Casa '}{unidadesPorBlocoCondominio || 117}) em Moradores para adicionar todos os residentes!
                        </p>

                        <label className="flex items-start gap-2.5 cursor-pointer pt-2 mt-2 border-t border-emerald-200/80 bg-white/80 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                          <input
                            type="checkbox"
                            checked={zerosEsquerdaCondominio}
                            onChange={(e) => setZerosEsquerdaCondominio(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer mt-0.5"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-emerald-950 flex items-center gap-1">
                              🔢 Numeração com zero no início (01, 02, 03...)
                            </span>
                            <p className="text-[11px] text-emerald-800 leading-snug">
                              Gera e salva casas de 1 a 9 com zero no início ("01", "02", "03"... "09", "10"... "{unidadesPorBlocoCondominio || 117}").
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Se for Blocos ou Torres */}
                  {(tipoEstruturaCondominio === 'blocos' || tipoEstruturaCondominio === 'torres') && (
                    <div className="grid grid-cols-2 gap-2.5 animate-fade-in">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Qtd de {tipoEstruturaCondominio === 'torres' ? 'Torres' : 'Blocos'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={qtdBlocosCondominio}
                          onChange={(e) => setQtdBlocosCondominio(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Unidades por Bloco
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="300"
                          value={unidadesPorBlocoCondominio}
                          onChange={(e) => setUnidadesPorBlocoCondominio(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* Se for Numeral Direto */}
                  {tipoEstruturaCondominio === 'numeral_direto' && (
                    <div className="animate-fade-in">
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Quantidade Total de Unidades / Lotes
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={unidadesPorBlocoCondominio}
                        onChange={(e) => setUnidadesPorBlocoCondominio(Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="Ex: 100"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>
                  )}
                </div>

                {/* Escala e Horários */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-900 uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    Escala de Plantão & Horários de Troca
                  </label>
                  <select
                    value={escalaPlantao}
                    onChange={(e: any) => {
                      const nova = e.target.value;
                      setEscalaPlantao(nova);
                      const opt = OPCOES_ESCALA.find(o => o.id === nova);
                      if (opt && nova !== 'personalizado') {
                        setHorarioDiurnoInicio(opt.diurnoInicio);
                        setHorarioNoturnoInicio(opt.noturnoInicio);
                      }
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {OPCOES_ESCALA.map((op) => (
                      <option key={op.id} value={op.id}>
                        🕒 {op.label}
                      </option>
                    ))}
                  </select>

                  {escalaPlantao === 'personalizado' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Início Diurno</label>
                        <input
                          type="time"
                          value={horarioDiurnoInicio}
                          onChange={(e) => setHorarioDiurnoInicio(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Início Noturno</label>
                        <input
                          type="time"
                          value={horarioNoturnoInicio}
                          onChange={(e) => setHorarioNoturnoInicio(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* WhatsApp do Grupo do Posto */}
                <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                    Link do Grupo de WhatsApp da Portaria
                  </label>
                  <input
                    type="url"
                    value={whatsappGrupoUrl}
                    onChange={(e) => setWhatsappGrupoUrl(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-mono text-slate-900"
                  />
                </div>

                {/* Telefones de Apoio e Síndico */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Telefone Portaria</label>
                    <input
                      type="text"
                      value={telefonePortaria}
                      onChange={(e) => setTelefonePortaria(e.target.value)}
                      placeholder="(11) 98888-0000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nome do Síndico</label>
                    <input
                      type="text"
                      value={sindicoNome}
                      onChange={(e) => setSindicoNome(e.target.value)}
                      placeholder="Nome do Síndico"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={fecharModalFlutuante}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    {loading ? 'Salvando...' : idEdicao ? 'Atualizar Condomínio' : 'Salvar Condomínio'}
                  </button>
                </div>
              </form>
            )}

            {/* FORMULÁRIO 2: OPERADOR */}
            {tipoModalFlutuante === 'operador' && (
              <form onSubmit={salvarOperador} className="space-y-3.5">
                {eAdmin && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Condomínio Vinculado *
                    </label>
                    <select
                      value={condominioIdOperador}
                      onChange={(e) => setCondominioIdOperador(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Selecione o Condomínio...</option>
                      {condominios.map((c) => (
                        <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nome Completo do Operador *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeOperador}
                    onChange={(e) => setNomeOperador(e.target.value)}
                    placeholder="Ex: Marcos Souza Oliveira"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Login de Acesso *
                    </label>
                    <input
                      type="text"
                      required
                      value={loginOperador}
                      onChange={(e) => setLoginOperador(e.target.value.toLowerCase())}
                      placeholder="marcos.porteiro"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      {idEdicao ? 'Nova Senha (opcional)' : 'Senha de Acesso *'}
                    </label>
                    <input
                      type="password"
                      required={!idEdicao}
                      value={senhaOperador}
                      onChange={(e) => setSenhaOperador(e.target.value)}
                      placeholder={idEdicao ? 'Deixe em branco para manter' : 'Senha secreta'}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nível de Acesso / Perfil *
                  </label>
                  <select
                    value={nivelAcesso}
                    onChange={(e) => setNivelAcesso(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    {listaNiveis.map((n) => {
                      if (n.id === 'nivel_0' && !eAdmin && nivelAcesso !== '0' && nivelAcesso !== 'nivel_0') {
                        return null;
                      }
                      return (
                        <option key={n.id} value={n.id}>
                          {n.nome} {n.padrao_sistema ? '' : '★ (Customizado)'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={fecharModalFlutuante}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-600/30 cursor-pointer"
                  >
                    {loading ? 'Salvando...' : idEdicao ? 'Atualizar Operador' : 'Salvar Operador'}
                  </button>
                </div>
              </form>
            )}

            {/* FORMULÁRIO 3: MORADOR */}
            {tipoModalFlutuante === 'morador' && (
              <form onSubmit={salvarMorador} className="space-y-3.5">
                {eAdmin && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Condomínio *
                    </label>
                    <select
                      value={condominioIdMorador}
                      onChange={(e) => {
                        const novoId = e.target.value;
                        setCondominioIdMorador(novoId);
                        const cfgNovo = mapaConfigsCondos[novoId];
                        if (isEstruturaCasas(cfgNovo?.tipo_estrutura)) {
                          setBlocoMorador('Casa');
                        }
                      }}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">Selecione o Condomínio...</option>
                      {condominios.map((c) => (
                        <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nome Completo do Morador *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeMorador}
                    onChange={(e) => setNomeMorador(e.target.value)}
                    placeholder="Ex: Carlos Eduardo da Silva"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                {/* Estrutura: Se for Condomínio de Casas, Bloco vira "Casa" fixo sem operador selecionar ou digitar */}
                {(() => {
                  const targetCondo = eAdmin ? (condominioIdMorador || condominioFiltroAdmin) : usuarioLogado?.condominio_id;
                  const cfgTarget = mapaConfigsCondos[targetCondo];
                  const eCasasModal = isEstruturaCasas(cfgTarget?.tipo_estrutura);
                  const eTorresModal = isEstruturaTorres(cfgTarget?.tipo_estrutura);
                  const eNumeralModal = isEstruturaNumeralDireto(cfgTarget?.tipo_estrutura);
                  const listaBlocosSugestao = obterListaBlocosOuTorres(cfgTarget, moradores);
                  const rotuloBlocoModal = eTorresModal ? 'Torre' : 'Bloco';
                  const rotuloUnidadeModal = eCasasModal 
                    ? 'Número da Casa *' 
                    : eNumeralModal 
                    ? 'Número da Unidade / Lote *' 
                    : 'Apartamento / Unidade *';

                  return (
                    <div className={eNumeralModal ? 'space-y-2' : 'grid grid-cols-2 gap-2.5'}>
                      {eCasasModal ? (
                        <div>
                          <label className="block text-[11px] font-bold text-emerald-900 uppercase mb-1 flex items-center gap-1">
                            <Home className="w-3.5 h-3.5 text-emerald-600" /> Bloco / Tipo
                          </label>
                          <div className="w-full p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-black text-emerald-950 flex items-center justify-between">
                            <span>🏠 Casa (Fixo)</span>
                            <span className="text-[9px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                              Automático
                            </span>
                          </div>
                        </div>
                      ) : eNumeralModal ? null : (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-700 uppercase">
                              {rotuloBlocoModal} *
                            </label>
                            {listaBlocosSugestao.length > 0 && (
                              <span className="text-[10px] text-purple-700 font-bold">
                                {listaBlocosSugestao.length} {eTorresModal ? 'torres' : 'blocos'} cadastrados
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              list="lista-sugestoes-blocos"
                              value={blocoMorador}
                              onChange={(e) => setBlocoMorador(e.target.value)}
                              placeholder={eTorresModal ? "Selecione ou digite a Torre..." : "Selecione ou digite o Bloco..."}
                              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                            />
                            <datalist id="lista-sugestoes-blocos">
                              {listaBlocosSugestao.map((b) => (
                                <option key={b} value={b} />
                              ))}
                            </datalist>
                          </div>
                          {listaBlocosSugestao.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5 max-h-20 overflow-y-auto">
                              {listaBlocosSugestao.map((b) => (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => setBlocoMorador(b)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                                    blocoMorador.toLowerCase() === b.toLowerCase()
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-purple-50 hover:text-purple-700'
                                  }`}
                                >
                                  {b}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          {rotuloUnidadeModal}
                        </label>
                        <input
                          type="text"
                          required
                          value={unidadeMorador}
                          onChange={(e) => setUnidadeMorador(e.target.value)}
                          placeholder={eCasasModal ? "Ex: 01 ou 117" : "Ex: 101"}
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={telefoneMorador}
                    onChange={(e) => setTelefoneMorador(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={fecharModalFlutuante}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-purple-600/30 cursor-pointer"
                  >
                    {loading ? 'Salvando...' : idEdicao ? 'Atualizar Morador' : 'Salvar Morador'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Personalização / Renumeração em Lote das Unidades */}
      {modalRenumeracaoAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <Pencil className="w-5 h-5 text-amber-700" />
                </span>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Personalizar Numeração das Casas / Unidades
                  </h4>
                  <p className="text-xs text-slate-500">
                    Condomínio: {getNomeCondominioPorId(condoAtivoId)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalRenumeracaoAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs text-slate-600">
                Digite ou cole os números das casas (um por linha ou separados por vírgula). Se as identificações forem <strong>01, 02, 03</strong> ou personalizadas (ex: <strong>12A, 14, Lote 3</strong>), ajuste livremente abaixo:
              </p>

              <div className="flex flex-wrap gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const total = configCondoAtivo?.unidades_por_bloco ? Number(configCondoAtivo.unidades_por_bloco) : 117;
                    const seq = Array.from({ length: total }, (_, i) => {
                      const n = i + 1;
                      return n < 10 ? String(n).padStart(2, '0') : String(n);
                    }).join('\n');
                    setTextoListaUnidades(seq);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 rounded-lg font-black transition cursor-pointer flex items-center gap-1 border border-emerald-300 shadow-2xs"
                  title="Gera sequência 01, 02, 03... com zero à esquerda nos números de 1 dígito"
                >
                  <Sparkles className="w-3 h-3 text-emerald-700" />
                  ✨ Gerar 01 a {configCondoAtivo?.unidades_por_bloco || 117} (com zero: 01, 02, 03...)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const total = configCondoAtivo?.unidades_por_bloco ? Number(configCondoAtivo.unidades_por_bloco) : 117;
                    const seq = Array.from({ length: total }, (_, i) => String(i + 1)).join('\n');
                    setTextoListaUnidades(seq);
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition cursor-pointer"
                >
                  🔢 Gerar 1 a {configCondoAtivo?.unidades_por_bloco || 117} (sem zero)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const itens = textoListaUnidades.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
                    const convertidos = itens.map(s => formatarComZeroEsquerda(s, 2));
                    setTextoListaUnidades(convertidos.join('\n'));
                  }}
                  className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-lg font-bold transition cursor-pointer border border-amber-300"
                  title="Converte 1 -> 01, 2 -> 02, etc."
                >
                  0️⃣ Adicionar zero aos números 1..9 (01, 02...)
                </button>
              </div>

              <textarea
                value={textoListaUnidades}
                onChange={(e) => setTextoListaUnidades(e.target.value)}
                rows={10}
                placeholder="Exemplo:&#10;01&#10;02&#10;03&#10;... ou separados por vírgula: 01, 02, 03"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Total de casas/unidades informadas: <strong>{textoListaUnidades.split(/[\n,;]+/).filter(s => s.trim()).length}</strong></span>
                <span className="text-[10px] text-emerald-700 font-semibold">✓ Suporta quebra de linha ou vírgulas (01,02,03)</span>
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalRenumeracaoAberto(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarRenumeracaoEmLote}
                disabled={loading}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {loading ? 'Salvando...' : 'Salvar Lista de Unidades'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adição de Casa / Unidade Avulsa */}
      {modalAddUnidadeAvulsaAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-900 rounded-xl">
                  <Home className="w-5 h-5 text-emerald-700" />
                </span>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Adicionar {eEstruturaCasasAtivo ? 'Casa Avulsa' : 'Unidade Avulsa'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {getNomeCondominioPorId(condoAtivoId)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAddUnidadeAvulsaAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Número ou Identificação da {eEstruturaCasasAtivo ? 'Casa' : 'Unidade'} *
                </label>
                <input
                  type="text"
                  value={novaUnidadeAvulsaNumero}
                  onChange={(e) => setNovaUnidadeAvulsaNumero(e.target.value)}
                  placeholder={eEstruturaCasasAtivo ? "Ex: 118 ou 12A" : "Ex: 105"}
                  autoFocus
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      adicionarCasaAvulsa();
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalAddUnidadeAvulsaAberto(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={adicionarCasaAvulsa}
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {loading ? 'Adicionando...' : 'Adicionar Casa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GERENCIAR MORADORES DA UNIDADE / CASA */}
      {unidadeModalAberta && (() => {
        const itemUnidade = unidadesComMoradores.find((u: any) => u.unidade.id === unidadeModalAberta.unidade.id) || unidadeModalAberta;
        const totalMoradores = itemUnidade.moradores.length;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center">
                    <Home className="w-5 h-5 text-amber-800" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <span>{eEstruturaCasasAtivo ? `CASA ${itemUnidade.unidade.numero}` : itemUnidade.unidade.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        totalMoradores > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {totalMoradores > 0 ? `${totalMoradores} ${totalMoradores > 1 ? 'Moradores' : 'Morador'}` : 'Disponível'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Gerenciamento e cadastro de residentes desta unidade.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setUnidadeModalAberta(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Botão de Adicionar Morador nesta Unidade */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    abrirNovoMorador({ numero: itemUnidade.unidade.numero, bloco: itemUnidade.unidade.bloco });
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {totalMoradores > 0 
                      ? `+ Adicionar Outro Morador na ${eEstruturaCasasAtivo ? `Casa ${itemUnidade.unidade.numero}` : 'Unidade'}`
                      : `+ Cadastrar Morador na ${eEstruturaCasasAtivo ? `Casa ${itemUnidade.unidade.numero}` : 'Unidade'}`}
                  </span>
                </button>
              </div>

              {/* Lista dos Moradores da Unidade */}
              <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
                {totalMoradores > 0 ? (
                  itemUnidade.moradores.map((m: any) => {
                    const telLimpo = (m.telefone || '').replace(/\D/g, '');

                    return (
                      <div
                        key={m.id}
                        className="p-3 bg-slate-50 hover:bg-slate-100/90 rounded-xl border border-slate-200 flex items-center justify-between gap-2 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{m.nome}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {m.telefone ? `📞 ${m.telefone}` : 'Telefone não informado'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {telLimpo && (
                            <a
                              href={`https://wa.me/55${telLimpo}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                              title="Conversar no WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => prepararEdicaoMorador(m)}
                            className="p-2 text-slate-600 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition cursor-pointer"
                            title="Editar Dados do Morador"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => excluirMorador(m)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Excluir Morador"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-1.5">
                    <Home className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">
                      Nenhum morador cadastrado nesta {eEstruturaCasasAtivo ? 'casa' : 'unidade'}.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Utilize o botão acima para cadastrar o primeiro morador.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setUnidadeModalAberta(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
