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

// Estado Global
const state = {
    vendas: [],
    filtros: {
        dataInicio: '2024-01-01',
        dataFim: '2025-12-31',
        empresa: [],
        marca: [],
        vendedor: [],
        grupo: [],
        cliente: []
    },
    filtrosColuna: {
        data: '',
        empresa: '',
        marca: '',
        vendedor: '',
        grupo: '',
        cliente: ''
    },
    agrupamentos: {
        periodo: 'mes',
        tipoGrafico: 'barras'
    },
    opcoes: {
        empresas: [],
        marcas: [],
        vendedores: [],
        grupos: [],
        clientes: []
    },
    modalCliente: {
        cliente: null,
        dimensao: null
    },
    numPedidos: 0
};

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

async function carregarDados() {
    mostrarSpinner();
    try {
        const path = window.location.pathname;
        const primeiro = path.split('/').filter(Boolean)[0];
        const response = await fetch(window.location.origin + '/' + primeiro + '/DASHBOARD_COMERCIAL_II_dados.rule?sys=' + ebfGetSystemID());

        // 1. Pegamos a resposta como arrayBuffer em vez de .json() direto
        const buffer = await response.arrayBuffer();

        // 2. Decodificamos explicitamente para UTF-8 (ou 'iso-8859-1' se o erro persistir)
        const decoder = new TextDecoder('iso-8859-1');
        const text = decoder.decode(buffer);

        // 3. Transformamos a string corrigida em JSON
        const data = JSON.parse(text);

        if (data && data.error) {
            console.warn("API Error:", data.error);
            alert("Erro: " + data.error);
            state.vendas = [];
        } else {
            let vendasRaw = Array.isArray(data.vendas) ? data.vendas : (Array.isArray(data) ? data : []);
            // Normalizar os tipos para evitar erros no Highcharts (números em formato de string) e em métodos como toLowerCase
            state.vendas = vendasRaw.map(v => ({
                ...v,
                empresa: String(v.empresa || ''),
                marca: String(v.marca || ''),
                vendedor: String(v.vendedor || ''),
                grupo: String(v.grupo || ''),
                cliente: String(v.cliente || ''),
                valor: Number(v.valor) || 0,
                devolucao: Number(v.devolucao) || 0,
                quantidade: Number(v.quantidade) || 0
            }));
        }

        // Extrai opções únicas
        state.opcoes.empresas = [...new Set(state.vendas.map(v => v.empresa))].sort();
        state.opcoes.marcas = [...new Set(state.vendas.map(v => v.marca))].sort();
        state.opcoes.vendedores = [...new Set(state.vendas.map(v => v.vendedor))].sort();
        state.opcoes.grupos = [...new Set(state.vendas.map(v => v.grupo))].sort();
        state.opcoes.clientes = [...new Set(state.vendas.map(v => v.cliente))].sort();

        // Popula selects
        populaSelects();

        // Renderiza painel
        await atualizarPainel();
    } catch (err) {
        console.error('Erro ao carregar dados:', err);
    } finally {
        ocultarSpinner();
    }
}

function popularCheckbox(id, opcoes) {
    const container = document.getElementById(id);
    if (container) {
        container.innerHTML = opcoes.map(op => `
            <label class="chk-item">
                <input type="checkbox" value="${op}">
                <span>${op}</span>
            </label>
        `).join('');

        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                const checked = Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value);
                const dim = id.replace('filtro', '').toLowerCase();
                state.filtros[dim] = checked;
            });
        });
    }
}

function populaSelects() {
    popularCheckbox('filtroEmpresa', state.opcoes.empresas);
    popularCheckbox('filtroMarca', state.opcoes.marcas);
    popularCheckbox('filtroVendedor', state.opcoes.vendedores);
    popularCheckbox('filtroGrupo', state.opcoes.grupos);
    popularCheckbox('filtroCliente', state.opcoes.clientes);
}

