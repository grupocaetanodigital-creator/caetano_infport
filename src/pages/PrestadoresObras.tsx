import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import ModalLeitorDocumentoOCR from '../components/ModalLeitorDocumentoOCR';
import { validarCPF, formatarCPF, validarRG } from '../services/documentOcrService';
import { 
  Briefcase, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Search, 
  LogIn, 
  LogOut, 
  Camera, 
  Building2, 
  Scan, 
  Loader2,
  FileText,
  ShieldCheck,
  Eye,
  User,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface PrestadoresObrasProps {
  usuarioLogado?: any;
}

export default function PrestadoresObras({ usuarioLogado }: PrestadoresObrasProps) {
  const [prestadores, setPrestadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [busca, setBusca] = useState('');

  // Modais
  const [modalCadastro, setModalCadastro] = useState(false);
  const [modalAcesso, setModalAcesso] = useState(false);
  const [modalOcrAberto, setModalOcrAberto] = useState(false);
  const [modalVisualizarDoc, setModalVisualizarDoc] = useState<any | null>(null);
  const [prestadorSelecionado, setPrestadorSelecionado] = useState<any | null>(null);

  // Campos do formulário
  const [nomeProfissional, setNomeProfissional] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [documento, setDocumento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('CPF');
  const [fotoDocumento, setFotoDocumento] = useState('');
  const [fotoRosto, setFotoRosto] = useState('');
  const [tipoServico, setTipoServico] = useState('Manutenção / Reforma');
  const [atendeCondominio, setAtendeCondominio] = useState(false);
  const [unidadeDestino, setUnidadeDestino] = useState('');
  const [blocoDestino, setBlocoDestino] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [cracha, setCracha] = useState('');

  useEffect(() => {
    carregarPrestadores();
  }, [usuarioLogado?.condominio_id]);

  const carregarPrestadores = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('prestadores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrestadores(data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar prestadores: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Recebe os dados extraídos pelo OCR (Nome, CPF/RG validado, fotos recortadas)
   */
  const handleOcrConfirmado = (dados: {
    nomeCompleto: string;
    documento: string;
    tipoDocumento: string;
    fotoDocumentoBase64?: string;
    fotoRostoBase64?: string;
    empresa?: string;
  }) => {
    setNomeProfissional(dados.nomeCompleto);
    setDocumento(dados.documento);
    setTipoDocumento(dados.tipoDocumento);
    if (dados.fotoDocumentoBase64) setFotoDocumento(dados.fotoDocumentoBase64);
    if (dados.fotoRostoBase64) setFotoRosto(dados.fotoRostoBase64);
    if (dados.empresa && !empresa) setEmpresa(dados.empresa);

    setModalOcrAberto(false);
    setModalCadastro(true);
    setMensagem({
      tipo: 'sucesso',
      texto: `✅ Dados extraídos com sucesso! Tipo: ${dados.tipoDocumento} - Confira os campos e salve o cadastro.`
    });
  };

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const novoRegistro: any = {
        condominio_id: usuarioLogado.condominio_id,
        nome_profissional: nomeProfissional.trim(),
        empresa: empresa.trim(),
        documento: documento.trim(),
        tipo_servico: tipoServico,
        atende_condominio: atendeCondominio,
        unidade: atendeCondominio ? 'Condomínio' : unidadeDestino.trim(),
        bloco: atendeCondominio ? 'Área Comum' : blocoDestino.trim(),
        observacoes: observacoes.trim(),
        status_acesso: 'AUTORIZADO',
        foto_documento: fotoDocumento || null,
        foto_rosto: fotoRosto || null,
        tipo_documento: tipoDocumento || 'CPF'
      };

      // Tenta gravar com campos estendidos de OCR e foto
      let { error } = await supabase
        .from('prestadores')
        .insert([novoRegistro]);

      // Fallback gracioso caso as colunas foto_documento ainda não existam no Supabase
      if (error && (error.message.includes('foto_documento') || error.message.includes('column') || (error as any).code === '42703')) {
        console.warn('Banco de dados ainda sem colunas de foto. Salvando registro essencial...');
        const registroBasico = {
          condominio_id: usuarioLogado.condominio_id,
          nome_profissional: nomeProfissional.trim(),
          empresa: empresa.trim(),
          documento: documento.trim(),
          tipo_servico: tipoServico,
          atende_condominio: atendeCondominio,
          unidade: atendeCondominio ? 'Condomínio' : unidadeDestino.trim(),
          bloco: atendeCondominio ? 'Área Comum' : blocoDestino.trim(),
          observacoes: observacoes.trim(),
          status_acesso: 'AUTORIZADO'
        };
        const retry = await supabase.from('prestadores').insert([registroBasico]);
        error = retry.error;
      }

      if (error) throw error;

      // Limpa formulário
      setModalCadastro(false);
      setNomeProfissional('');
      setEmpresa('');
      setDocumento('');
      setFotoDocumento('');
      setFotoRosto('');
      setTipoDocumento('CPF');
      setUnidadeDestino('');
      setBlocoDestino('');
      setAtendeCondominio(false);
      setObservacoes('');

      await carregarPrestadores();
      setMensagem({ tipo: 'sucesso', texto: 'Prestador / Obra cadastrado com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao cadastrar: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const registrarEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prestadorSelecionado) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('prestadores')
        .update({
          status_acesso: 'EM_ANDAMENTO',
          data_hora_entrada: new Date().toISOString(),
          cracha_atribuido: cracha.trim() || 'Crachá Portaria'
        })
        .eq('id', prestadorSelecionado.id);

      if (error) throw error;

      setModalAcesso(false);
      setPrestadorSelecionado(null);
      setCracha('');
      await carregarPrestadores();
      setMensagem({ tipo: 'sucesso', texto: 'Entrada registrada com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar entrada: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const registrarSaida = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('prestadores')
        .update({
          status_acesso: 'CONCLUIDO',
          data_hora_saida: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      await carregarPrestadores();
      setMensagem({ tipo: 'sucesso', texto: 'Saída registrada e crachá devolvido!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar saída: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const prestadoresFiltrados = prestadores.filter((p: any) => 
    p.nome_profissional?.toLowerCase().includes(busca.toLowerCase()) ||
    p.empresa?.toLowerCase().includes(busca.toLowerCase()) ||
    p.documento?.toLowerCase().includes(busca.toLowerCase()) ||
    p.unidade?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl border border-slate-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit border border-emerald-500/20">
            <Briefcase className="w-3.5 h-3.5" /> Módulo 10 - Obras e Prestadores
          </span>
          <h3 className="font-bold text-lg sm:text-xl mt-1.5 text-white flex items-center gap-2">
            Controle de Prestadores de Serviço e Obras
          </h3>
          <p className="text-xs text-slate-300">
            Cadastro ágil com OCR inteligente de documentos (CPF, RG, CNH e Crachás) e auditoria na portaria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Botão de Destaque: Leitor OCR com Câmera */}
          <button
            type="button"
            onClick={() => setModalOcrAberto(true)}
            className="flex-1 sm:flex-initial bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-lg active:scale-[0.98] uppercase tracking-wide cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Ler Documento (OCR)</span>
          </button>

          {/* Botão Novo Prestador Manual */}
          <button
            type="button"
            onClick={() => {
              setNomeProfissional('');
              setEmpresa('');
              setDocumento('');
              setFotoDocumento('');
              setFotoRosto('');
              setModalCadastro(true);
            }}
            className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-4 py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Manual
          </button>
        </div>
      </div>

      {mensagem.texto && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{mensagem.texto}</span>
        </div>
      )}

      {/* Barra de Pesquisa */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por nome do profissional, CPF/RG, empresa ou unidade..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs shadow-sm font-medium focus:outline-hidden focus:border-emerald-500 transition"
        />
      </div>

      {/* Grid dos Prestadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prestadoresFiltrados.map((item: any) => {
          const docLimpo = (item.documento || '').replace(/\D/g, '');
          const ehCpfValido = docLimpo.length === 11 && validarCPF(docLimpo);
          const ehRg = validarRG(item.documento || '');

          return (
            <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3.5 flex flex-col justify-between hover:shadow-md transition">
              <div className="space-y-3">
                {/* Linha Superior: Empresa e Status */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide truncate max-w-[60%]">
                    {item.empresa || 'Autônomo'}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    item.status_acesso === 'EM_ANDAMENTO' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                    item.status_acesso === 'CONCLUIDO' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}>
                    {item.status_acesso === 'EM_ANDAMENTO' ? '🟢 No Posto' :
                     item.status_acesso === 'CONCLUIDO' ? '⚪ Concluído' : '🟡 Autorizado'}
                  </span>
                </div>

                {/* Perfil: Foto da Face / Documento + Dados */}
                <div className="flex items-start gap-3">
                  {item.foto_rosto ? (
                    <div 
                      onClick={() => setModalVisualizarDoc(item)}
                      className="w-14 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-sm flex-shrink-0 cursor-pointer relative group"
                      title="Ver foto do documento e face"
                    >
                      <img src={item.foto_rosto} alt={item.nome_profissional} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ) : item.foto_documento ? (
                    <div 
                      onClick={() => setModalVisualizarDoc(item)}
                      className="w-14 h-16 rounded-2xl overflow-hidden border border-slate-300 shadow-sm flex-shrink-0 cursor-pointer relative group bg-slate-100 flex items-center justify-center"
                      title="Ver foto do documento"
                    >
                      <img src={item.foto_documento} alt="Doc" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate" title={item.nome_profissional}>
                      {item.nome_profissional}
                    </h4>

                    {/* Número do Documento com Selo de Validação */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-xs font-mono text-slate-600 font-bold">
                        {item.documento || 'Não informado'}
                      </span>
                      {ehCpfValido ? (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-emerald-300" title="CPF verificado matematicamente pela Receita Federal">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> CPF OK
                        </span>
                      ) : ehRg ? (
                        <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-300">
                          RG
                        </span>
                      ) : null}
                    </div>

                    {/* Botão Ver Documento Anexado */}
                    {(item.foto_documento || item.foto_rosto) && (
                      <button
                        type="button"
                        onClick={() => setModalVisualizarDoc(item)}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" /> Ver Documento Digital
                      </button>
                    )}
                  </div>
                </div>

                {/* Destino e Serviço */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl text-xs border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Serviço:</span>
                    <strong className="text-slate-800 truncate block">{item.tipo_servico}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Destino:</span>
                    {item.atende_condominio ? (
                      <strong className="text-purple-700 flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> Condomínio
                      </strong>
                    ) : (
                      <strong className="text-emerald-700 truncate block">
                        Bloco {item.bloco} - Apt {item.unidade}
                      </strong>
                    )}
                  </div>
                </div>

                {item.cracha_atribuido && (
                  <div className="text-[11px] font-bold text-slate-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                    Portaria: {item.cracha_atribuido}
                  </div>
                )}

                {item.observacoes && (
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                    "{item.observacoes}"
                  </p>
                )}
              </div>

              {/* Rodapé: Ações de Entrada e Saída */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(item.created_at).toLocaleDateString('pt-BR')}
                </span>

                {item.status_acesso === 'EM_ANDAMENTO' ? (
                  <button
                    onClick={() => registrarSaida(item.id)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition shadow-sm cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Registrar Saída
                  </button>
                ) : item.status_acesso === 'CONCLUIDO' ? (
                  <span className="text-xs text-slate-400 font-medium italic">Acesso finalizado</span>
                ) : (
                  <button
                    onClick={() => { setPrestadorSelecionado(item); setModalAcesso(true); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 transition shadow-sm cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Liberar Entrada
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {prestadoresFiltrados.length === 0 && !loading && (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 text-sm">Nenhum prestador encontrado</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Utilize o botão "Ler Documento (OCR)" para cadastrar prestadores com leitura automática de CPF, RG ou CNH.
            </p>
          </div>
        )}
      </div>

      {/* MODAL 1: FORMULÁRIO DE CADASTRO DO PRESTADOR */}
      {modalCadastro && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto border border-slate-200">
            <button 
              onClick={() => setModalCadastro(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base sm:text-lg border-b pb-3 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600" /> Cadastrar Prestador / Obra
            </h3>

            {/* Banner de Leitura OCR com Botão de Ativação */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                  <Scan className="w-4 h-4" /> OCR de Documentos (CPF, RG, CNH, Crachá)
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  Anti-Números Aleatórios
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Tire foto do documento físico ou crachá para preencher o nome completo, CPF/RG e anexar as fotos instantaneamente.
              </p>

              <button
                type="button"
                onClick={() => setModalOcrAberto(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md uppercase"
              >
                <Camera className="w-4 h-4" /> Abrir Câmera de OCR do Documento
              </button>
            </div>

            {/* Pré-visualização da Foto do Documento e Face Capturados */}
            {(fotoDocumento || fotoRosto) && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-3">
                {fotoRosto && (
                  <div className="w-14 h-16 rounded-xl overflow-hidden border border-emerald-500 shadow-sm flex-shrink-0">
                    <img src={fotoRosto} alt="Face" className="w-full h-full object-cover" />
                  </div>
                )}
                {fotoDocumento && (
                  <div className="w-20 h-16 rounded-xl overflow-hidden border border-slate-300 shadow-sm flex-shrink-0">
                    <img src={fotoDocumento} alt="Documento" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 text-xs space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Fotos Anexadas via OCR
                  </span>
                  <p className="text-slate-600 font-medium">As fotos ficarão disponíveis para auditoria na portaria.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCadastrar} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nome Completo do Profissional *
                </label>
                <input
                  type="text"
                  required
                  value={nomeProfissional}
                  onChange={(e) => setNomeProfissional(e.target.value)}
                  placeholder="Ex: Carlos Roberto da Silva"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:border-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Empresa / Prestadora
                  </label>
                  <input
                    type="text"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    placeholder="Ex: ArTech Climatização"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                    <span>CPF / RG *</span>
                    {validarCPF(documento) ? (
                      <span className="text-[9px] text-emerald-700 font-bold">✓ CPF Válido</span>
                    ) : null}
                  </label>
                  <input
                    type="text"
                    required
                    value={documento}
                    onChange={(e) => {
                      const val = e.target.value;
                      const limpo = val.replace(/\D/g, '');
                      if (limpo.length === 11 && validarCPF(limpo)) {
                        setDocumento(formatarCPF(limpo));
                      } else {
                        setDocumento(val);
                      }
                    }}
                    placeholder="000.000.000-00 ou RG"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Checkbox Serviço Condomínio */}
              <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-950 block">Serviço Prestado ao Condomínio?</span>
                  <span className="text-[10px] text-purple-700">Manutenção predial, elevadores, gerador, etc.</span>
                </div>
                <input
                  type="checkbox"
                  checked={atendeCondominio}
                  onChange={(e) => setAtendeCondominio(e.target.checked)}
                  className="w-5 h-5 rounded-lg accent-purple-600 cursor-pointer"
                />
              </div>

              {!atendeCondominio && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bloco *</label>
                    <input
                      type="text"
                      required={!atendeCondominio}
                      value={blocoDestino}
                      onChange={(e) => setBlocoDestino(e.target.value)}
                      placeholder="Ex: A"
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidade / Apto *</label>
                    <input
                      type="text"
                      required={!atendeCondominio}
                      value={unidadeDestino}
                      onChange={(e) => setUnidadeDestino(e.target.value)}
                      placeholder="Ex: 102"
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Serviço</label>
                <select
                  value={tipoServico}
                  onChange={(e) => setTipoServico(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:border-emerald-500 transition"
                >
                  <option value="Manutenção / Reforma">Manutenção / Reforma</option>
                  <option value="Serviço Predial Condomínio">Serviço Predial Condomínio</option>
                  <option value="Entrega de Móveis">Entrega de Móveis</option>
                  <option value="Instalação de Internet / Telecom">Instalação de Internet / Telecom</option>
                  <option value="Assistência Técnica">Assistência Técnica</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações / Horários</label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Instruções específicas para a guarita..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs resize-none focus:border-emerald-500 transition"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCadastro(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase shadow-md transition active:scale-[0.98] cursor-pointer"
                >
                  {loading ? 'Salvando...' : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LIBERAÇÃO DE ENTRADA NA PORTARIA */}
      {modalAcesso && prestadorSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-slate-200">
            <button onClick={() => setModalAcesso(false)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <LogIn className="w-5 h-5 text-emerald-600" /> Liberar Entrada na Portaria
            </h3>

            <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-1.5 border border-slate-100">
              <p><strong>Profissional:</strong> {prestadorSelecionado.nome_profissional}</p>
              <p><strong>Documento:</strong> {prestadorSelecionado.documento}</p>
              <p><strong>Empresa:</strong> {prestadorSelecionado.empresa || 'Autônomo'}</p>
              <p><strong>Destino:</strong> {prestadorSelecionado.atende_condominio ? 'Condomínio (Área Comum)' : `Bloco ${prestadorSelecionado.bloco} - Apto ${prestadorSelecionado.unidade}`}</p>
            </div>

            <form onSubmit={registrarEntrada} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Crachá Atribuído
                </label>
                <input
                  type="text"
                  required
                  value={cracha}
                  onChange={(e) => setCracha(e.target.value)}
                  placeholder="Ex: Crachá Nº 12"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAcesso(false)}
                  className="bg-slate-100 text-slate-700 font-bold px-4 py-3 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl text-xs uppercase shadow-md cursor-pointer"
                >
                  {loading ? 'Registrando...' : 'Confirmar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDITORIA E VISUALIZAÇÃO AMPLIADA DO DOCUMENTO DIGITAL */}
      {modalVisualizarDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button 
              onClick={() => setModalVisualizarDoc(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-base text-white">Documento Digital do Prestador</h3>
                <p className="text-xs text-slate-400">{modalVisualizarDoc.nome_profissional} - {modalVisualizarDoc.documento}</p>
              </div>
            </div>

            <div className="space-y-3">
              {modalVisualizarDoc.foto_documento ? (
                <div className="rounded-2xl overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center">
                  <img src={modalVisualizarDoc.foto_documento} alt="Foto do Documento" className="w-full h-full object-contain" />
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-6">Foto do documento não cadastrada.</p>
              )}

              {modalVisualizarDoc.foto_rosto && (
                <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div className="w-14 h-16 rounded-xl overflow-hidden border border-emerald-400 flex-shrink-0">
                    <img src={modalVisualizarDoc.foto_rosto} alt="Rosto" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-400">Face do Prestador</span>
                    <h4 className="font-bold text-sm text-white">{modalVisualizarDoc.nome_profissional}</h4>
                    <p className="text-xs text-slate-400">{modalVisualizarDoc.empresa || 'Autônomo'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalVisualizarDoc(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPONENTE DEDICADO DO LEITOR DE DOCUMENTOS OCR */}
      <ModalLeitorDocumentoOCR
        aberto={modalOcrAberto}
        onFechar={() => setModalOcrAberto(false)}
        onDadosConfirmados={handleOcrConfirmado}
      />
    </div>
  );
}
