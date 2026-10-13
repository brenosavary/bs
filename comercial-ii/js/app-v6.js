// ============================================================================
// PAINEL COMERCIAL II - JavaScript Puro
// ============================================================================

Highcharts.setOptions({
    lang: {
        months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
        shortMonths: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        weekdays: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
        loading: 'Carregando...',
        contextButtonTitle: 'Menu de contexto de exportação',
        printChart: 'Imprimir gráfico',
        downloadJPEG: 'Baixar imagem JPEG',
        downloadPDF: 'Baixar documento PDF',
        downloadPNG: 'Baixar imagem PNG',
        downloadSVG: 'Baixar imagem vetorial SVG',
        downloadCSV: 'Baixar CSV',
        downloadXLS: 'Baixar XLS',
        viewData: 'Ver tabela de dados',
        viewFullscreen: 'Ver em tela cheia',
        resetZoom: 'Redefinir zoom',
        resetZoomTitle: 'Redefinir zoom para o nível 1:1',
        decimalPoint: ',',
        numericSymbols: [' mil', ' milhões'],
        thousandsSep: '.',
        accessibility: {
            defaultTooltip: 'Vá para o gráfico {series.name}',
            chartContainerLabel: 'Gráfico interativo',
            chartHeading: 'Gráfico mostrando dados',
            screenReaderSection: {
                beforeRegionLabel: 'Informações do gráfico',
                afterRegionLabel: 'Fim do gráfico interativo'
            }
        }
    }
});

const USAR_DADOS_LOCAIS_TESTE = false;
const ARQUIVO_DADOS_LOCAIS_TESTE = 'teste_dados\\DASHBOARD_COMERCIAL_II_dados.json';
const ARQUIVO_METAS_LOCAIS_TESTE = 'teste_dados\\DASHBOARD_COMERCIAL_II_metas.json';
const ARQUIVO_CONFIG_LOCAL_TESTE = 'teste_dados\\DASHBOARD_COMERCIAL_II_config.json';
const feriadosPorMes = new Map();

// Estado Global
const state = {
    vendas: [],
    metas: [],
    feriadosConfiguracao: [],
    configuracao: {
        GROQ_KEY: '',
        POR_EMPRESA: 'S',
        POR_CIDADE: 'S',
        POR_ROTA: 'S',
        POR_ESTADO: 'S',
        POR_VENDEDOR: 'S',
        POR_GRUPO: 'S',
        POR_MARCA: 'S',
        POR_REGIAO: 'S',
        POR_TIPO_PAGAMENTO: 'S',
        POR_TIPO_DOCUMENTO: 'S',
        POR_STATUS_DOCUMENTO: 'S',
        DATA_INI: '2024-01-01 00:00:00.0',
        DATA_FIN: '2025-12-31 00:00:00.0',
        PED_OU_NF: 'P',
        PED_OU_PED_E_OS: 'PP',
        CONSIDERA_SABADO: 'N'
    },
    filtros: {
        dataInicio: '2024-01-01',
        dataFim: '2025-12-31',
        empresa: [],
        marca: [],
        vendedor: [],
        grupo: [],
        cliente: [],
        regiao: [],
        cidade: [],
        rota: [],
        estado: [],
        tipo_pagamento: [],
        prazo_pagamento: [],
        tipo_documento: [],
        status_documento: []
    },
    filtrosColuna: {
        data: '',
        empresa: '',
        marca: '',
        vendedor: '',
        grupo: '',
        cliente: '',
        regiao: '',
        cidade: '',
        rota: '',
        estado: '',
        tipo_pagamento: '',
        prazo_pagamento: '',
        tipo_documento: '',
        status_documento: ''
    },
    agrupamentos: {
        periodo: 'mes',
        tipoGrafico: 'barras',
        visualizacao: 'totalizado'
    },
    interface: {
        graficoMetasVisivel: false
    },
    opcoes: {
        empresas: [],
        marcas: [],
        vendedores: [],
        grupos: [],
        clientes: [],
        regioes: [],
        cidades: [],
        rotas: [],
        estados: [],
        tipos_pagamento: [],
        prazos_pagamento: [],
        tipos_documento: [],
        status_documento: []
    },
    modalCliente: {
        valorMinimo: 0,
        cliente: null,
        dimensao: null,
        origem: null
    },
    detalhesMetas: {
        faturamento: 0,
        total: 0,
        percentualAlcancado: 0,
        analiseDiaria: null
    },
    numPedidos: 0
};

// ============================================================================
// DATAS (evita bug de timezone com "YYYY-MM-DD")
// ============================================================================

function extrairDataISO(valor) {
    if (!valor) return null;
    const texto = String(valor).trim();
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return br ? `${br[3]}-${br[2]}-${br[1]}` : null;
}

function parseDataLocal(valor, { endOfDay = false } = {}) {
    const iso = extrairDataISO(valor);
    if (!iso) return null;
    const [ano, mes, dia] = iso.split('-').map(Number);
    return endOfDay
        ? new Date(ano, mes - 1, dia, 23, 59, 59, 999)
        : new Date(ano, mes - 1, dia, 0, 0, 0, 0);
}

function formatarDataPtBR(valor) {
    const data = parseDataLocal(valor);
    return data ? data.toLocaleDateString('pt-BR') : '';
}

const NOMES_DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
function obterNomeDiaSemana(diaSemana) {
    return NOMES_DIAS_SEMANA[diaSemana] || '';
}

function extrairMesISO(valor) {
    const iso = extrairDataISO(valor);
    return iso ? iso.slice(0, 7) : '';
}

function ultimoDiaDoMesISO(ano, mes) {
    return String(new Date(ano, mes, 0).getDate()).padStart(2, '0');
}

function normalizarDataInicioFiltro(valor) {
    if (!valor) return '';
    const texto = String(valor).trim();
    if (/^\d{4}-\d{2}$/.test(texto)) {
        return `${texto}-01`;
    }
    return extrairDataISO(texto) || '';
}

function normalizarDataFimFiltro(valor) {
    if (!valor) return '';
    const texto = String(valor).trim();
    if (/^\d{4}-\d{2}$/.test(texto)) {
        const [ano, mes] = texto.split('-').map(Number);
        return `${texto}-${ultimoDiaDoMesISO(ano, mes)}`;
    }
    return extrairDataISO(texto) || '';
}

function parseNumero(valor) {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
    if (valor === null || valor === undefined) return 0;

    const texto = String(valor).trim();
    if (!texto) return 0;

    const normalizado = texto.includes(',')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto;

    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    inicializarEventos();
});

// ============================================================================
// CARREGAMENTO DE DADOS
// ============================================================================

function obterContextoAPI() {
    const path = window.location.pathname;
    const primeiro = path.split('/').filter(Boolean)[0];
    const systemID = typeof ebfGetSystemID === 'function' ? ebfGetSystemID() : 'REI';
    return { primeiro, systemID };
}

async function buscarVendasDaAPI(primeiro, systemID, dataInicio, dataFim) {
    const url = USAR_DADOS_LOCAIS_TESTE
        ? new URL(ARQUIVO_DADOS_LOCAIS_TESTE, window.location.href).href
        : window.location.origin + '/' + primeiro + '/DASHBOARD_COMERCIAL_II_dados.rule?sys=' + systemID +
            '&dataIni=' + normalizarDataInicioFiltro(dataInicio) + '&dataFin=' + normalizarDataFimFiltro(dataFim);

    const response = await fetch(url);

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('iso-8859-1');
    const text = decoder.decode(buffer);
    const data = JSON.parse(text);

    if (data && data.error) {
        console.warn("API Error:", data.error);
        alert("Erro: " + data.error);
        return [];
    }

    const vendasRaw = Array.isArray(data.vendas) ? data.vendas : (Array.isArray(data) ? data : []);
    return vendasRaw.map(v => ({
        ...v,
        empresa: String(v.empresa || ''),
        marca: String(v.marca || ''),
        vendedor: String(v.vendedor || ''),
        grupo: String(v.grupo || ''),
        cliente: String(v.cliente || ''),
        regiao: String(v.regiao || ''),
        cidade: String(v.cidade || ''),
        rota: String(v.rota || ''),
        estado: String(v.estado || ''),
        tipo_pagamento: String(v.tipo_pagamento || ''),
        prazo_pagamento: String(v.prazo_pagamento || ''),
        tipo_documento: String(v.tipo_documento || ''),
        status_documento: String(v.status_documento || ''),
        valor: parseNumero(v.valor),
        devolucao: parseNumero(v.devolucao),
        quantidade: parseNumero(v.quantidade),
        valor_produto: parseNumero(v.valor_produto),
        valor_servico: parseNumero(v.valor_servico),
        custo: parseNumero(v.custo)
    }));
}

async function buscarMetasDaAPI(primeiro, systemID) {
    try {
        const url = USAR_DADOS_LOCAIS_TESTE
            ? new URL(ARQUIVO_METAS_LOCAIS_TESTE, window.location.href).href
            : window.location.origin + '/' + primeiro + '/DASHBOARD_COMERCIAL_II_metas.rule?sys=' + systemID;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro ao carregar metas: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const data = JSON.parse(new TextDecoder('iso-8859-1').decode(buffer));
        const metasRaw = Array.isArray(data.metas) ? data.metas : (Array.isArray(data) ? data : []);

        return metasRaw.map(meta => ({
            empresa: String(meta.empresa || ''),
            ano: Number(meta.ano),
            mes: Number(meta.mes),
            valor: parseNumero(meta.valor)
        }));
    } catch (err) {
        console.error('Erro ao carregar metas:', err);
        return [];
    }
}