// ============================================================================
// EVENTOS
// ============================================================================

function inicializarEventos() {
    // Filtros
    document.getElementById('dataInicio').addEventListener('change', (e) => {
        state.filtros.dataInicio = e.target.value;
    });

    document.getElementById('dataFim').addEventListener('change', (e) => {
        state.filtros.dataFim = e.target.value;
    });

    // Filtros por Coluna
    document.querySelectorAll('.col-filter').forEach(input => {
        input.addEventListener('input', (e) => {
            const col = e.target.dataset.col;
            state.filtrosColuna[col] = e.target.value.toLowerCase();
            renderizarTabela();
        });
    });

    // Agrupamentos
    document.getElementById('agrupamentoPeriodo').addEventListener('change', (e) => {
        state.agrupamentos.periodo = e.target.value;
        atualizarPainelComSpinner();
    });

    document.getElementById('tipoGrafico').addEventListener('change', (e) => {
        state.agrupamentos.tipoGrafico = e.target.value;
        atualizarPainelComSpinner();
    });

    // Botão Atualizar Filtros
    document.getElementById('btnAplicarFiltros').addEventListener('click', () => {
        atualizarPainelComSpinner();
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
        abrirModalAnalitico(state.modalCliente.cliente, state.modalCliente.dimensao);
    });

    // Fechar Modais
    document.getElementById('btnFecharModalCliente').addEventListener('click', fecharModalCliente);
    document.getElementById('btnFecharModalAnalitico').addEventListener('click', fecharModalAnalitico);

    // Exportar
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);

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

function filtrarVendas(incluirFiltrosColuna = false, clienteExtra = null, dimensaoExtra = null) {
    return state.vendas.filter(venda => {
        const dataVenda = new Date(venda.data);
        const dataInicio = new Date(state.filtros.dataInicio);
        const dataFim = new Date(state.filtros.dataFim);

        const dentroData = dataVenda >= dataInicio && dataVenda <= dataFim;
        const empresaOk = state.filtros.empresa.length === 0 || state.filtros.empresa.includes(venda.empresa);
        const marcaOk = state.filtros.marca.length === 0 || state.filtros.marca.includes(venda.marca);
        const vendedorOk = state.filtros.vendedor.length === 0 || state.filtros.vendedor.includes(venda.vendedor);
        const grupoOk = state.filtros.grupo.length === 0 || state.filtros.grupo.includes(venda.grupo);
        const clienteOk = state.filtros.cliente.length === 0 || state.filtros.cliente.includes(venda.cliente);

        let extraOk = true;
        if (clienteExtra && dimensaoExtra) {
            extraOk = venda[dimensaoExtra] === clienteExtra;
        }

        let colunaOk = true;
        if (incluirFiltrosColuna) {
            const dataStr = new Date(venda.data).toLocaleDateString('pt-BR');
            colunaOk = dataStr.toLowerCase().includes(state.filtrosColuna.data) &&
                venda.empresa.toLowerCase().includes(state.filtrosColuna.empresa) &&
                venda.marca.toLowerCase().includes(state.filtrosColuna.marca) &&
                venda.vendedor.toLowerCase().includes(state.filtrosColuna.vendedor) &&
                venda.grupo.toLowerCase().includes(state.filtrosColuna.grupo) &&
                venda.cliente.toLowerCase().includes(state.filtrosColuna.cliente);
        }

        return dentroData && empresaOk && marcaOk && vendedorOk && grupoOk && clienteOk && extraOk && colunaOk;
    });
}

// ============================================================================
// CÁLCULO DE KPIs E PROJEÇÃO
// ============================================================================

