function obterDadosGraficoMetasMensais(vendas) {
    const inicio = parseDataLocal(state.filtros.dataInicio);
    const fim = parseDataLocal(state.filtros.dataFim);
    const empresas = state.filtros.empresa;
    const meses = new Map();

    vendas.forEach(venda => {
        const data = parseDataLocal(venda.data);
        if (!data) return;
        const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        const item = meses.get(chave) || { periodo: chave, faturamento: 0, meta: 0 };
        item.faturamento += venda.valor_produto + venda.valor_servico;
        meses.set(chave, item);
    });

    state.metas
        .filter(meta => empresas.length === 0 || empresas.includes(meta.empresa))
        .filter(meta => {
            const dataMeta = new Date(meta.ano, meta.mes - 1, 1);
            return (!inicio || dataMeta >= new Date(inicio.getFullYear(), inicio.getMonth(), 1)) &&
                (!fim || dataMeta <= new Date(fim.getFullYear(), fim.getMonth(), 1));
        })
        .forEach(meta => {
            const chave = `${meta.ano}-${String(meta.mes).padStart(2, '0')}`;
            const item = meses.get(chave) || { periodo: chave, faturamento: 0, meta: 0 };
            item.meta += meta.valor;
            meses.set(chave, item);
        });

    return [...meses.values()].sort((a, b) => a.periodo.localeCompare(b.periodo));
}

function renderizarGraficoMetasMensais(vendas) {
    const dados = obterDadosGraficoMetasMensais(vendas);
    Highcharts.chart('chart-metas-mensais', {
        chart: {
            type: 'column',
            backgroundColor: 'transparent',
            scrollablePlotArea: { minWidth: window.innerWidth < 768 ? 600 : 0 }
        },
        title: { text: null },
        xAxis: { categories: dados.map(item => item.periodo), crosshair: true },
        yAxis: {
            title: { text: null },
            labels: { format: 'R$ {value:,.0f}' }
        },
        tooltip: {
            shared: true,
            useHTML: true,
            formatter: function () {
                const item = dados[this.points[0].point.index];
                const percentual = item.meta > 0 ? (item.faturamento / item.meta) * 100 : 0;
                return `<b>${item.periodo}</b><br>Faturamento: <b>${formatarMoeda(item.faturamento)}</b><br>Meta: <b>${formatarMoeda(item.meta)}</b><br>Alcançado: <b>${percentual.toFixed(1).replace('.', ',')}%</b>`;
            }
        },
        plotOptions: {
            column: { borderWidth: 0, borderRadius: 3 },
            series: {
                dataLabels: {
                    enabled: true,
                    formatter: function () { return this.y > 0 ? abreviarValor(this.y) : null; },
                    style: { textOutline: 'none', fontSize: '10px' }
                }
            },
            scatter: {
                dataLabels: { enabled: false },
                enableMouseTracking: false
            }
        },
        series: [
            {
                name: 'Faturamento',
                data: dados.map(item => item.faturamento),
                color: '#3B82F6'
            },
            {
                name: 'Meta',
                data: dados.map(item => item.meta),
                color: '#10B981'
            },
            {
                name: '% Alcançado',
                type: 'scatter',
                linkedTo: ':previous',
                showInLegend: false,
                data: dados.map((item, i) => {
                    const pct = item.meta > 0 ? (item.faturamento / item.meta) * 100 : 0;
                    const metaBatida = pct >= 100;
                    return {
                        x: i,
                        y: Math.max(item.faturamento, item.meta) / 2,
                        pct,
                        metaBatida
                    };
                }),
                marker: { enabled: false },
                dataLabels: {
                    enabled: true,
                    useHTML: true,
                    formatter: function () {
                        const { pct, metaBatida } = this.point;
                        if (pct === 0) return null;
                        const cor   = metaBatida ? '#065F46' : '#991B1B';
                        const bg    = metaBatida ? '#D1FAE5'  : '#FEE2E2';
                        const borda = metaBatida ? '#6EE7B7'  : '#FCA5A5';
                        const icone = metaBatida ? '&#x2705;' : '&#x274C;';
                        return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">` +
                               `<div style="width:56px;height:56px;border-radius:50%;background:${bg};border:2px solid ${borda};display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.15);">` +
                               `<span style="color:${cor};font-size:13px;font-weight:800;line-height:1;">${pct.toFixed(1).replace('.', ',')}%</span>` +
                               `<span style="color:${cor};font-size:11px;line-height:1;margin-top:3.5px;">${icone}</span>` +
                               `</div></div>`;
                    },
                    style: { textOutline: 'none' }
                }
            }
        ],
        credits: { enabled: false }
    });
}