function atualizarOpcoesDeFiltros() {
    state.opcoes.empresas = [...new Set(state.vendas.map(v => v.empresa))].sort();
    state.opcoes.marcas = [...new Set(state.vendas.map(v => v.marca))].sort();
    state.opcoes.vendedores = [...new Set(state.vendas.map(v => v.vendedor))].sort();
    state.opcoes.grupos = [...new Set(state.vendas.map(v => v.grupo))].sort();
    state.opcoes.clientes = [...new Set(state.vendas.map(v => v.cliente))].sort();
    state.opcoes.regioes = [...new Set(state.vendas.map(v => v.regiao))].sort();
    state.opcoes.cidades = [...new Set(state.vendas.map(v => v.cidade))].sort();
    state.opcoes.rotas = [...new Set(state.vendas.map(v => v.rota))].sort();
    state.opcoes.estados = [...new Set(state.vendas.map(v => v.estado))].sort();
    state.opcoes.tipos_pagamento = [...new Set(state.vendas.map(v => v.tipo_pagamento))].sort();
    state.opcoes.prazos_pagamento = [...new Set(state.vendas.map(v => v.prazo_pagamento))].sort();
    state.opcoes.tipos_documento = [...new Set(state.vendas.map(v => v.tipo_documento))].sort();
    state.opcoes.status_documento = [...new Set(state.vendas.map(v => v.status_documento))].sort();
}

async function carregarDados() {
    mostrarSpinner();
    try {
        const { primeiro, systemID } = obterContextoAPI();
        
        // Buscar configurações primeiro
        await carregarConfiguracao(primeiro, systemID);
        
        // Atualizar datas dos filtros com base na configuração (usar datas completas ISO)
        if (state.configuracao.DATA_INI) {
            state.filtros.dataInicio = normalizarDataInicioFiltro(state.configuracao.DATA_INI);
            document.getElementById('dataInicio').value = state.filtros.dataInicio;
        }
        if (state.configuracao.DATA_FIN) {
            state.filtros.dataFim = normalizarDataFimFiltro(state.configuracao.DATA_FIN);
            document.getElementById('dataFim').value = state.filtros.dataFim;
        }
        
        state.vendas = await buscarVendasDaAPI(primeiro, systemID, state.filtros.dataInicio, state.filtros.dataFim);
        state.metas = await buscarMetasDaAPI(primeiro, systemID);

        if (USAR_DADOS_LOCAIS_TESTE) {
            const datas = state.vendas.map(v => extrairDataISO(v.data)).filter(Boolean).sort();
            if (datas.length > 0) {
                state.filtros.dataInicio = datas[0];
                state.filtros.dataFim = datas[datas.length - 1];
                document.getElementById('dataInicio').value = state.filtros.dataInicio;
                document.getElementById('dataFim').value = state.filtros.dataFim;
            }
        }

        // (dados jÃ¡ carregados por buscarVendasDaAPI)

        // 2. Decodificamos explicitamente para UTF-8 (ou 'iso-8859-1' se o erro persistir)
        // (decodificaÃ§Ã£o feita em buscarVendasDaAPI)

        // 3. Transformamos a string corrigida em JSON
        // (parse feito em buscarVendasDaAPI)

        // (normalização feita em buscarVendasDaAPI)

        // Extrai opções únicas
        atualizarOpcoesDeFiltros();

        // Popula selects
        populaSelects();
        
        // Aplicar visibilidade dos gráficos baseado na configuração
        aplicarVisibilidadeGraficos();

        // Renderiza painel
        await atualizarPainel();
    } catch (err) {
        console.error('Erro ao carregar dados:', err);
    } finally {
        ocultarSpinner();
    }
}

async function recarregarVendasDaAPI() {
    const { primeiro, systemID } = obterContextoAPI();
    state.vendas = await buscarVendasDaAPI(primeiro, systemID, state.filtros.dataInicio, state.filtros.dataFim);
    atualizarOpcoesDeFiltros();
    populaSelects();
}

function popularCheckbox(id, opcoes) {
    const container = document.getElementById(id);
    if (container) {
        const dimRaw = id.replace('filtro', '').toLowerCase();
        const mapaChaves = {
            tipopagamento: 'tipo_pagamento',
            prazopagamento: 'prazo_pagamento',
            tipodocumento: 'tipo_documento',
            statusdocumento: 'status_documento'
        };
        const dim = mapaChaves[dimRaw] || dimRaw;
        const selecionados = Array.isArray(state.filtros[dim]) ? state.filtros[dim] : [];

        container.innerHTML = opcoes.map(op => `
            <label class="chk-item">
                <input type="checkbox" value="${op}" ${selecionados.includes(op) ? 'checked' : ''}>
                <span>${op}</span>
            </label>
        `).join('');

        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                const checked = Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value);
                state.filtros[dim] = checked;
            });
        });

        adicionarBotaoLimparFiltro(container, dim);
    }
}

function adicionarBotaoLimparFiltro(container, dimensao) {
    const grupo = container.closest('.filtro-grupo');
    const label = grupo?.querySelector('label');
    if (!label || label.querySelector('.btn-limpar-filtro')) return;
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn-limpar-filtro';
    botao.textContent = 'Limpar';
    botao.title = `Limpar filtro de ${label.textContent.trim()}`;
    botao.addEventListener('click', () => {
        state.filtros[dimensao] = [];
        container.querySelectorAll('input:checked').forEach(input => { input.checked = false; });
    });
    label.appendChild(botao);
}

function populaSelects() {
    popularCheckbox('filtroEmpresa', state.opcoes.empresas);
    popularCheckbox('filtroMarca', state.opcoes.marcas);
    popularCheckbox('filtroVendedor', state.opcoes.vendedores);
    popularCheckbox('filtroGrupo', state.opcoes.grupos);
    popularCheckbox('filtroCliente', state.opcoes.clientes);
    popularCheckbox('filtroRegiao', state.opcoes.regioes);
    popularCheckbox('filtroCidade', state.opcoes.cidades);
    popularCheckbox('filtroRota', state.opcoes.rotas);
    popularCheckbox('filtroEstado', state.opcoes.estados);
    popularCheckbox('filtroTipoPagamento', state.opcoes.tipos_pagamento);
    popularCheckbox('filtroPrazoPagamento', state.opcoes.prazos_pagamento);
    popularCheckbox('filtroTipoDocumento', state.opcoes.tipos_documento);
    popularCheckbox('filtroStatusDocumento', state.opcoes.status_documento);
}
// ============================================================================
// CARREGAMENTO DE CONFIGURAÇÃO
// ============================================================================

async function carregarConfiguracao(primeiro, systemID) {
    try {
        const url = USAR_DADOS_LOCAIS_TESTE
            ? new URL(ARQUIVO_CONFIG_LOCAL_TESTE, window.location.href).href
            : window.location.origin + '/' + primeiro + '/DASHBOARD_COMERCIAL_II_config.rule?sys=' + systemID;
        const response = await fetch(url);
        
        // Usar o mesmo padrão de decodificação que os dados
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('iso-8859-1');
        const text = decoder.decode(buffer);
        const data = JSON.parse(text);
        
        if (data) {
            if (data.config && Array.isArray(data.config) && data.config.length > 0) {
                const configObj = data.config[0];
                // Mesclar configurações recebidas com o estado inicial
                state.configuracao = { ...state.configuracao, ...configObj };
            }

            // Buscar GROQ_KEY do CONFIG (pode estar na raiz do objeto ou dentro de config[0])
            const groqKey = data.GROQ_KEY || (data.config && data.config[0]?.GROQ_KEY);
            if (groqKey) {
                state.configuracao.GROQ_KEY = groqKey;
            }

            state.feriadosConfiguracao = Array.isArray(data.feriado) ? data.feriado : [];
            
            // Definir visualização inicial baseada em PED_OU_PED_E_OS
            if (state.configuracao.PED_OU_PED_E_OS === 'PP') {
                state.agrupamentos.visualizacao = 'totalizado';
            } else if (state.configuracao.PED_OU_PED_E_OS === 'PO') {
                state.agrupamentos.visualizacao = 'separado';
            }
            
            // Atualizar o select no DOM
            const selectVisualizacao = document.getElementById('visualizacaoGrafico');
            if (selectVisualizacao) {
                selectVisualizacao.value = state.agrupamentos.visualizacao;
            }
            
            console.log("Configurações carregadas:", state.configuracao);
            await cadastrarFeriadosAusentes(primeiro, systemID);
        }
    } catch (err) {
        console.error('Erro ao carregar configurações:', err);
    }
}

// ============================================================================
// VISIBILIDADE DE GRÁFICOS
// ============================================================================