async function buscarNumPedidos() {
    const formatarMultifiltro = (arr) => {
        if (!arr || arr.length === 0) return '';
        return arr.map(item => `$$${item}$$`).join('');
    };

    const params = new URLSearchParams({
        sys: ebfGetSystemID(),
        empresas: formatarMultifiltro(state.filtros.empresa),
        vendedores: formatarMultifiltro(state.filtros.vendedor),
        marcas: formatarMultifiltro(state.filtros.marca),
        grupos: formatarMultifiltro(state.filtros.grupo),
        clientes: formatarMultifiltro(state.filtros.cliente),
        dataIni: state.filtros.dataInicio || '',
        dataFin: state.filtros.dataFim || ''
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
    const faturamento = vendas.reduce((sum, v) => sum + v.valor, 0);
    const devolucao = vendas.reduce((sum, v) => sum + v.devolucao, 0);
    const quantidade = vendas.reduce((sum, v) => sum + v.quantidade, 0);

    // Novo cálculo do ticket médio baseado no numPedidos da API
    const ticketMedio = state.numPedidos > 0 ? faturamento / state.numPedidos : 0;

    // Lógica de Projeção
    const valorTotal = faturamento + devolucao;
    const projecao = calcularProjecao(state.agrupamentos.periodo, state.filtros.dataFim, valorTotal);

    return { faturamento, ticketMedio, projecao, devolucao };
}

function calcularProjecao(periodo, dataFimFiltro, valorTotal) {
    if (!dataFimFiltro) return valorTotal;

    const [ano, mes, dia] = dataFimFiltro.split('-').map(Number);
    let diasPassados = dia;
    let diasFaltantes = 0;

    if (periodo === 'ano') {
        const dataReferencia = new Date(ano, mes - 1, dia);
        const inicioAno = new Date(ano, 0, 1);
        const fimAno = new Date(ano, 11, 31);
        diasPassados = Math.round((dataReferencia - inicioAno) / (1000 * 60 * 60 * 24)) + 1;
        diasFaltantes = Math.round((fimAno - dataReferencia) / (1000 * 60 * 60 * 24));
    } else {
        const ultimoDiaMes = new Date(ano, mes, 0).getDate();
        diasPassados = dia;
        diasFaltantes = ultimoDiaMes - dia;
    }

    if (diasPassados <= 0) return valorTotal;

    const mediaDia = valorTotal / diasPassados;
    return valorTotal + (mediaDia * diasFaltantes);
}

async function atualizarKPIs() {
    // Primeiro busca o número de pedidos atualizado com os filtros
    await buscarNumPedidos();

    const vendas = filtrarVendas();
    const kpis = calcularKPIs(vendas);

    document.getElementById('kpi-faturamento').textContent = formatarMoeda(kpis.faturamento);
    document.getElementById('kpi-ticket').textContent = formatarMoeda(kpis.ticketMedio);
    document.getElementById('kpi-projecao').textContent = formatarMoeda(kpis.projecao);
    document.getElementById('kpi-devolucao').textContent = formatarMoeda(kpis.devolucao);
}

// ============================================================================
// AGRUPAMENTO DE DADOS
// ============================================================================

function agruparPorPeriodo(vendas, tipo) {
    const agrupado = {};
    vendas.forEach(venda => {
        const data = new Date(venda.data);
        let chave = tipo === 'ano' ? data.getFullYear().toString() : `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        agrupado[chave] = (agrupado[chave] || 0) + venda.valor;
    });

    const lista = Object.entries(agrupado).map(([periodo, valor]) => ({ periodo, valor })).sort((a, b) => a.periodo.localeCompare(b.periodo));
    return lista.map((item, index) => {
        let variacao = index > 0 && lista[index - 1].valor > 0 ? ((item.valor - lista[index - 1].valor) / lista[index - 1].valor) * 100 : 0;
        return { ...item, variacao };
    });
}

function agruparPorDimensao(vendas, dimensao) {
    const agrupado = {};
    vendas.forEach(venda => {
        const chave = venda[dimensao];
        agrupado[chave] = (agrupado[chave] || 0) + venda.valor;
    });
    return Object.entries(agrupado).map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor);
}

function agruparClientesPorPeriodo(vendas, tipo) {
    const clientes = [...new Set(vendas.map(v => v.cliente))].sort();
    const agrupado = {};

    clientes.forEach(cliente => {
        agrupado[cliente] = {};
    });

    vendas.forEach(venda => {
        const data = new Date(venda.data);
        let chave = tipo === 'ano' ? data.getFullYear().toString() : `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;

        if (!agrupado[venda.cliente][chave]) {
            agrupado[venda.cliente][chave] = 0;
        }
        agrupado[venda.cliente][chave] += venda.valor;
    });

    return { clientes, dados: agrupado };
}

// ============================================================================
// RENDERIZAÇÃO DE GRÁFICOS
// ============================================================================

function renderizarGraficos() {
    const vendas = filtrarVendas();

    // Período Principal
    renderizarGraficoPeriodo('chart-periodo', agruparPorPeriodo(vendas, state.agrupamentos.periodo));
    document.getElementById('titulo-periodo').textContent = `Faturamento por ${state.agrupamentos.periodo === 'ano' ? 'Ano' : 'Mês'}`;

    // Dimensões
    renderizarGraficoDimensao('chart-empresa', agruparPorDimensao(vendas, 'empresa'), 'empresa');
    renderizarGraficoDimensao('chart-marca', agruparPorDimensao(vendas, 'marca'), 'marca');
    renderizarGraficoDimensao('chart-vendedor', agruparPorDimensao(vendas, 'vendedor'), 'vendedor');
    renderizarGraficoDimensao('chart-grupo', agruparPorDimensao(vendas, 'grupo'), 'grupo');
}

function renderizarGraficoPeriodo(containerId, dados, type = 'column') {
    Highcharts.chart(containerId, {
        chart: { type: type, backgroundColor: 'transparent', zIndex: 0 },
        title: { text: null },
        xAxis: { categories: dados.map(d => d.periodo), crosshair: true },
        yAxis: { title: { text: null }, labels: { format: 'R$ {value:,.0f}' } },
        tooltip: {
            outside: true,
            shared: true,
            useHTML: true,
            style: { pointerEvents: 'none' },
            positioner: function (labelWidth, labelHeight, point) {
                return { x: point.plotX + 10, y: point.plotY - 20 };
            },
            formatter: function () {
                const item = dados[this.points[0].point.index];
                const variacaoStr = item.variacao !== 0 ?
                    `<br><span style="color:${item.variacao >= 0 ? '#10B981' : '#EF4444'}; font-weight: bold;">
                        ${item.variacao >= 0 ? '▲' : '▼'} ${Math.abs(item.variacao).toFixed(1)}% vs período anterior
                    </span>` : '';
                return `<b>${this.points[0].point.category}</b><br>Faturamento: R$ ${this.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${variacaoStr}`;
            }
        },
        plotOptions: {
            column: {
                pointPadding: 0.2,
                borderWidth: 0,
                color: '#3B82F6',
                dataLabels: {
                    enabled: true,
                    useHTML: true,
                    overflow: 'none',
                    crop: false,
                    allowOverlap: true,
                    zIndex: 9999,
                    formatter: function () {
                        const item = dados[this.point.index];
                        const color = item.variacao >= 0 ? '#10B981' : '#EF4444';
                        const symbol = item.variacao >= 0 ? '▲' : '▼';
                        const variacaoLabel = this.point.index === 0 ? '' :
                            `<div style="color:${color}; font-size:9px; font-weight:bold; margin-top:2px;">
                                ${symbol} ${Math.abs(item.variacao).toFixed(1)}%
                            </div>`;

                        return `<div style="text-align:center;">
                                    <div style="font-size:12px; font-weight:600; color:#1F2937;">R$ ${(this.y / 1000).toFixed(1)}k</div>
                                    ${variacaoLabel}
                                </div>`;
                    },
                    style: { textOutline: 'none', zIndex: 9999 }
                }
            }
        },
        series: [{
            name: 'Faturamento',
            data: dados.map(d => d.valor)
        }],
        credits: { enabled: false }
    });
}

function renderizarGraficoDimensao(containerId, dados, dimensao) {
    const cores = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#10B981', '#34D399', '#6EE7B7', '#F59E0B', '#FBBF24', '#FCD34D', '#EF4444', '#F87171', '#FCA5A5'];

    if (state.agrupamentos.tipoGrafico === 'barras') {
        // Calcula altura dinâmica: ~30px por item + margem
        const alturaGrafico = Math.max(420, dados.length * 30 + 60);

        Highcharts.chart(containerId, {
            chart: {
                type: 'bar',
                backgroundColor: 'transparent',
                zIndex: 0,
                height: alturaGrafico,
                scrollablePlotArea: {
                    minHeight: alturaGrafico,
                    scrollPositionX: 0
                }
            },
            title: { text: null },
            xAxis: {
                categories: dados.map(d => d.label),
                scrollbar: { enabled: true }
            },
            yAxis: { title: { text: null }, scrollbar: { enabled: true } },
            tooltip: {
                outside: true,
                useHTML: true,
                zIndex: 99999,
                style: { zIndex: 99999, position: 'absolute', pointerEvents: 'none' },
                positioner: function (labelWidth, labelHeight, point) {
                    return { x: point.plotX + 10, y: point.plotY - 20 };
                },
                formatter: function () {
                    return `<b>${this.category}</b><br>Faturamento: R$ ${this.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                }
            },
            plotOptions: {
                bar: {
                    dataLabels: {
                        enabled: true,
                        format: 'R$ {point.y:,.0f}',
                        style: { fontSize: '12px', zIndex: 9999 },
                        zIndex: 9999
                    },
                    cursor: 'pointer',
                    point: {
                        events: {
                            click: function () {
                                abrirModalCliente(this.category, dimensao);
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Faturamento',
                data: dados.map((d, i) => ({ y: d.valor, color: cores[i % cores.length] }))
            }],
            credits: { enabled: false }
        });
    } else {
        // Para gráficos de pizza, limitar a 15 itens
        const dadosPizza = dados.slice(0, 15);
        Highcharts.chart(containerId, {
            chart: { type: 'pie', backgroundColor: 'transparent', zIndex: 0 },
            title: { text: null },
            tooltip: {
                outside: true,
                useHTML: true,
                zIndex: 99999,
                style: { zIndex: 99999, position: 'absolute', pointerEvents: 'none' },
                positioner: function (labelWidth, labelHeight, point) {
                    return { x: point.plotX + 10, y: point.plotY - 20 };
                },
                pointFormat: '<b>{point.name}</b>: R$ {point.y:,.2f} ({point.percentage:.1f}%)'
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b>: {point.percentage:.1f}%',
                        style: { fontSize: '12px', zIndex: 9999 },
                        zIndex: 9999
                    },
                    point: {
                        events: {
                            click: function () {
                                abrirModalCliente(this.name, dimensao);
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Faturamento',
                data: dadosPizza.map((d, i) => ({ name: d.label, y: d.valor, color: cores[i % cores.length] }))
            }],
            credits: { enabled: false }
        });
    }
}

// ============================================================================
// MODAIS
// ============================================================================

function abrirModalCliente(cliente, dimensao) {
    state.modalCliente.cliente = cliente;
    state.modalCliente.dimensao = dimensao;

    document.getElementById('modalClienteTitulo').textContent = `Análise: ${cliente} (${dimensao})`;
    document.getElementById('modalCliente').classList.add('ativo');

    const vendasCliente = filtrarVendas(false, cliente, dimensao);
    const { clientes, dados: dadosClientes } = agruparClientesPorPeriodo(vendasCliente, state.agrupamentos.periodo);

    renderizarGraficoClientesPeriodo('chart-cliente-periodo', dadosClientes, clientes);
}

function fecharModalCliente() {
    document.getElementById('modalCliente').classList.remove('ativo');
}

function abrirModalAnalitico(cliente = null, dimensao = null) {
    const titulo = cliente ? `Analítico: ${cliente}` : 'Detalhamento Analítico';
    document.getElementById('modalAnaliticoTitulo').textContent = titulo;

    let infoFiltros = `Período: ${state.filtros.dataInicio} até ${state.filtros.dataFim}`;
    if (cliente) infoFiltros += ` | ${dimensao}: ${cliente}`;
    document.getElementById('info-filtros-analitico').textContent = infoFiltros;

    document.getElementById('modalAnalitico').classList.add('ativo');

    state.contextoAnalitico = { cliente, dimensao };
    renderizarTabela(cliente, dimensao);
}

function fecharModalAnalitico() {
    document.getElementById('modalAnalitico').classList.remove('ativo');
}

function renderizarGraficoClientesPeriodo(containerId, dadosClientes, clientes) {
    const periodos = new Set();
    Object.values(dadosClientes).forEach(clienteData => {
        Object.keys(clienteData).forEach(p => periodos.add(p));
    });
    const periodosOrdenados = Array.from(periodos).sort();

    const distinctColors = ['#E6194B', '#3CB44B', '#FFE119', '#4363D8', '#F58231', '#911EB4', '#46F0F0', '#F032E6', '#BCF60C', '#FABEBE', '#008080', '#E6BEFF', '#9A6324', '#FFFAC8', '#800000', '#AAFFC3', '#808000', '#FFD8B1', '#000075', '#808080'];

    const series = clientes.map((cliente, index) => {
        // Correção do valor na legenda: usar apenas os dados filtrados que estão sendo plotados
        const totalCliente = periodosOrdenados.reduce((sum, periodo) => sum + (dadosClientes[cliente][periodo] || 0), 0);
        return {
            name: cliente + ' - R$ ' + totalCliente.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            data: periodosOrdenados.map(periodo => dadosClientes[cliente][periodo] || 0),
            color: distinctColors[index % distinctColors.length]
        };
    });

    Highcharts.chart(containerId, {
        chart: { type: 'line', backgroundColor: 'transparent', zIndex: 0, zoomType: 'xy' },
        title: { text: null },
        xAxis: { categories: periodosOrdenados },
        yAxis: { title: { text: null }, labels: { format: 'R$ {value:,.0f}' } },
        legend: {
            enabled: true,
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle'
        },
        tooltip: {
            outside: true,
            useHTML: true,
            zIndex: 99999,
            style: { zIndex: 99999, position: 'absolute', pointerEvents: 'none' },
            positioner: function (labelWidth, labelHeight, point) {
                return { x: point.plotX + 10, y: point.plotY - 20 };
            },
            shared: false,
            formatter: function () {
                return `<b>${this.x}</b><br><span style="color:${this.color}">●</span> ${this.series.name}: R$ ${this.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            }
        },
        plotOptions: {
            line: {
                dataLabels: {
                    enabled: true,
                    style: { fontSize: '11px', zIndex: 9999, textOutline: 'none' },
                    zIndex: 9999,
                    formatter: function () {
                        const valor = this.y;
                        if (valor >= 1000) {
                            return `R$ ${(valor / 1000).toFixed(1)}k`;
                        }
                        return `R$ ${valor.toFixed(0)}`;
                    }
                },
                enableMouseTracking: true
            }
        },
        series: series,
        credits: { enabled: false }
    });
}

// ============================================================================
// RENDERIZAÇÃO DE TABELA
// ============================================================================

function renderizarTabela(clienteExtra = null, dimensaoExtra = null) {
    const vendas = filtrarVendas(true, clienteExtra, dimensaoExtra);
    const tbody = document.getElementById('tabelaVendas');
    const tfoot = document.getElementById('tabelaVendasFooter');

    if (!tbody) return;

    tbody.innerHTML = vendas.map(venda => `
        <tr>
            <td>${new Date(venda.data).toLocaleDateString('pt-BR')}</td>
            <td>${venda.empresa}</td>
            <td>${venda.marca}</td>
            <td>${venda.vendedor}</td>
            <td>${venda.grupo}</td>
            <td>${venda.cliente}</td>
            <td class="numero">R$ ${formatarNumero(venda.valor)}</td>
            <td class="numero">R$ ${formatarNumero(venda.devolucao)}</td>
        </tr>
    `).join('');

    const totalValor = vendas.reduce((sum, v) => sum + v.valor, 0);
    const totalDev = vendas.reduce((sum, v) => sum + v.devolucao, 0);

    tfoot.innerHTML = `
        <tr>
            <td colspan="6">TOTAIS (${vendas.length} registros)</td>
            <td class="numero">R$ ${formatarNumero(totalValor)}</td>
            <td class="numero">R$ ${formatarNumero(totalDev)}</td>
        </tr>
    `;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function exportarExcel() {
    const cliente = state.contextoAnalitico?.cliente;
    const dimensao = state.contextoAnalitico?.dimensao;
    const vendas = filtrarVendas(true, cliente, dimensao);

    const dados = vendas.map(v => ({
        'Data': new Date(v.data).toLocaleDateString('pt-BR'),
        'Empresa': v.empresa,
        'Marca': v.marca,
        'Vendedor': v.vendedor,
        'Grupo': v.grupo,
        'Cliente': v.cliente,
        'Valor': v.valor,
        'Devolução': v.devolucao
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
    XLSX.writeFile(wb, `analitico-${cliente || 'geral'}.xlsx`);
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarNumero(valor) {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
}

async function atualizarPainel() {
    await atualizarKPIs();
    renderizarGraficos();
}

function mostrarSpinner() {
    const overlay = document.getElementById('spinnerOverlay');
    if (overlay) overlay.classList.add('ativo');
}

function ocultarSpinner() {
    const overlay = document.getElementById('spinnerOverlay');
    if (overlay) overlay.classList.remove('ativo');
}

async function atualizarPainelComSpinner() {
    mostrarSpinner();
    try {
        await atualizarPainel();
    } catch (err) {
        console.error('Erro ao atualizar painel:', err);
    } finally {
        ocultarSpinner();
    }
}


// ============================================================================
// GERENCIAMENTO DE UI (DRAWER E MODAIS) - Consolidado de filtros.js
// ============================================================================

// Inicialização dos eventos de UI (drawer e modais)
function inicializarUIEventos() {
    // --- Drawer de Filtros ---
    const btnAbrirFiltros = document.getElementById('btnAbrirFiltros');
    const btnFecharFiltros = document.getElementById('btnFecharFiltros');
    const drawerFiltros = document.getElementById('drawerFiltros');
    const drawerOverlay = document.getElementById('drawerOverlay');

    if (btnAbrirFiltros) {
        btnAbrirFiltros.addEventListener('click', () => {
            drawerFiltros.classList.add('ativo');
            document.body.style.overflow = 'hidden';
        });
    }

    const fecharDrawer = () => {
        if (drawerFiltros) {
            drawerFiltros.classList.remove('ativo');
            document.body.style.overflow = 'auto';
        }
    };

    if (btnFecharFiltros) btnFecharFiltros.addEventListener('click', fecharDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener('click', fecharDrawer);

    // --- Modais ---
    const fecharModais = () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('ativo');
        });
        document.body.style.overflow = 'auto';
    };

    // Fechar modais ao clicar no overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', fecharModais);
    });

    // --- Global ESC key ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            fecharDrawer();
            fecharModais();
        }
    });
}

// Chamar a inicialização de UI quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarUIEventos);
} else {
    inicializarUIEventos();
}