function renderizarGraficoPeriodo(containerId, dados, type = 'column') {
    // Calcular faturamento total para porcentagem de custo
    const faturamentoTotal = dados.reduce((sum, d) => sum + d.valor_total, 0);
    const isSeparado = state.agrupamentos.visualizacao === 'separado';
    
    const series = [];
    
    // Usar dataLabels padrão — formatação abreviada aplicada via formatter global
    const dataLabelsFaturamento = {};

    if (isSeparado) {
        series.push({
            name: 'Produto',
            type: type,
            data: dados.map(d => d.valor_produto),
            color: '#3B82F6',
            stack: 'faturamento'
        });
        series.push({
            name: 'Serviço',
            type: type,
            data: dados.map(d => d.valor_servico),
            color: '#10B981',
            stack: 'faturamento'
        });
    } else {
        series.push({
            name: 'Faturamento',
            type: type,
            data: dados.map(d => d.valor_total),
            color: '#3B82F6',
            stack: 'faturamento'
        });
    }
    
    // Custo (usar dataLabels padrão/global)
    series.push({
        name: 'Custo',
        type: 'column',
        data: dados.map((d, idx) => ({
            y: d.custo,
            pct: d.valor_total > 0 ? (d.custo / d.valor_total * 100) : 0,
            index: idx
        })),
        color: '#EF4444',
        stack: 'custo',
        dataLabels: {
            enabled: true,
            useHTML: true,
            formatter: function () {
                if (this.y <= 0) return null;
                const valorAbrev = abreviarValor(this.y);
                if (state.agrupamentos?.periodo !== 'mes') return valorAbrev;

                const rentabilidade = 100 - (this.point.pct || 0);
                return '<span style="background-color: rgba(239,68,68,0.08); padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-block;">' +
                    valorAbrev + ' <span style="color:#10B981;">' + rentabilidade.toFixed(1).replace('.', ',') + '%</span></span>';
            },
            inside: false,
            style: { textOutline: 'none' }
        }
    });

    Highcharts.chart(containerId, {
        chart: { 
            type: type, 
            backgroundColor: 'transparent', 
            zIndex: 0,
            spacingTop: 24,
            scrollablePlotArea: {
                minWidth: window.innerWidth < 768 ? 600 : 0,
                scrollPositionX: 0
            }
        },
        title: { text: null },
        xAxis: {
            categories: dados.map(d => d.periodo),
            crosshair: true,
            labels: {
                useHTML: true,
                formatter: function() {
                    const index = dados.findIndex(d => d.periodo === this.value);
                    const item = dados[index];
                    let label = '<div style="text-align: center; line-height: 1.2; font-family: \'Poppins\', sans-serif;">' + this.value;
                    if (item && item.variacao !== 0) {
                        const color = item.variacao >= 0 ? '#10B981' : '#EF4444';
                        const icon = item.variacao >= 0 ? '▲' : '▼';
                        label += '<br/><span style="background-color: ' + (item.variacao >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)') + '; color: ' + color + '; font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 3px; display: inline-block; margin-top: 4px; border: 1px solid ' + (item.variacao >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)') + ';">' + icon + ' ' + Math.abs(item.variacao).toFixed(1) + '%</span>';
                    }
                    label += '</div>';
                    return label;
                }
            }
        },
        yAxis: {
            title: { text: null },
            labels: { format: 'R$ {value:,.0f}' },
            maxPadding: 0.2
        },
        legend: {
            enabled: true,
            align: 'center',
            verticalAlign: 'bottom',
            layout: 'horizontal'
        },
        tooltip: {
            outside: true,
            shared: true,
            useHTML: true,
            style: { pointerEvents: 'none' },
            positioner: function (labelWidth, labelHeight, point) {
                return { x: point.plotX + 10, y: point.plotY - 20 };
            },
            formatter: function () {
                let html = '<b>' + this.points[0].point.category + '</b><br>';
                
                this.points.forEach(point => {
                    const item = dados[point.point.index];
                    console.log('Tooltip item:', item);
                    console.log('Tooltip point:', point);
                    if (point.series.name === 'Produto') {
                        html += 'Produto: R$ ' + point.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                    } else if (point.series.name === 'Serviço') {
                        html += 'Serviço: R$ ' + point.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                    } else if (point.series.name === 'Faturamento') {
                        html += 'Faturamento: R$ ' + point.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                        if (state.configuracao.PED_OU_PED_E_OS !== 'PP') {
                            html += '&nbsp;&nbsp;• Produto: R$ ' + item.valor_produto.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                            html += '&nbsp;&nbsp;• Serviço: R$ ' + item.valor_servico.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '<br>';
                        }
                    } else if (point.series.name === 'Custo') {
                        const rentabilidade = item.valor_total > 0 ? ((item.valor_total - item.custo) / item.valor_total * 100) : 0;
                        html += 'Custo: R$ ' + point.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' (' + rentabilidade.toFixed(1) + '% de rentabilidade)<br>';
                    }
                });
                
                const item = dados[this.points[0].point.index];
                const variacaoStr = item.variacao !== 0 ?
                    '<span style="color:' + (item.variacao >= 0 ? '#10B981' : '#EF4444') + '; font-weight: bold;">' +
                        (item.variacao >= 0 ? '▲' : '▼') + ' ' + Math.abs(item.variacao).toFixed(1) + '% vs período anterior' +
                    '</span>' : '';
                
                return html + variacaoStr;
            }
        },
        plotOptions: {
            series: {
                dataLabels: {
                    enabled: true,
                    useHTML: true,
                    formatter: function() {
                        if (this.y <= 0) return null;
                        const valorAbrev = abreviarValor(this.y);
                        if (state.agrupamentos && state.agrupamentos.periodo === 'mes') {
                            return '<span style="background-color: rgba(59,130,246,0.08); padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-block;">' + valorAbrev + '</span>';
                        }
                        return valorAbrev;
                    },
                    inside: false,
                    style: { textOutline: 'none' }
                }
            },
            column: {
                pointPadding: 0.2,
                borderWidth: 0,
                stacking: isSeparado ? 'normal' : undefined
            },
            line: {
                dataLabels: {
                    enabled: false
                }
            }
        },
        series: series,
        credits: { enabled: false }
    });
}