function aplicarVisibilidadeGraficos() {

    const visualizacao = document.getElementById('visualizacaoGrafico');
    if (visualizacao) {
        const semServico = state.configuracao.PED_OU_PED_E_OS === 'PP';
        visualizacao.style.display = semServico ? 'none' : '';
        visualizacao.closest('.control-grupo').style.display = semServico ? 'none' : '';
    }

    // Mapeamento de chaves de configuração para IDs de gráficos
    const mapeamentoGraficos = {
        'POR_EMPRESA': 'chart-empresa',
        'POR_MARCA': 'chart-marca',
        'POR_VENDEDOR': 'chart-vendedor',
        'POR_GRUPO': 'chart-grupo',
        'POR_REGIAO': 'chart-regiao',
        'POR_CIDADE': 'chart-cidade',
        'POR_ROTA': 'chart-rota',
        'POR_ESTADO': 'chart-estado',
        'POR_TIPO_PAGAMENTO': 'chart-tipo-pagamento',
        'POR_TIPO_DOCUMENTO': 'chart-tipo-documento',
        'POR_STATUS_DOCUMENTO': 'chart-status-documento'
    };
    
    // Iterar sobre cada configuração de gráfico
    Object.entries(mapeamentoGraficos).forEach(([chaveConfig, idGrafico]) => {
        const elemento = document.getElementById(idGrafico);
        if (elemento) {
            const chartWrapper = elemento.closest('.chart-wrapper');
            if (chartWrapper) {
                // Se a configuração for 'S' (sim), mostrar; caso contrário, ocultar
                if (state.configuracao[chaveConfig] === 'S') {
                    chartWrapper.style.display = 'block';
                    console.log(`Gráfico ${idGrafico} habilitado`);
                } else {
                    chartWrapper.style.display = 'none';
                    console.log(`Gráfico ${idGrafico} desabilitado`);
                }
            }
        }
    });
}


// ============================================================================
// EVENTOS
// ============================================================================

function inicializarEventos() {
    // Filtros
    document.getElementById('dataInicio').addEventListener('change', (e) => {
        state.filtros.dataInicio = normalizarDataInicioFiltro(e.target.value);
    });

    document.getElementById('dataFim').addEventListener('change', (e) => {
        state.filtros.dataFim = normalizarDataFimFiltro(e.target.value);
    });

    // Filtros por Coluna
    document.querySelectorAll('.col-filter').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const col = e.target.dataset.col;
                state.filtrosColuna[col] = e.target.value.toLowerCase();
                renderizarTabelaComSpinner();
            }
        });
        input.addEventListener('blur', (e) => {
            const col = e.target.dataset.col;
            state.filtrosColuna[col] = e.target.value.toLowerCase();
        });
    });

    // Botão para atualizar filtros da tabela analítica
    document.getElementById('btnAtualizarAnalitico')?.addEventListener('click', () => {
        document.querySelectorAll('.col-filter').forEach(input => {
            const col = input.dataset.col;
            state.filtrosColuna[col] = input.value.toLowerCase();
        });
        renderizarTabelaComSpinner();
    });

    // Agrupamentos
    document.getElementById('visualizacaoGrafico').addEventListener('change', (e) => {
        state.agrupamentos.visualizacao = e.target.value;
        atualizarPainelComSpinner();
    });

    document.getElementById('agrupamentoPeriodo').addEventListener('change', (e) => {
        state.agrupamentos.periodo = e.target.value;
        atualizarPainelComSpinner();
    });

    document.getElementById('tipoGrafico').addEventListener('change', (e) => {
        state.agrupamentos.tipoGrafico = e.target.value;
        atualizarPainelComSpinner();
    });

    // Botão Atualizar Filtros
    document.getElementById('btnAplicarFiltros').addEventListener('click', async () => {
        mostrarSpinner();
        try {
            await recarregarVendasDaAPI();
            await atualizarPainel();
        } finally {
            ocultarSpinner();
        }
        const drawer = document.getElementById('drawerFiltros');
        if (drawer) {
            drawer.classList.remove('ativo');
            document.body.style.overflow = 'auto';
        }
    });

    // Botão Analítico
    document.getElementById('btnVerAnalitico').addEventListener('click', () => {
        abrirModalAnalitico();
    });

    document.getElementById('btnVerAnaliticoCliente').addEventListener('click', () => {
        abrirModalAnalitico(state.modalCliente.cliente, state.modalCliente.dimensao, state.modalCliente.origem);
    });

    // Fechar Modais
    document.getElementById('btnFecharModalCliente').addEventListener('click', fecharModalCliente);
    document.getElementById('btnFecharModalAnalitico').addEventListener('click', fecharModalAnalitico);
    document.getElementById('btnFecharModalProjecao').addEventListener('click', fecharModalProjecao);

    // Detalhes Projeção
    document.getElementById('btnDetalheProjecao').addEventListener('click', abrirModalProjecao);
    document.getElementById('btnAlternarGraficoMeta').addEventListener('click', alternarGraficoMetas);

    // Exportar
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
    
    // Filtro de valor mínimo no modal
    document.getElementById('btnAplicarFiltroModal')?.addEventListener('click', async () => {
        state.modalCliente.valorMinimo = Number(document.getElementById('filtroValorMinimoCliente').value) || 0;
        await atualizarGraficosModalComSpinner();
    });

    // Adicionado: Abrir/Fechar Filtros
    // Controle do Drawer de Filtros (Funções globais para evitar conflitos)
    window.abrirFiltros = function() {
        const drawer = document.getElementById('drawerFiltros');
        if (drawer) {
            drawer.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    };

    window.fecharFiltros = function() {
        const drawer = document.getElementById('drawerFiltros');
        if (drawer) {
            drawer.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };

    // Busca nos filtros
    document.querySelectorAll('.filtro-busca').forEach(input => {
        input.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const targetId = e.target.dataset.target;
            const container = document.getElementById(targetId);
            if (container) {
                const itens = container.querySelectorAll('.chk-item');
                itens.forEach(item => {
                    const texto = item.textContent.toLowerCase();
                    item.style.display = texto.includes(termo) ? 'flex' : 'none';
                });
            }
        });
    });
}

// ============================================================================
// FILTRAGEM DE DADOS
// ============================================================================

function filtrarVendas(incluirFiltrosColuna = false, filtrosExtras = []) {
    const extras = Array.isArray(filtrosExtras)
        ? filtrosExtras.filter(filtro => filtro?.valor && filtro?.dimensao)
        : [];
    return state.vendas.filter(venda => {
        const dataVenda = parseDataLocal(venda.data);
        const dataInicio = parseDataLocal(state.filtros.dataInicio);
        const dataFim = parseDataLocal(state.filtros.dataFim, { endOfDay: true });

        const dentroData = (!dataInicio || (dataVenda && dataVenda >= dataInicio)) &&
            (!dataFim || (dataVenda && dataVenda <= dataFim));
        const empresaOk = state.filtros.empresa.length === 0 || state.filtros.empresa.includes(venda.empresa);
        const marcaOk = state.filtros.marca.length === 0 || state.filtros.marca.includes(venda.marca);
        const vendedorOk = state.filtros.vendedor.length === 0 || state.filtros.vendedor.includes(venda.vendedor);
        const grupoOk = state.filtros.grupo.length === 0 || state.filtros.grupo.includes(venda.grupo);
        const clienteOk = state.filtros.cliente.length === 0 || state.filtros.cliente.includes(venda.cliente);
        const regiaoOk = state.filtros.regiao.length === 0 || state.filtros.regiao.includes(venda.regiao);
        const cidadeOk = state.filtros.cidade.length === 0 || state.filtros.cidade.includes(venda.cidade);
        const rotaOk = state.filtros.rota.length === 0 || state.filtros.rota.includes(venda.rota);
        const estadoOk = state.filtros.estado.length === 0 || state.filtros.estado.includes(venda.estado);
        const tipoPagamentoOk = state.filtros.tipo_pagamento.length === 0 || state.filtros.tipo_pagamento.includes(venda.tipo_pagamento);
        const prazoPagamentoOk = state.filtros.prazo_pagamento.length === 0 || state.filtros.prazo_pagamento.includes(venda.prazo_pagamento);
        const tipoDocumentoOk = state.filtros.tipo_documento.length === 0 || state.filtros.tipo_documento.includes(venda.tipo_documento);
        const statusDocumentoOk = state.filtros.status_documento.length === 0 || state.filtros.status_documento.includes(venda.status_documento);

        const extraOk = extras.every(filtro => venda[filtro.dimensao] === filtro.valor);

        let colunaOk = true;
        if (incluirFiltrosColuna) {
            const dataStr = formatarDataPtBR(venda.data);
            colunaOk = dataStr.toLowerCase().includes(state.filtrosColuna.data) &&
                venda.empresa.toLowerCase().includes(state.filtrosColuna.empresa) &&
                venda.marca.toLowerCase().includes(state.filtrosColuna.marca) &&
                venda.vendedor.toLowerCase().includes(state.filtrosColuna.vendedor) &&
                venda.grupo.toLowerCase().includes(state.filtrosColuna.grupo) &&
                venda.cliente.toLowerCase().includes(state.filtrosColuna.cliente) &&
                venda.regiao.toLowerCase().includes(state.filtrosColuna.regiao) &&
                venda.cidade.toLowerCase().includes(state.filtrosColuna.cidade) &&
                venda.rota.toLowerCase().includes(state.filtrosColuna.rota) &&
                venda.estado.toLowerCase().includes(state.filtrosColuna.estado) &&
                venda.tipo_pagamento.toLowerCase().includes(state.filtrosColuna.tipo_pagamento) &&
                venda.prazo_pagamento.toLowerCase().includes(state.filtrosColuna.prazo_pagamento) &&
                venda.tipo_documento.toLowerCase().includes(state.filtrosColuna.tipo_documento) &&
                venda.status_documento.toLowerCase().includes(state.filtrosColuna.status_documento);
        }

        return dentroData && empresaOk && marcaOk && vendedorOk && grupoOk && clienteOk &&
            regiaoOk && cidadeOk && rotaOk && estadoOk && tipoPagamentoOk && prazoPagamentoOk && tipoDocumentoOk && statusDocumentoOk &&
            extraOk && colunaOk;
    });
}