function renderizarGraficoDimensao(containerId, dados, dimensao) {
    const cores = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#10B981', '#34D399', '#6EE7B7', '#F59E0B', '#FBBF24', '#FCD34D', '#EF4444', '#F87171', '#FCA5A5'];

    // Calcular faturamento total geral filtrado do dashboard ou específico do modal para o cálculo exato do %
    const isModal = containerId === 'chart-cliente-total';
    const vendasFiltradas = isModal
        ? filtrarVendas(false, obterFiltrosModal())
        : filtrarVendas();
    const faturamentoTotal = vendasFiltradas.reduce((sum, v) => {
        const totalLinha = v.valor_produto + v.valor_servico;
        return sum + totalLinha;
    }, 0);

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
                    minWidth: window.innerWidth < 768 ? 500 : 0,
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
                    const pct = faturamentoTotal > 0 ? (this.y / faturamentoTotal * 100) : 0;
                    return `<b>${this.category}</b><br>Faturamento: R$ ${this.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pct.toFixed(1)}% do total)`;
                }
            },
            plotOptions: {
                bar: {
                    dataLabels: {
                        enabled: true,
                        useHTML: true,
                        allowOverlap: false,
                        formatter: function() {
                            const pct = faturamentoTotal > 0 ? (this.y / faturamentoTotal * 100) : 0;
                            return '<span style="background-color: rgba(255, 255, 255, 0.85); padding: 2px 4px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.12); box-shadow: 0 1px 3px rgba(0,0,0,0.08); color: #1F2937; font-weight: bold; font-size: 11px; white-space: nowrap;">R$ ' + 
                                   this.y.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + 
                                   ' (' + pct.toFixed(1) + '%)</span>';
                        },
                        style: { fontSize: '14.4px', zIndex: 9999 },
                        zIndex: 9999
                    },
                    cursor: 'pointer',
                    point: {
                        events: {
                            click: function () {
                                abrirModalCliente(this.name || this.category, dimensao, obterOrigemDoClique(containerId));
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Faturamento',
                data: dados.map((d, i) => ({ 
                    name: d.label, 
                    y: d.valor, 
                    color: cores[i % cores.length] 
                }))
            }],
            credits: { enabled: false }
        });
    } else {
        // Para gráficos de pizza, limitar a 15 itens
        const dadosPizza = dados.slice(0, 15);
        Highcharts.chart(containerId, {
            chart: { 
                type: 'pie', 
                backgroundColor: 'transparent', 
                zIndex: 0
            },
            title: { text: null },
            tooltip: {
                outside: true,
                useHTML: true,
                zIndex: 99999,
                style: { zIndex: 99999, position: 'absolute', pointerEvents: 'none' },
                positioner: function (labelWidth, labelHeight, point) {
                    return { x: point.plotX + 10, y: point.plotY - 20 };
                },
                formatter: function () {
                    const pct = faturamentoTotal > 0 ? (this.y / faturamentoTotal * 100) : 0;
                    return `<b>${this.point.name}</b><br/>Faturamento: R$ ${this.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pct.toFixed(1)}%)`;
                }
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        useHTML: true,
                        allowOverlap: false,
                        formatter: function() {
                            const pct = faturamentoTotal > 0 ? (this.y / faturamentoTotal * 100) : 0;
                            return '<b>' + this.point.name + '</b>: ' + pct.toFixed(1) + '%';
                        },
                        style: { fontSize: '14.4px' }
                    },
                    point: {
                        events: {
                            click: function () {
                                abrirModalCliente(this.name, dimensao, obterOrigemDoClique(containerId));
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Faturamento',
                colorByPoint: true,
                data: dadosPizza.map(d => ({ name: d.label, y: d.valor }))
            }],
            credits: { enabled: false }
        });
    }
}