// ============================================================================
// CÁLCULO DE KPIs E PROJEÇÃO
// ============================================================================

async function buscarNumPedidos() {
    if (USAR_DADOS_LOCAIS_TESTE) {
        state.numPedidos = filtrarVendas().length;
        return;
    }

    const formatarMultifiltro = (arr) => {
        if (!arr || arr.length === 0) return '';
        return arr.join('|');
    };

    const params = new URLSearchParams({
        sys: typeof ebfGetSystemID === 'function' ? ebfGetSystemID() : 'REI',
        empresas: formatarMultifiltro(state.filtros.empresa),
        vendedores: formatarMultifiltro(state.filtros.vendedor),
        marcas: formatarMultifiltro(state.filtros.marca),
        grupos: formatarMultifiltro(state.filtros.grupo),
        clientes: formatarMultifiltro(state.filtros.cliente),
        regioes: formatarMultifiltro(state.filtros.regiao),
        cidades: formatarMultifiltro(state.filtros.cidade),
        rotas: formatarMultifiltro(state.filtros.rota),
        estados: formatarMultifiltro(state.filtros.estado),
        tipos_pagamento: formatarMultifiltro(state.filtros.tipo_pagamento),
        prazos_pagamento: formatarMultifiltro(state.filtros.prazo_pagamento),
        tipos_documento: formatarMultifiltro(state.filtros.tipo_documento),
        status_documento: formatarMultifiltro(state.filtros.status_documento),
        dataIni: normalizarDataInicioFiltro(state.filtros.dataInicio),
        dataFin: normalizarDataFimFiltro(state.filtros.dataFim)
    });

    try {
        const path = window.location.pathname;
        const primeiro = path.split('/').filter(Boolean)[0];
        const url = window.location.origin + '/' + primeiro + '/DASHBOARD_COMERCIAL_II_dados_num_pedidos.rule?' + params.toString();
        const response = await fetch(url);
        const data = await response.json();
        state.numPedidos = data.numPedidos || 0;
    } catch (err) {
        console.error('Erro ao buscar numPedidos:', err);
        state.numPedidos = 0;
    }
}

function calcularKPIs(vendas) {
    const faturamento = vendas.reduce((sum, v) => {
        const totalLinha = v.valor_produto + v.valor_servico;
        return sum + totalLinha;
    }, 0);
    const devolucao = vendas.reduce((sum, v) => sum + v.devolucao, 0);
    const custo = vendas.reduce((sum, v) => sum + v.custo, 0);
    const quantidade = vendas.reduce((sum, v) => sum + v.quantidade, 0);

    const rentabilidade = faturamento > 0 ? ((faturamento - custo) / faturamento) * 100 : 0;

    // Novo cálculo do ticket médio baseado no numPedidos da API
    const ticketMedio = state.numPedidos > 0 ? faturamento / state.numPedidos : 0;

    const totalMetas = calcularTotalMetas();
    const percentualAlcancado = totalMetas > 0 ? (faturamento / totalMetas) * 100 : 0;
    state.detalhesMetas = { faturamento, total: totalMetas, percentualAlcancado };

    return { faturamento, ticketMedio, totalMetas, percentualAlcancado, devolucao, custo, rentabilidade };
}

function calcularTotalMetas() {
    const empresasSelecionadas = state.filtros.empresa;
    const inicio = parseDataLocal(state.filtros.dataInicio);
    const fim = parseDataLocal(state.filtros.dataFim);
    const periodoInicial = inicio ? inicio.getFullYear() * 12 + inicio.getMonth() : -Infinity;
    const periodoFinal = fim ? fim.getFullYear() * 12 + fim.getMonth() : Infinity;

    return state.metas
        .filter(meta => {
            const periodoMeta = meta.ano * 12 + (meta.mes - 1);
            const empresaOk = empresasSelecionadas.length === 0 || empresasSelecionadas.includes(meta.empresa);
            return empresaOk && periodoMeta >= periodoInicial && periodoMeta <= periodoFinal;
        })
        .reduce((total, meta) => total + meta.valor, 0);
}

function feriadoEstaCadastrado(feriado) {
    const status = String(feriado?.cadastrada ?? '').trim().toUpperCase();
    return status === 'S';
}

function formatarDataDigitada(valor, anoPadrao, mesPadrao) {
    if (!valor) return null;
    const str = String(valor).trim();
    const isoDireto = extrairDataISO(str);
    if (isoDireto) return isoDireto;

    // Se digitou apenas o dia, ex: "15"
    if (/^\d{1,2}$/.test(str)) {
        const dia = String(str).padStart(2, '0');
        const mes = String(mesPadrao).padStart(2, '0');
        return `${anoPadrao}-${mes}-${dia}`;
    }
    // Se digitou dia/mes, ex: "15/10"
    const diaMes = str.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (diaMes) {
        const dia = String(diaMes[1]).padStart(2, '0');
        const mes = String(diaMes[2]).padStart(2, '0');
        return `${anoPadrao}-${mes}-${dia}`;
    }
    return null;
}

function solicitarFeriadosModal(grupo, ano, mes) {
    return new Promise((resolve) => {
        // Remover modal anterior caso ainda exista
        const modalAnterior = document.getElementById('modalPerguntaFeriados');
        if (modalAnterior) modalAnterior.remove();

        const feriadosAdicionados = [];
        const mesFormatado = String(mes).padStart(2, '0');
        const dataPadrao = `${ano}-${mesFormatado}-01`;

        const modal = document.createElement('div');
        modal.id = 'modalPerguntaFeriados';
        modal.className = 'modal ativo modal-feriado';
        modal.style.display = 'flex';
        modal.style.zIndex = '10001';

        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content modal-small" style="max-width: 480px; width: 92%; height: auto; max-height: 88vh;">
                <div class="modal-header">
                    <h3 style="margin: 0; font-size: 1rem; color: var(--text-primary);">Cadastro de Feriados</h3>
                    <button type="button" class="btn-fechar-modal" id="btnFecharModalFeriado">&times;</button>
                </div>
                <div class="modal-body" style="padding: 1.25rem;">
                    <p style="margin: 0 0 1rem; font-size: 0.95rem; line-height: 1.4; color: var(--text-primary);">
                        Tem feriado no mês atual (<strong>${mesFormatado}/${ano}</strong>) na cidade <strong>${grupo.cidade} (${grupo.uf})</strong>?
                    </p>

                    <!-- Etapa 1: Pergunta Inicial -->
                    <div id="etapaPerguntaFeriado" style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem;">
                        <button type="button" id="btnNaoFeriado" class="btn-analitico" style="background-color: #6B7280; padding: 0.45rem 1.4rem; font-size: 0.85rem;">Não</button>
                        <button type="button" id="btnSimFeriado" class="btn-aplicar" style="width: auto; padding: 0.45rem 1.4rem; font-size: 0.85rem;">Sim</button>
                    </div>

                    <!-- Etapa 2: Formulário de Adição de Feriados -->
                    <div id="etapaFormularioFeriados" style="display: none; margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Data do Feriado:</label>
                                <input type="date" id="inputModalDataFeriado" value="${dataPadrao}" style="width: 100%; box-sizing: border-box; padding: 0.4rem; border: 1px solid var(--border); border-radius: var(--radius); font-size: 0.85rem; background: var(--surface); color: var(--text-primary);">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Descrição do Feriado:</label>
                                <input type="text" id="inputModalDescricaoFeriado" placeholder="Ex: Padroeira, Aniversário da Cidade..." style="width: 100%; box-sizing: border-box; padding: 0.4rem; border: 1px solid var(--border); border-radius: var(--radius); font-size: 0.85rem; background: var(--surface); color: var(--text-primary);">
                            </div>
                            <div style="display: flex; justify-content: flex-start; align-items: center; margin-top: 0.25rem;">
                                <button type="button" id="btnAdicionarOutroFeriado" class="btn-analitico" style="background-color: var(--primary-color); padding: 0.35rem 0.75rem; font-size: 0.75rem;">+ Adicionar à Lista</button>
                            </div>
                        </div>

                        <!-- Lista de Feriados Adicionados -->
                        <div id="listaModalFeriadosAdicionados" style="margin-top: 0.75rem; max-height: 140px; overflow-y: auto; font-size: 0.8rem;"></div>

                        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem; border-top: 1px solid var(--border); padding-top: 0.75rem;">
                            <button type="button" id="btnConfirmarSalvarFeriados" class="btn-aplicar" style="width: auto; padding: 0.45rem 1.25rem; font-size: 0.85rem; background-color: var(--success);">Salvar Feriados</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        const fechar = (resultado) => {
            modal.remove();
            document.body.style.overflow = 'auto';
            resolve(resultado);
        };

        // Fechar no "X" ou fora do modal (assume que não há feriados ou cancelou)
        modal.querySelector('#btnFecharModalFeriado').addEventListener('click', () => fechar([]));
        modal.querySelector('.modal-overlay').addEventListener('click', () => fechar([]));

        // Botão NÃO
        modal.querySelector('#btnNaoFeriado').addEventListener('click', () => {
            fechar([]);
        });

        // Botão SIM: revela o formulário
        const etapaPergunta = modal.querySelector('#etapaPerguntaFeriado');
        const etapaForm = modal.querySelector('#etapaFormularioFeriados');
        const inputData = modal.querySelector('#inputModalDataFeriado');
        const inputDesc = modal.querySelector('#inputModalDescricaoFeriado');
        const listaEl = modal.querySelector('#listaModalFeriadosAdicionados');

        modal.querySelector('#btnSimFeriado').addEventListener('click', () => {
            etapaPergunta.style.display = 'none';
            etapaForm.style.display = 'block';
            inputDesc.focus();
        });

        const renderizarLista = () => {
            if (feriadosAdicionados.length === 0) {
                listaEl.innerHTML = '<span style="color: var(--text-secondary); font-style: italic;">Nenhum feriado adicionado ainda.</span>';
                return;
            }
            listaEl.innerHTML = feriadosAdicionados.map((f, i) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.5rem; background: var(--surface); border-radius: 4px; margin-bottom: 0.25rem; border: 1px solid var(--border);">
                    <span><strong>${formatarDataPtBR(f.data)}</strong> — ${escaparHTML(f.descricao)}</span>
                    <button type="button" data-index="${i}" class="btn-remover-item-feriado" style="background: none; border: none; color: #EF4444; cursor: pointer; font-size: 1rem; line-height: 1;">&times;</button>
                </div>
            `).join('');

            listaEl.querySelectorAll('.btn-remover-item-feriado').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = Number(e.currentTarget.dataset.index);
                    feriadosAdicionados.splice(idx, 1);
                    renderizarLista();
                });
            });
        };

        const adicionarFeriadoAtual = () => {
            const dataVal = inputData.value ? extrairDataISO(inputData.value) : null;
            const descVal = inputDesc.value.trim() || 'Feriado Municipal';
            if (dataVal) {
                feriadosAdicionados.push({ data: dataVal, descricao: descVal });
                inputDesc.value = '';
                renderizarLista();
            }
        };

        modal.querySelector('#btnAdicionarOutroFeriado').addEventListener('click', adicionarFeriadoAtual);

        modal.querySelector('#btnConfirmarSalvarFeriados').addEventListener('click', () => {
            // Se o usuário preencheu descrição no input mas não clicou em "+ Adicionar", adiciona automaticamente
            if (inputDesc.value.trim()) {
                adicionarFeriadoAtual();
            }
            fechar(feriadosAdicionados);
        });
    });
}

async function cadastrarFeriadosAusentes(primeiro, systemID) {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;

    // Filtra empresas onde cadastrada = "N" (ou ainda não cadastrada como "S")
    const pendentes = state.feriadosConfiguracao.filter(feriado => {
        const cadastrada = String(feriado?.cadastrada ?? '').trim().toUpperCase();
        return cadastrada === 'N' || !feriadoEstaCadastrado(feriado);
    });

    if (pendentes.length === 0) return;

    // Agrupar empresas por Cidade-UF única para não repetir perguntas da mesma cidade
    const gruposCidadeUf = new Map();

    for (const item of pendentes) {
        const cidade = String(item.cidade || '').trim();
        const uf = String(item.uf || '').trim().toUpperCase();

        if (!cidade || !uf) {
            console.warn(`Empresa ${item.empresa} não possui Cidade ou UF preenchida.`);
            continue;
        }

        const chave = `${cidade.toLowerCase()}-${uf.toLowerCase()}`;
        if (!gruposCidadeUf.has(chave)) {
            gruposCidadeUf.set(chave, {
                cidade,
                uf,
                empresas: []
            });
        }
        gruposCidadeUf.get(chave).empresas.push(item);
    }

    // Iteração por Cidade-UF com Modal interativo
    for (const [chave, grupo] of gruposCidadeUf.entries()) {
        try {
            const feriados = await solicitarFeriadosModal(grupo, ano, mes);

            // Enviar os dados de cada empresa dessa cidade para o mesmo endpoint
            for (const empresaObj of grupo.empresas) {
                const params = new URLSearchParams({
                    sys: systemID,
                    acao: 'cadastrar_feriados',
                    empresa: empresaObj.empresa,
                    cidade: grupo.cidade,
                    uf: grupo.uf,
                    ano,
                    mes,
                    feriados: JSON.stringify(feriados)
                });

                const host = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file'))
                    ? window.location.origin
                    : 'http://localhost';
                const contexto = primeiro || 'REI';
                const url = `${host}/${contexto}/DASHBOARD_COMERCIAL_II_config.rule?${params.toString()}`;

                console.log(`%c[URL GET PRONTA PARA TESTE] Empresa: ${empresaObj.empresa} (${grupo.cidade}/${grupo.uf})`, 'color: #3B82F6; font-weight: bold;');
                console.log(url);
                console.log('Parâmetros decodificados:', {
                    sys: systemID,
                    acao: 'cadastrar_feriados',
                    empresa: empresaObj.empresa,
                    cidade: grupo.cidade,
                    uf: grupo.uf,
                    ano,
                    mes,
                    feriados: feriados
                });

                if (!USAR_DADOS_LOCAIS_TESTE) {
                    const response = await fetch(url);
                    if (!response.ok) {
                        console.error(`Erro ao cadastrar feriados da empresa ${empresaObj.empresa}:`, response.status);
                    }
                }

                empresaObj.cadastrada = 'S';
                empresaObj.feriados = feriados;
                console.log(`Feriados cadastrados com sucesso para empresa ${empresaObj.empresa} (${grupo.cidade}/${grupo.uf}):`, feriados);
            }
        } catch (err) {
            console.error(`Erro ao processar feriados para ${grupo.cidade} (${grupo.uf}):`, err);
        }
    }
}

async function buscarFeriados(ano, mes) {
    const empresas = [...state.filtros.empresa].sort();
    const chave = `${ano}-${String(mes).padStart(2, '0')}:${empresas.join('|') || 'todas'}`;
    if (feriadosPorMes.has(chave)) return feriadosPorMes.get(chave);

    try {
        const cadastros = state.feriadosConfiguracao.filter(feriado => empresas.length === 0 || empresas.includes(feriado.empresa));
        const feriadosSemDuplicidade = new Map();
        cadastros.flatMap(cadastro => {
            const lista = Array.isArray(cadastro.feriados) ? cadastro.feriados : [];
            return lista.map(feriado => ({
                data: extrairDataISO(feriado.data),
                descricao: String(feriado.descricao || 'Feriado'),
                empresa: cadastro.empresa || ''
            }));
        })
        .filter(feriado => feriado.data?.startsWith(`${ano}-${String(mes).padStart(2, '0')}`))
        .forEach(feriado => {
            const chaveFeriado = `${feriado.data}|${feriado.descricao}`;
            if (feriadosSemDuplicidade.has(chaveFeriado)) {
                const item = feriadosSemDuplicidade.get(chaveFeriado);
                if (feriado.empresa && !item.empresas.includes(feriado.empresa)) {
                    item.empresas.push(feriado.empresa);
                    item.empresa = item.empresas.join(', ');
                }
            } else {
                feriadosSemDuplicidade.set(chaveFeriado, {
                    data: feriado.data,
                    descricao: feriado.descricao,
                    empresa: feriado.empresa,
                    empresas: feriado.empresa ? [feriado.empresa] : []
                });
            }
        });
        const feriados = [...feriadosSemDuplicidade.values()];
        const resultado = { datas: new Set(feriados.map(feriado => feriado.data)), feriados };
        feriadosPorMes.set(chave, resultado);
        return resultado;
    } catch (err) {
        console.error('Erro ao buscar feriados:', err);
        return null;
    }
}

function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function ehDiaUtil(data, feriados, consideraSabado = false) {
    const diaSemana = data.getDay();
    if (diaSemana === 0) return false;
    if (diaSemana === 6 && !consideraSabado) return false;
    return !feriados.has(formatarDataISO(data));
}

function calcularMetaDoMes(ano, mes) {
    const empresasSelecionadas = state.filtros.empresa;
    return state.metas
        .filter(meta => meta.ano === ano && meta.mes === mes)
        .filter(meta => empresasSelecionadas.length === 0 || empresasSelecionadas.includes(meta.empresa))
        .reduce((total, meta) => total + meta.valor, 0);
}

async function calcularAnaliseMetaMesAtual() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;
    const inicioFiltro = parseDataLocal(state.filtros.dataInicio);
    const fimFiltro = parseDataLocal(state.filtros.dataFim, { endOfDay: true });
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);

    if (!inicioFiltro || !fimFiltro || inicioFiltro > fimMes || fimFiltro < inicioMes || hoje.getDate() >= fimMes.getDate()) {
        return null;
    }

    const resultadoFeriados = await buscarFeriados(ano, mes);
    if (!resultadoFeriados) {
        return { erro: true, mensagem: 'Não foi possível calcular os dias úteis.' };
    }
    const { datas: feriados, feriados: listaFeriados } = resultadoFeriados;
    const consideraSabado = String(state.configuracao?.CONSIDERA_SABADO || '').trim().toUpperCase() === 'S';

    const vendasPorDia = new Map();
    filtrarVendas().forEach(venda => {
        const dataVenda = parseDataLocal(venda.data);
        if (!dataVenda || dataVenda > hoje || dataVenda.getFullYear() !== ano || dataVenda.getMonth() + 1 !== mes) return;
        const dataISO = formatarDataISO(dataVenda);
        const totalLinha = venda.valor_produto + venda.valor_servico;
        vendasPorDia.set(dataISO, (vendasPorDia.get(dataISO) || 0) + totalLinha);
    });

    const listaDiasComVenda = [...vendasPorDia.entries()]
        .map(([dataISO, total]) => {
            const dataObj = parseDataLocal(dataISO);
            return {
                dataISO,
                data: dataObj,
                total,
                diaSemana: dataObj ? dataObj.getDay() : null
            };
        })
        .filter(item => item.data && ehDiaUtil(item.data, feriados, true))
        .sort((a, b) => a.dataISO.localeCompare(b.dataISO));

    const faturamentoFiltrado = filtrarVendas().reduce((total, venda) => {
        return total + venda.valor_produto + venda.valor_servico;
    }, 0);
    const mediaDiaria = listaDiasComVenda.length > 0 ? faturamentoFiltrado / listaDiasComVenda.length : 0;

    const listaDiasRestantes = [];
    for (let data = new Date(ano, mes - 1, hoje.getDate() + 1); data <= fimMes; data.setDate(data.getDate() + 1)) {
        if (ehDiaUtil(data, feriados, consideraSabado)) {
            const dataObj = new Date(data);
            const diaSemana = dataObj.getDay();
            listaDiasRestantes.push({
                dataISO: formatarDataISO(dataObj),
                data: dataObj,
                diaSemana,
                ehSabado: diaSemana === 6
            });
        }
    }
    const diasUteisRestantes = listaDiasRestantes.length;

    const totalMetas = calcularTotalMetas();
    const faltaParaMeta = Math.max(0, totalMetas - faturamentoFiltrado);
    const necessarioPorDia = diasUteisRestantes > 0 ? faltaParaMeta / diasUteisRestantes : 0;
    const metaAtingida = faltaParaMeta === 0;
    const acimaDaMedia = metaAtingida || (mediaDiaria > 0 && necessarioPorDia <= mediaDiaria);

    // Total de dias úteis no mês inteiro para calcular a meta por dia
    let diasUteisTotais = 0;
    const totalDiasNoMes = new Date(ano, mes, 0).getDate();
    for (let dia = 1; dia <= totalDiasNoMes; dia++) {
        const dataCheck = new Date(ano, mes - 1, dia);
        if (ehDiaUtil(dataCheck, feriados, consideraSabado)) diasUteisTotais += 1;
    }
    const metaPorDia = diasUteisTotais > 0 ? totalMetas / diasUteisTotais : 0;

    return {
        diasComVenda: listaDiasComVenda.length,
        listaDiasComVenda,
        diasUteisRestantes,
        listaDiasRestantes,
        diasUteisTotais,
        metaPorDia,
        mediaDiaria,
        necessarioPorDia,
        metaAtingida,
        acimaDaMedia,
        consideraSabado,
        feriados: listaFeriados
    };
}

function atualizarIndicadorMetaDiaria(analise) {
    const indicador = document.getElementById('kpi-meta-diaria');
    if (!indicador) return;
    if (!analise) {
        indicador.hidden = true;
        return;
    }

    indicador.hidden = false;
    indicador.classList.remove('positivo', 'negativo');
    if (analise.erro) {
        indicador.textContent = analise.mensagem;
        return;
    }

    if (analise.metaAtingida) {
        indicador.innerHTML = `<p style="color:black">&#128202; ${analise.diasComVenda} dias com vendas, média diária: ${formatarMoeda(analise.mediaDiaria)}. (no mês atual restam ${analise.diasUteisRestantes} dias).</p><p style="color:green">&#127919; Meta do período atingida. &#9989;</p>`;
        return;
    }

    const percMedia = analise.mediaDiaria > 0 ? (analise.necessarioPorDia / analise.mediaDiaria) * 100 : 0;
    const percMediaFormatado = percMedia.toFixed(1).replace('.', ',');
    const ehMaiorQueMedia = analise.mediaDiaria === 0 ? (analise.necessarioPorDia > 0) : (analise.necessarioPorDia > analise.mediaDiaria);
    const emoji = ehMaiorQueMedia ? '&#10060;' : '&#9989;';
    const corProjecao = ehMaiorQueMedia ? 'red' : 'green';

    indicador.innerHTML = `<p style="color:black">&#128202; ${analise.diasComVenda} dias com vendas, média diária: ${formatarMoeda(analise.mediaDiaria)}. (no mês atual restam ${analise.diasUteisRestantes} dias).</p><p style="color:${corProjecao}">&#127919; Precisa vender por dia para bater meta: ${formatarMoeda(analise.necessarioPorDia)}/dia (${percMediaFormatado}% da média diária ${emoji})</p>`;
}

async function atualizarKPIs() {
    // Primeiro busca o número de pedidos atualizado com os filtros
    await buscarNumPedidos();

    const vendas = filtrarVendas();
    const kpis = calcularKPIs(vendas);

    document.getElementById('kpi-faturamento').textContent = formatarMoeda(kpis.faturamento);
    document.getElementById('kpi-ticket').textContent = formatarMoeda(kpis.ticketMedio);
    document.getElementById('kpi-pedidos').textContent = `${state.numPedidos.toLocaleString('pt-BR')} pedidos`;

    const percentualMeta = document.getElementById('kpi-meta-alcancado');
    percentualMeta.textContent = `${kpis.percentualAlcancado.toFixed(1).replace('.', ',')}% alcançado`;
    percentualMeta.classList.toggle('positivo', kpis.totalMetas > 0 && kpis.percentualAlcancado >= 100);
    percentualMeta.classList.toggle('negativo', kpis.totalMetas > 0 && kpis.percentualAlcancado < 100);

    const analiseDiaria = await calcularAnaliseMetaMesAtual();
    state.detalhesMetas.analiseDiaria = analiseDiaria;
    atualizarIndicadorMetaDiaria(analiseDiaria);

    const kpiMetaEl = document.getElementById('kpi-meta');
    if (analiseDiaria && analiseDiaria.metaPorDia > 0) {
        kpiMetaEl.innerHTML = `${formatarMoeda(kpis.totalMetas)} <span class="kpi-meta-subvalor">(${formatarMoeda(analiseDiaria.metaPorDia)} por dia)</span>`;
    } else {
        kpiMetaEl.textContent = formatarMoeda(kpis.totalMetas);
    }

    document.getElementById('kpi-devolucao').textContent = formatarMoeda(kpis.devolucao);
    document.getElementById('kpi-custo').textContent = formatarMoeda(kpis.custo);
    document.getElementById('kpi-rentabilidade').textContent = "Rentabilidade: "+kpis.rentabilidade.toFixed(1).replace('.', ',') + '%';
}

// ============================================================================
// AGRUPAMENTO DE DADOS
// ============================================================================

function agruparPorPeriodo(vendas, tipo) {
    const agrupado = {};
    vendas.forEach(venda => {
        const data = parseDataLocal(venda.data);
        if (!data) return;
        let chave = tipo === 'ano' ? data.getFullYear().toString() : `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        if (!agrupado[chave]) {
            agrupado[chave] = { valor_produto: 0, valor_servico: 0, valor_total: 0, custo: 0 };
        }
        const totalLinha = venda.valor_produto + venda.valor_servico;
        const valorEfetivo = totalLinha;
        
        agrupado[chave].valor_produto += venda.valor_produto;
        agrupado[chave].valor_servico += venda.valor_servico;
        agrupado[chave].valor_total += valorEfetivo;
        agrupado[chave].custo += venda.custo;
    });

    const lista = Object.entries(agrupado).map(([periodo, dados]) => ({
        periodo,
        valor_produto: dados.valor_produto,
        valor_servico: dados.valor_servico,
        custo: dados.custo,
        valor_total: dados.valor_total
    })).sort((a, b) => a.periodo.localeCompare(b.periodo));
    
    return lista.map((item, index) => {
        let variacao = index > 0 && lista[index - 1].valor_total > 0 ? ((item.valor_total - lista[index - 1].valor_total) / lista[index - 1].valor_total) * 100 : 0;
        return { ...item, variacao };
    });
}

function agruparPorDimensao(vendas, dimensao, limite = null) {
    const agrupado = {};
    vendas.forEach(venda => {
        const chave = venda[dimensao];
        const totalLinha = venda.valor_produto + venda.valor_servico;
        const valorEfetivo = totalLinha;
        agrupado[chave] = (agrupado[chave] || 0) + valorEfetivo;
    });

    let resultado = Object.entries(agrupado).map(([label, valor]) => ({ label, valor }));

    // Se for no modal e a dimensão for cliente, aplicar filtro de valor mínimo
    if (dimensao === 'cliente' && state.modalCliente.valorMinimo > 0) {
        resultado = resultado.filter(item => item.valor >= state.modalCliente.valorMinimo);
    }

    resultado.sort((a, b) => b.valor - a.valor);
    if (limite) resultado = resultado.slice(0, limite);
    return resultado;
}

function agruparClientesPorPeriodo(vendas, tipo) {
    const clientesUnicos = [...new Set(vendas.map(v => v.cliente))].sort();
    const periodos = [...new Set(vendas.map(v => {
        const data = parseDataLocal(v.data);
        if (!data) return null;
        return tipo === 'ano' ? data.getFullYear().toString() : `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    }).filter(Boolean))].sort();

    const agrupado = {};
    const totaisPorCliente = {};

    clientesUnicos.forEach(cliente => {
        agrupado[cliente] = {};
        totaisPorCliente[cliente] = 0;
        periodos.forEach(p => agrupado[cliente][p] = 0);
    });

    vendas.forEach(venda => {
        const data = parseDataLocal(venda.data);
        if (!data) return;
        let chave = tipo === 'ano' ? data.getFullYear().toString() : `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        const totalLinha = venda.valor_produto + venda.valor_servico;
        const valorEfetivo = totalLinha;
        agrupado[venda.cliente][chave] += valorEfetivo;
        totaisPorCliente[venda.cliente] += valorEfetivo;
    });

    // Aplicar filtro de valor mínimo se estiver no modal
    const valorMinimo = state.modalCliente.valorMinimo || 0;
    const clientesFiltrados = clientesUnicos.filter(cliente => totaisPorCliente[cliente] >= valorMinimo);

    return { clientes: clientesFiltrados, periodos, dados: agrupado };
}

// ============================================================================
// RENDERIZAÇÃO DE GRÁFICOS
// ============================================================================

async function renderizarGraficos() {
    const vendas = filtrarVendas();

    // Período Principal
    renderizarGraficoPeriodo('chart-periodo', agruparPorPeriodo(vendas, state.agrupamentos.periodo));
    document.getElementById('titulo-periodo').textContent = `Faturamento por ${state.agrupamentos.periodo === 'ano' ? 'Ano' : 'Mês'}`;
    if (state.interface.graficoMetasVisivel) {
        renderizarGraficoMetasMensais(vendas);
    }
    await cederAoNavegador();

    // Dimensões
    const graficos = [
        ['chart-empresa', 'empresa'], ['chart-marca', 'marca'], ['chart-vendedor', 'vendedor'],
        ['chart-grupo', 'grupo'], ['chart-regiao', 'regiao'], ['chart-cidade', 'cidade'],
        ['chart-rota', 'rota'], ['chart-estado', 'estado'], ['chart-tipo-pagamento', 'tipo_pagamento'],
        ['chart-tipo-documento', 'tipo_documento'], ['chart-status-documento', 'status_documento']
    ];
    for (const [containerId, dimensao] of graficos) {
        const wrapper = document.getElementById(containerId)?.closest('.chart-wrapper');
        if (wrapper?.style.display === 'none') continue;
        renderizarGraficoDimensao(containerId, agruparPorDimensao(vendas, dimensao, 10), dimensao);
        await cederAoNavegador();
    }
}

function alternarGraficoMetas() {
    state.interface.graficoMetasVisivel = !state.interface.graficoMetasVisivel;
    const wrapper = document.getElementById('grafico-metas-wrapper');
    const botao = document.getElementById('btnAlternarGraficoMeta');
    wrapper.hidden = !state.interface.graficoMetasVisivel;
    botao.textContent = state.interface.graficoMetasVisivel ? 'Ocultar gráfico' : 'Ver gráfico';
    botao.title = state.interface.graficoMetasVisivel ? 'Ocultar gráfico mensal de metas' : 'Exibir gráfico mensal de metas';

    if (state.interface.graficoMetasVisivel) {
        renderizarGraficoMetasMensais(filtrarVendas());
    }
}





// ============================================================================
// MODAIS E ANALÍTICO
// ============================================================================

function obterOrigemDoClique(containerId) {
    return containerId === 'chart-cliente-total' ? state.modalCliente.origem : null;
}

function obterFiltrosModal() {
    const filtros = state.modalCliente.origem ? [state.modalCliente.origem] : [];
    const atual = { valor: state.modalCliente.cliente, dimensao: state.modalCliente.dimensao };
    if (atual.valor && atual.dimensao && !filtros.some(f => f.valor === atual.valor && f.dimensao === atual.dimensao)) {
        filtros.push(atual);
    }
    return filtros;
}

function abrirModalCliente(cliente, dimensao, origem = null) {
    state.modalCliente.cliente = cliente;
    state.modalCliente.dimensao = dimensao;
    state.modalCliente.origem = origem || { valor: cliente, dimensao };
    state.modalCliente.valorMinimo = 0;
    document.getElementById('filtroValorMinimoCliente').value = 0;
    document.getElementById('modal-titulo').textContent = `Análise: ${cliente}`;
    document.getElementById('modalCliente').classList.add('ativo');
    document.body.style.overflow = 'hidden';
    atualizarGraficosModalComSpinner();
}

function fecharModalCliente() {
    document.getElementById('modalCliente').classList.remove('ativo');
    document.body.style.overflow = 'auto';
}

async function atualizarGraficosModal() {
    const vendas = filtrarVendas(false, obterFiltrosModal());

    // Gráfico de Período no Modal (Cada linha é um cliente, eixo X são os meses)
    renderizarGraficoClientesPeriodo('chart-cliente-periodo', agruparClientesPorPeriodo(vendas, state.agrupamentos.periodo));
    await cederAoNavegador();

    // Gráfico Total no Modal (Valor Total por Cliente)
    renderizarGraficoDimensao('chart-cliente-total', agruparPorDimensao(vendas, 'cliente', 15), 'cliente');
}

async function atualizarGraficosModalComSpinner() {
    mostrarSpinner();
    await cederAoNavegador();
    try {
        await atualizarGraficosModal();
    } finally {
        ocultarSpinner();
    }
}

async function abrirModalAnalitico(cliente = null, dimensao = null, origem = null) {
    document.getElementById('modalAnalitico').classList.add('ativo');
    document.body.style.overflow = 'hidden';
    mostrarSpinner();
    await cederAoNavegador();
    try {
        renderizarTabelaAnalitica(cliente, dimensao, origem);
        await cederAoNavegador();
    } finally {
        ocultarSpinner();
    }
}

function fecharModalAnalitico() {
    document.getElementById('modalAnalitico').classList.remove('ativo');
    document.body.style.overflow = 'auto';
}

function abrirModalProjecao() {
    const d = state.detalhesMetas;
    const content = document.getElementById('detalhes-projecao-content');
    const analise = d.analiseDiaria;
    let explicacaoMetaDiaria = '';
    let feriadosEncontrados = '';
    let secaoDatas = '';

    if (analise && !analise.erro) {
        const percMedia = analise.mediaDiaria > 0 ? (analise.necessarioPorDia / analise.mediaDiaria) * 100 : 0;
        const percMediaFormatado = percMedia.toFixed(1).replace('.', ',');
        const ehMaiorQueMedia = analise.mediaDiaria === 0 ? (analise.necessarioPorDia > 0) : (analise.necessarioPorDia > analise.mediaDiaria);
        const emoji = ehMaiorQueMedia ? '❌' : '✅';
        const comparacao = analise.metaAtingida
            ? 'Meta do período atingida. ✅'
            : `Precisa vender por dia para bater meta: ${formatarMoeda(analise.necessarioPorDia)}/dia (${percMediaFormatado}% da média diária ${emoji})`;
        explicacaoMetaDiaria = `
            <div class="meta-diaria-explicacao">
                <p style="margin-bottom: 0.35rem;">📊 ${analise.diasComVenda} dias com vendas, média diária: ${formatarMoeda(analise.mediaDiaria)}. (no mês atual restam ${analise.diasUteisRestantes} dias).</p>
                <p style="margin: 0; color: ${ehMaiorQueMedia ? '#EF4444' : '#10B981'};">🎯 ${comparacao}</p>
            </div>`;
        const itensFeriados = analise.feriados || [];
        feriadosEncontrados = `
            <div id="meta-feriados-encontrados" class="meta-feriados-encontrados">
                <strong>Feriados considerados no mês atual</strong>
                ${itensFeriados.length > 0
                    ? `<ul>${itensFeriados.map(feriado => {
                        const empresaStr = feriado.empresa ? ` (${escaparHTML(feriado.empresa)})` : '';
                        return `<li>${formatarDataPtBR(feriado.data)} — ${escaparHTML(feriado.descricao)}${empresaStr}</li>`;
                    }).join('')}</ul>`
                    : '<p>Nenhum feriado informado pela consulta.</p>'}
            </div>`;

        const diasComVenda = analise.listaDiasComVenda || [];
        const diasRestantes = analise.listaDiasRestantes || [];

        const linhasVendas = diasComVenda.length > 0
            ? diasComVenda.map(item => `
                <tr>
                    <td><strong>${formatarDataPtBR(item.dataISO)}</strong></td>
                    <td>${obterNomeDiaSemana(item.diaSemana)}</td>
                    <td style="text-align: right; font-weight: 600; color: var(--primary-color);">${formatarMoeda(item.total)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 0.8rem;">Nenhum dia com venda registrado no período.</td></tr>';

        const linhasRestantes = diasRestantes.length > 0
            ? diasRestantes.map(item => `
                <tr>
                    <td><strong>${formatarDataPtBR(item.dataISO)}</strong></td>
                    <td>
                        ${obterNomeDiaSemana(item.diaSemana)}
                        ${item.ehSabado ? '<span class="badge-sabado">Sábado</span>' : ''}
                    </td>
                    <td style="text-align: right; font-weight: 600; color: var(--text-secondary);">${formatarMoeda(analise.necessarioPorDia)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 0.8rem;">Nenhum dia restante para encerrar o mês.</td></tr>';

        const subtituloRestantes = analise.consideraSabado ? ' (inc. sábados)' : '';

        secaoDatas = `
            <div class="projecao-secao-datas">
                <div class="projecao-bloco-datas">
                    <div class="projecao-bloco-header">
                        <span class="projecao-bloco-titulo">📅 Dias com Vendas (${diasComVenda.length} dias)</span>
                        <span class="projecao-bloco-badge">Média: ${formatarMoeda(analise.mediaDiaria)}</span>
                    </div>
                    <div class="projecao-tabela-scroll">
                        <table class="projecao-tabela">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Dia da Semana</th>
                                    <th style="text-align: right;">Faturado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${linhasVendas}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="projecao-bloco-datas">
                    <div class="projecao-bloco-header">
                        <span class="projecao-bloco-titulo">⏳ Dias para Encerrar o Mês (${diasRestantes.length} dias${subtituloRestantes})</span>
                        <span class="projecao-bloco-badge">Meta: ${formatarMoeda(analise.necessarioPorDia)}/dia</span>
                    </div>
                    <div class="projecao-tabela-scroll">
                        <table class="projecao-tabela">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Dia da Semana</th>
                                    <th style="text-align: right;">Meta Diária</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${linhasRestantes}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } else if (analise?.erro) {
        explicacaoMetaDiaria = `
            <div class="meta-diaria-explicacao">
                <strong>Meta diária indisponível</strong><br>
                A análise depende da consulta de feriados para identificar corretamente os dias úteis restantes.
            </div>`;
    }
    
    content.innerHTML = `
        <div class="projecao-detalhe-item">
            <span class="projecao-detalhe-label">Faturamento atual:</span>
            <span class="projecao-detalhe-valor">${formatarMoeda(d.faturamento)}</span>
        </div>
        <div class="projecao-detalhe-item">
            <span class="projecao-detalhe-label">Total de metas:</span>
            <span class="projecao-detalhe-valor">${formatarMoeda(d.total)}${analise?.metaPorDia > 0 ? ` <span class="kpi-meta-subvalor">(${formatarMoeda(analise.metaPorDia)} por dia)</span>` : ''}</span>
        </div>
        <div class="projecao-detalhe-item" style="border-top: 2px solid var(--primary-color); margin-top: 0.5rem; padding-top: 1rem;">
            <span class="projecao-detalhe-label" style="color: var(--primary-color); font-size: 1rem;">Percentual alcançado:</span>
            <span class="projecao-detalhe-valor" style="color: var(--primary-color); font-size: 1.1rem;">${d.percentualAlcancado.toFixed(1).replace('.', ',')}%</span>
        </div>
        ${explicacaoMetaDiaria}
        ${feriadosEncontrados}
        ${secaoDatas}
    `;

    document.getElementById('modalProjecao').classList.add('ativo');
    document.body.style.overflow = 'hidden';
}

function fecharModalProjecao() {
    document.getElementById('modalProjecao').classList.remove('ativo');
    document.body.style.overflow = 'auto';
}

async function renderizarTabelaComSpinner() {
    const container = document.getElementById('tabelaVendas');
    if (container) container.innerHTML = '<tr><td colspan="18" style="text-align:center; padding: 2rem;">Carregando...</td></tr>';
    mostrarSpinner();
    await cederAoNavegador();
    try {
        renderizarTabelaAnalitica();
        await cederAoNavegador();
    } finally {
        ocultarSpinner();
    }
}

function renderizarTabelaAnalitica(cliente = null, dimensao = null, origem = null) {
    const filtrosExtras = origem ? [origem, { valor: cliente, dimensao }] : [{ valor: cliente, dimensao }];
    const vendas = filtrarVendas(true, filtrosExtras);
    const tbody = document.getElementById('tabelaVendas');
    const tfoot = document.getElementById('tabelaVendasFooter');

    if (!tbody) return;

    tbody.innerHTML = vendas.map(v => {
        const valorTotalLinha = v.valor_produto + v.valor_servico;
        return `
        <tr>
            <td>${formatarDataPtBR(v.data)}</td>
            <td>${v.empresa}</td>
            <td>${v.marca}</td>
            <td>${v.vendedor}</td>
            <td>${v.grupo}</td>
            <td>${v.cliente}</td>
            <td>${v.regiao}</td>
            <td>${v.cidade}</td>
            <td>${v.rota}</td>
            <td>${v.estado}</td>
            <td>${v.tipo_pagamento}</td>
            <td>${v.prazo_pagamento}</td>
            <td>${v.tipo_documento}</td>
            <td>${v.status_documento}</td>
            <td class="numero">${formatarMoeda(v.valor_produto)}</td>
            <td class="numero">${formatarMoeda(v.valor_servico)}</td>
            <td class="numero">${formatarMoeda(valorTotalLinha)}</td>
            <td class="numero">${formatarMoeda(v.devolucao)}</td>
            <td class="numero">${formatarMoeda(v.custo)}</td>
        </tr>
    `;
    }).join('');

    const totais = vendas.reduce((acc, v) => {
        const valorTotalLinha = v.valor_produto + v.valor_servico;
        return {
            total: acc.total + valorTotalLinha,
            valorProduto: acc.valorProduto + v.valor_produto,
            valorServico: acc.valorServico + v.valor_servico,
            devolucao: acc.devolucao + v.devolucao,
            custo: acc.custo + v.custo
        };
    }, { total: 0, valorProduto: 0, valorServico: 0, devolucao: 0, custo: 0 });

    tfoot.innerHTML = `
        <tr>
            <td colspan="14">TOTAIS (${vendas.length} registros)</td>
            <td class="numero">${formatarMoeda(totais.valorProduto)}</td>
            <td class="numero">${formatarMoeda(totais.valorServico)}</td>
            <td class="numero">${formatarMoeda(totais.total)}</td>
            <td class="numero">${formatarMoeda(totais.devolucao)}</td>
            <td class="numero">${formatarMoeda(totais.custo)}</td>
        </tr>
    `;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escaparHTML(valor) {
    const elemento = document.createElement('div');
    elemento.textContent = String(valor);
    return elemento.innerHTML;
}

function abreviarValor(valor) {
    if (valor >= 1000000) {
        return (valor / 1000000).toFixed(1).replace('.', ',') + ' Mi';
    }
    if (valor >= 1000) {
        return (valor / 1000).toFixed(1).replace('.', ',') + ' k';
    }
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function mostrarSpinner() {
    document.getElementById('spinnerOverlay').classList.add('ativo');
}

function ocultarSpinner() {
    document.getElementById('spinnerOverlay').classList.remove('ativo');
}

async function atualizarPainel() {
    await atualizarKPIs();
    await renderizarGraficos();
}

async function atualizarPainelComSpinner() {
    mostrarSpinner();
    await cederAoNavegador();
    try {
        await atualizarPainel();
    } finally {
        ocultarSpinner();
    }
}

function cederAoNavegador() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function exportarExcel() {
    const vendas = filtrarVendas(true);
    const data = vendas.map(v => {
        const valorTotalLinha = v.valor_produto + v.valor_servico;
        return {
            'Data': formatarDataPtBR(v.data),
            'Empresa': v.empresa,
            'Marca': v.marca,
            'Vendedor': v.vendedor,
            'Grupo': v.grupo,
            'Cliente': v.cliente,
            'Região': v.regiao,
            'Cidade': v.cidade,
            'Rota': v.rota,
            'Estado': v.estado,
            'Prazo Pagamento': v.tipo_pagamento,
            'Tipo Pagamento': v.prazo_pagamento,
            'Tipo Documento': v.tipo_documento,
            'Status Documento': v.status_documento,
            'Valor Produto': v.valor_produto,
            'Valor Serviço': v.valor_servico,
            'Valor': valorTotalLinha,
            'Devolução': v.devolucao,
            'Custo': v.custo
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, "vendas_analitico.xlsx");
}