function renderizarGraficoClientesPeriodo(containerId, resultado) {
    const { clientes, periodos, dados } = resultado;
    const aviso = document.getElementById('chart-cliente-periodo-aviso');
    const container = document.getElementById(containerId);

    if (clientes.length > 5) {
        Highcharts.charts.forEach(chart => {
            if (chart?.renderTo === container) chart.destroy();
        });
        container.style.display = 'none';
        aviso.hidden = false;
        aviso.textContent = 'O gráfico por período é exibido somente quando há até 5 clientes.';
        return;
    }

    container.style.display = '';
    aviso.hidden = true;
    
    const series = clientes.map(cliente => ({
        name: cliente,
        type: 'line',
        data: periodos.map(p => dados[cliente][p] || 0)
    }));

    Highcharts.chart(containerId, {
        chart: { 
            type: 'line', 
            backgroundColor: 'transparent', 
            zIndex: 0,
            scrollablePlotArea: {
                minWidth: window.innerWidth < 768 ? 600 : 0,
                scrollPositionX: 0
            }
        },
        title: { text: null },
        xAxis: { categories: periodos, crosshair: true },
        yAxis: {
            title: { text: null },
            labels: { format: 'R$ {value:,.0f}' }
        },
        tooltip: {
            shared: true,
            useHTML: true,
            backgroundColor: '#ffffff',
            borderColor: '#ccc',
            borderWidth: 1,
            shadow: true,
            style: {
                fontSize: '14.4px',
                zIndex: 9999
            },
            formatter: function () {
                if (!this.points) return '';
                const pontosOrdenados = this.points.slice().sort((a, b) => b.y - a.y);
                let s = `<div style="padding: 5px;"><b>${this.x}</b><br/>`;
                let totalMes = 0;
                pontosOrdenados.forEach(point => {
                    if (point.y > 0) {
                        s += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${formatarMoeda(point.y)}</b><br/>`;
                        totalMes += point.y;
                    }
                });
                if (pontosOrdenados.length > 1) {
                    s += `<hr style="margin: 5px 0; border: none; border-top: 1px solid #ccc;">`;
                    s += `<b>Total:</b> <b>${formatarMoeda(totalMes)}</b>`;
                }
                s += `</div>`;
                return s;
            }
        },
        plotOptions: {
            line: {
                dataLabels: {
                    enabled: true,
                    allowOverlap: false,
                    formatter: function() {
                        return this.y > 0 ? abreviarValor(this.y) : null;
                    },
                    style: {
                        fontSize: '12px',
                        fontWeight: 'normal',
                        textOutline: 'none'
                    }
                },
                marker: { enabled: true, radius: 4 },
                lineWidth: 2,
                states: { hover: { lineWidth: 3 } }
            }
        },
        series: series,
        legend: {
            enabled: true,
            align: 'center',
            verticalAlign: 'bottom',
            layout: 'horizontal'
        },
        credits: { enabled: false }
    });
}

