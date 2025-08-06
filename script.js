document.addEventListener('DOMContentLoaded', () => {
    // Mapeia os elementos HTML para constantes para fácil acesso.
    const numVariaveisInput = document.getElementById('numVariaveis');
    const btnIncrement = document.getElementById('btn-increment');
    const btnDecrement = document.getElementById('btn-decrement');
    const numSaidasInput = document.getElementById('numSaidas');
    const btnIncrementSaidas = document.getElementById('btn-increment-saidas');
    const btnDecrementSaidas = document.getElementById('btn-decrement-saidas');
    const tabelaContainer = document.getElementById('tabela-container');
    const outputsContainer = document.getElementById('outputs-container');
    const mainView = document.getElementById('main-view');
    const mapView = document.getElementById('map-view');
    const btnGerarMapa = document.getElementById('btn-gerar-mapa');
    const btnVoltar = document.getElementById('btn-voltar');
    const btnCopiarTabela = document.getElementById('btn-copiar-tabela');
    const themeCheckbox = document.getElementById('theme-checkbox');
    const inputModeCheckbox = document.getElementById('input-mode-checkbox');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidenav = document.getElementById('sidenav-menu');
    const closeBtn = document.querySelector('.sidenav .closebtn');

    // Define constantes e variáveis globais.
    const estadosSaida = ['0', '1', 'X'];
    let varNames = ['A', 'B', 'C', 'D', 'E', 'F']; 
    let outputVarNames = ['S']; // Array para múltiplas saídas
    const GROUP_COLORS = ['#f7685eff', '#61b2f5ff', '#83d485ff', '#ebc85eff', '#c16fcfff', '#eb7dbdff', '#7ed3d3ff', '#e08164ff'];
    let simplificationStepsLog = [];
    let isKarnaughInputMode = false; // Controla o modo de entrada

    /**
     * Converte os dígitos e as strings "in"/"out" para seus equivalentes em subscrito (Unicode).
     */
    function formatNameToSubscript(name) {
        const subscriptMap = {
            '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
            '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
            'in': 'ᵢₙ',
            'out': 'ₒᵤₜ'
        };

        const regex = /out|in|\d/gi;
        return String(name).replace(regex, (match) => {
            const key = match.toLowerCase();
            return subscriptMap[key] || match;
        });
    }

    const switchView = (viewToShow) => {
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.remove('active');
        });
        viewToShow.classList.add('active');
    };

    const gerarMapaEExibir = () => {
        if (isKarnaughInputMode) {
            // Modo Karnaugh: usar valores dos mapas editáveis
            gerarResultadosDoModoKarnaugh();
        } else {
            // Modo Tabela Verdade: usar valores da tabela
            gerarResultadosDoModoTabela();
        }
    };

    const gerarResultadosDoModoTabela = () => {
        const numVars = parseInt(numVariaveisInput.value);
        const numSaidas = parseInt(numSaidasInput.value);
        const allOutputsValues = lerValoresTabela();

        if (outputsContainer) {
            outputsContainer.innerHTML = '';
        }

        for (let i = 0; i < numSaidas; i++) {
            const outputSection = document.createElement('div');
            outputSection.className = 'output-section';
            outputSection.innerHTML = `
                <div class="output-header">
                    <h2>Resultados para: ${formatNameToSubscript(outputVarNames[i] || `S${i}`)}</h2>
                </div>
                <div class="results-wrapper">
                    <div class="results-column" id="map-column-${i}">
                        <div class="kmap-and-expression">
                            <div id="kmap-container-${i}" class="kmap-output-container"></div>
                        </div>
                        <div class="action-buttons">
                            <button id="btn-copiar-mapa-${i}" class="btn-secondary">Copiar Mapa</button>
                        </div>
                    </div>
                    <div class="results-column" id="expression-column-${i}">
                        <div class="expression-card">
                            <h2>Expressão Simplificada</h2>
                            <div class="expression-content">
                                <p id="simplified-expression-${i}">S = ?</p>
                                <button id="btn-copy-main-expression-${i}" class="copy-icon-button" title="Copiar Expressão" style="display: none;">
                                    <i class="bi bi-clipboard"></i>
                                </button>
                            </div>
                        </div>
                        <div class="steps-card">
                            <h2>Passo a Passo da Simplificação</h2>
                            <div id="simplification-steps-container-${i}"></div>
                            <div class="action-buttons steps-action">
                                <button id="btn-copy-steps-${i}" class="btn-secondary" style="display: none;">Copiar Passos</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            outputsContainer.appendChild(outputSection);
            
            const truthTableValues = allOutputsValues[i];
            gerarResultadoParaSaida(numVars, truthTableValues, i);
        }
        
        switchView(mapView);
    };

    const gerarResultadosDoModoKarnaugh = () => {
        const numVars = parseInt(numVariaveisInput.value);
        const numSaidas = parseInt(numSaidasInput.value);

        if (outputsContainer) {
            outputsContainer.innerHTML = '';
        }

        for (let i = 0; i < numSaidas; i++) {
            const outputSection = document.createElement('div');
            outputSection.className = 'output-section';
            // MODIFICADO: Inverti a ordem das colunas e ajustei os IDs/classes para o layout 50/50.
            outputSection.innerHTML = `
                <div class="output-header">
                    <h2>Resultados para: ${formatNameToSubscript(outputVarNames[i] || `S${i}`)}</h2>
                </div>
                <div class="results-wrapper">
                    <div class="results-column" id="table-column-${i}" style="flex: 1 1 50%;">
                        <div class="truth-table-card">
                            <h2>Tabela Verdade</h2>
                            <div id="truth-table-container-${i}"></div>
                            <div class="action-buttons">
                                <button id="btn-copiar-tabela-${i}" class="btn-secondary">Copiar Tabela</button>
                            </div>
                        </div>
                    </div>
                    <div class="results-column" id="expression-column-${i}" style="flex: 1 1 50%;">
                        <div class="expression-card">
                            <h2>Expressão Simplificada</h2>
                            <div class="expression-content">
                                <p id="simplified-expression-${i}">S = ?</p>
                                <button id="btn-copy-main-expression-${i}" class="copy-icon-button" title="Copiar Expressão" style="display: none;">
                                    <i class="bi bi-clipboard"></i>
                                </button>
                            </div>
                        </div>
                        <div class="steps-card">
                            <h2>Passo a Passo da Simplificação</h2>
                            <div id="simplification-steps-container-${i}"></div>
                            <div class="action-buttons steps-action">
                                <button id="btn-copy-steps-${i}" class="btn-secondary" style="display: none;">Copiar Passos</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            outputsContainer.appendChild(outputSection);
            
            const kmapValues = window.inputKmapValues[i] || new Array(Math.pow(2, numVars)).fill('0');
            gerarResultadoParaSaidaKarnaugh(numVars, kmapValues, i);
        }
        
        switchView(mapView);
    };

    function gerarResultadoParaSaidaKarnaugh(numVars, kmapValues, outputIndex) {
        const currentSimplificationSteps = [];
        const stepsContainer = document.getElementById(`simplification-steps-container-${outputIndex}`);
        const btnCopySteps = document.getElementById(`btn-copy-steps-${outputIndex}`);
        const expressionElement = document.getElementById(`simplified-expression-${outputIndex}`);
        const btnCopyMainExpression = document.getElementById(`btn-copy-main-expression-${outputIndex}`);
        const truthTableContainer = document.getElementById(`truth-table-container-${outputIndex}`);

        // Gerar tabela verdade a partir dos valores do mapa
        gerarTabelaVerdadeParaSaida(numVars, kmapValues, outputIndex);

        stepsContainer.style.display = 'none';
        btnCopySteps.style.display = 'none';
        stepsContainer.innerHTML = '';

        const { kmapMatrices, gridConfig } = gerarMatrizesKmap(numVars, kmapValues);
        
        try {
            const { finalGroups, expression } = simplificar(numVars, kmapMatrices);

            expressionElement.innerHTML = `${outputVarNames[outputIndex]} = ?`;
            btnCopyMainExpression.style.display = 'none';
            
            if (expression === "0" || expression === "1" || !finalGroups || finalGroups.length === 0) {
                expressionElement.innerHTML = `${outputVarNames[outputIndex]} = ${expression || '0'}`;
                renderizarPassos(outputIndex, []);
                return;
            }
            
            let stepCounter = 0;
            let currentTerms = finalGroups.map((group, i) => ({
                term: getTermForGroup(numVars, group),
                color: GROUP_COLORS[i % GROUP_COLORS.length]
            }));

            currentSimplificationSteps.push({
                title: `Passo ${stepCounter++}: Expressão Inicial (Soma de Produtos)`,
                termsWithMeta: [...currentTerms],
                plainExpression: formatExpressionFromTerms(currentTerms, outputIndex),
                explanation: 'Esta é a expressão booleana simplificada, obtida diretamente dos agrupamentos no mapa. As cores correspondem aos grupos. A partir daqui, aplicaremos regras algébricas para simplificar ainda mais.'
            });

            let changedInLoop = true;
            while(changedInLoop) {
                let somethingChangedThisCycle = false;

                const factorResult = processOneFactoringStep(currentTerms);
                if (factorResult.changed) {
                    currentSimplificationSteps.push({
                        title: `Passo ${stepCounter++}: Fatoração (Termo em Evidência)`,
                        termsWithMeta: factorResult.newTerms,
                        plainExpression: formatExpressionFromTerms(factorResult.newTerms, outputIndex),
                        explanation: factorResult.explanation
                    });
                    currentTerms = factorResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue;
                }

                const xorResult = processOneXorStep(currentTerms);
                if (xorResult.changed) {
                    currentSimplificationSteps.push({
                        title: `Passo ${stepCounter++}: Simplificação (Porta XOR/XNOR)`,
                        termsWithMeta: xorResult.newTerms,
                        plainExpression: formatExpressionFromTerms(xorResult.newTerms, outputIndex),
                        explanation: xorResult.explanation
                    });
                    currentTerms = xorResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue;
                }

                const complexFactorResult = processFactoringWithComplexTerms(currentTerms);
                if (complexFactorResult.changed) {
                    currentSimplificationSteps.push({
                        title: `Passo ${stepCounter++}: Fatoração (Termo Complexo)`,
                        termsWithMeta: complexFactorResult.newTerms,
                        plainExpression: formatExpressionFromTerms(complexFactorResult.newTerms, outputIndex),
                        explanation: complexFactorResult.explanation
                    });
                    currentTerms = complexFactorResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue;
                }

                const compoundResult = processOneCompoundStep(currentTerms);
                if (compoundResult.changed) {
                    currentSimplificationSteps.push({
                        title: `Passo ${stepCounter++}: Simplificação (Associativa)`,
                        termsWithMeta: compoundResult.newTerms,
                        plainExpression: formatExpressionFromTerms(compoundResult.newTerms, outputIndex),
                        explanation: compoundResult.explanation
                    });
                    currentTerms = compoundResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue;
                }

                if (!somethingChangedThisCycle) {
                    changedInLoop = false;
                }
            }

            let finalDisplayTerms = [...currentTerms];

            const needsXnorConversion = currentTerms.some(t => t.term.includes("⊕") && t.term.includes(")'"));

            if (needsXnorConversion) {
                finalDisplayTerms = currentTerms.map(t => ({ ...t, term: formatWithXNOR(t.term) }));

                currentSimplificationSteps.push({
                    title: `Passo ${stepCounter++}: Conversão para Notação XNOR (⊙)`,
                    termsWithMeta: [...finalDisplayTerms],
                    plainExpression: formatExpressionFromTerms(finalDisplayTerms, outputIndex),
                    explanation: "Para uma representação final mais limpa, convertemos a notação XNOR da forma (P ⊕ Q)' para a forma P ⊙ Q."
                });
            }

            expressionElement.innerHTML = `${formatNameToSubscript(outputVarNames[outputIndex])} = ${formatExpressionHTML(finalDisplayTerms, false)}`;
            btnCopyMainExpression.style.display = 'inline-flex';

            renderizarPassos(outputIndex, currentSimplificationSteps);

        } catch (e) {
            console.error(`Erro durante a simplificação para a saída ${outputIndex}:`, e);
            expressionElement.textContent = `${outputVarNames[outputIndex]} = Erro na simplificação`;
        }
    }

    function gerarTabelaVerdadeParaSaida(numVars, kmapValues, outputIndex) {
        const container = document.getElementById(`truth-table-container-${outputIndex}`);
        const numLinhas = Math.pow(2, numVars);

        const table = document.createElement("table");
        table.style.margin = "0 auto";
        
        // Cabeçalho da tabela
        const tableHeaders = varNames.slice(0, numVars).map((v, i) => `
            <th${i === numVars - 1 ? ' class="input-separator"' : ''}>${formatNameToSubscript(v)}</th>
        `).join("");

        table.innerHTML = `
            <thead>
                <tr>
                    <th class="row-actions"></th> <!-- NOVO: Cabeçalho para a coluna de visibilidade -->
                    ${tableHeaders}
                    <th>${formatNameToSubscript(outputVarNames[outputIndex])}</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;

        const tbody = table.querySelector('tbody');

        // Gerar linhas da tabela
        for (let i = 0; i < numLinhas; i++) {
            const binaryString = i.toString(2).padStart(numVars, '0');
            const row = document.createElement('tr');

            // NOVO: Adiciona a célula de ação com o botão de visibilidade
            const actionCell = document.createElement('td');
            actionCell.className = 'row-actions';
            actionCell.innerHTML = `<i class="bi bi-eye toggle-visibility-btn" title="Ocultar/Mostrar linha"></i>`;
            row.appendChild(actionCell);
            
            // Colunas de entrada
            for (let j = 0; j < numVars; j++) {
                const cell = document.createElement('td');
                cell.textContent = binaryString[j];
                // Adiciona a classe separadora à última célula de entrada
                if (j === numVars - 1) {
                    cell.classList.add('input-separator');
                }
                row.appendChild(cell);
            }
            
            // Coluna de saída
            const outputCell = document.createElement('td');
            const outputValue = kmapValues[i] || '0';
            outputCell.textContent = outputValue;
            outputCell.className = 'output-cell';
            if (outputValue === 'X') {
                outputCell.classList.add('x-value');
            } else if (outputValue === '1') {
                outputCell.classList.add('one-value');
            }
            row.appendChild(outputCell);
            
            tbody.appendChild(row);
        }

        container.innerHTML = '';
        container.appendChild(table);

        // NOVO: Adiciona o event listener para os botões de visibilidade na tabela gerada
        table.querySelector('tbody').addEventListener('click', (event) => {
            if (event.target.classList.contains('toggle-visibility-btn')) {
                const icon = event.target;
                const row = icon.closest('tr');
                row.classList.toggle('row-hidden');
                icon.classList.toggle('bi-eye');
                icon.classList.toggle('bi-eye-slash');
            }
        });
    }

    function gerarResultadoParaSaida(numVars, truthTableValues, outputIndex) {
        const currentSimplificationSteps = []; // Use a local variable for steps
        const stepsContainer = document.getElementById(`simplification-steps-container-${outputIndex}`);
        const btnCopySteps = document.getElementById(`btn-copy-steps-${outputIndex}`);
        const expressionElement = document.getElementById(`simplified-expression-${outputIndex}`);
        const btnCopyMainExpression = document.getElementById(`btn-copy-main-expression-${outputIndex}`);
        const kmapContainer = document.getElementById(`kmap-container-${outputIndex}`);

        stepsContainer.style.display = 'none';
        btnCopySteps.style.display = 'none';
        stepsContainer.innerHTML = '';

        const { kmapMatrices, gridConfig } = gerarMatrizesKmap(numVars, truthTableValues);
        
        desenharMapaK(numVars, kmapMatrices, gridConfig, outputIndex, false, 'output');
        
        try {
            const { finalGroups, expression } = simplificar(numVars, kmapMatrices);

            expressionElement.innerHTML = `${outputVarNames[outputIndex]} = ?`;
            btnCopyMainExpression.style.display = 'none';
            
            if (expression === "0" || expression === "1" || !finalGroups || finalGroups.length === 0) {
                expressionElement.innerHTML = `${outputVarNames[outputIndex]} = ${expression || '0'}`;
                desenharGrupos(finalGroups || [], gridConfig, outputIndex, 'output');
                renderizarPassos(outputIndex, []); // Render with no steps
                return;
            }
            
            let stepCounter = 0;
            let currentTerms = finalGroups.map((group, i) => ({
                term: getTermForGroup(numVars, group),
                color: GROUP_COLORS[i % GROUP_COLORS.length]
            }));

            currentSimplificationSteps.push({
                title: `Passo ${stepCounter++}: Expressão Inicial (Soma de Produtos)`,
                termsWithMeta: [...currentTerms],
                plainExpression: formatExpressionFromTerms(currentTerms, outputIndex),
                explanation: 'Esta é a expressão booleana simplificada, obtida diretamente dos agrupamentos no mapa. As cores correspondem aos grupos. A partir daqui, aplicaremos regras algébricas para simplificar ainda mais.'
            });

            let changedInLoop = true;
            while(changedInLoop) {
                let somethingChangedThisCycle = false;

                const factorResult = processOneFactoringStep(currentTerms);
                if (factorResult.changed) {
                    currentSimplificationSteps.push({
                        title: `Passo ${stepCounter++}: Fatoração (Termo em Evidência)`,
                        termsWithMeta: factorResult.newTerms,
                        plainExpression: formatExpressionFromTerms(factorResult.newTerms, outputIndex),
                        explanation: factorResult.explanation
                    });
                    currentTerms = factorResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue;
                }

                const xorResult = processOneXorStep(currentTerms);
                if (xorResult.changed) {
                    currentSimplificationSteps.push({
                        title: `Passo ${stepCounter++}: Simplificação (Porta XOR/XNOR)`,
                        termsWithMeta: xorResult.newTerms,
                        plainExpression: formatExpressionFromTerms(xorResult.newTerms, outputIndex),
                        explanation: xorResult.explanation
                    });
                    currentTerms = xorResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue;
                }

                const complexFactorResult = processFactoringWithComplexTerms(currentTerms);
                if (complexFactorResult.changed) {
                    currentSimplificationSteps.push({
                        title: `Passo ${stepCounter++}: Fatoração (Termo Complexo)`,
                        termsWithMeta: complexFactorResult.newTerms,
                        plainExpression: formatExpressionFromTerms(complexFactorResult.newTerms, outputIndex),
                        explanation: complexFactorResult.explanation
                    });
                    currentTerms = complexFactorResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue;
                }

                const compoundResult = processOneCompoundStep(currentTerms);
                if (compoundResult.changed) {
                    currentSimplificationSteps.push({
                        title: `Passo ${stepCounter++}: Simplificação (Associativa)`,
                        termsWithMeta: compoundResult.newTerms,
                        plainExpression: formatExpressionFromTerms(compoundResult.newTerms, outputIndex),
                        explanation: compoundResult.explanation
                    });
                    currentTerms = compoundResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue;
                }

                if (!somethingChangedThisCycle) {
                    changedInLoop = false;
                }
            }

            let finalDisplayTerms = [...currentTerms];

            const needsXnorConversion = currentTerms.some(t => t.term.includes("⊕") && t.term.includes(")'"));

            if (needsXnorConversion) {
                finalDisplayTerms = currentTerms.map(t => ({ ...t, term: formatWithXNOR(t.term) }));

                currentSimplificationSteps.push({
                    title: `Passo ${stepCounter++}: Conversão para Notação XNOR (⊙)`,
                    termsWithMeta: [...finalDisplayTerms],
                    plainExpression: formatExpressionFromTerms(finalDisplayTerms, outputIndex),
                    explanation: "Para uma representação final mais limpa, convertemos a notação XNOR da forma (P ⊕ Q)' para a forma P ⊙ Q."
                });
            }

            expressionElement.innerHTML = `${formatNameToSubscript(outputVarNames[outputIndex])} = ${formatExpressionHTML(finalDisplayTerms, false)}`;
            btnCopyMainExpression.style.display = 'inline-flex';
            desenharGrupos(finalGroups, gridConfig, outputIndex, 'output');

            renderizarPassos(outputIndex, currentSimplificationSteps);

        } catch (e) {
            console.error(`Erro durante a simplificação para a saída ${outputIndex}:`, e);
            expressionElement.textContent = `${outputVarNames[outputIndex]} = Erro na simplificação`;
        }
    }

    function renderizarPassos(outputIndex, steps) {
        const stepsContainer = document.getElementById(`simplification-steps-container-${outputIndex}`);
        const btnCopySteps = document.getElementById(`btn-copy-steps-${outputIndex}`);

        if (steps.length === 0) {
            stepsContainer.style.display = 'none';
            btnCopySteps.style.display = 'none';
            return;
        }

        stepsContainer.innerHTML = '';
        steps.forEach((step, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'step';

            const useColors = (index === 0);
            const expressionHTML = formatExpressionHTML(step.termsWithMeta, useColors);

            stepDiv.innerHTML = `
                <div class="step-title">${step.title}</div>
                <div class="step-explanation">${step.explanation}</div>
                <div class="step-expression-container">
                    <div class="step-expression">${expressionHTML}</div>
                    <button class="copy-icon-button copy-step-btn" data-expression="${step.plainExpression}" title="Copiar Expressão do Passo">
                        <i class="bi bi-clipboard"></i>
                    </button>
                </div>
            `;
            stepsContainer.appendChild(stepDiv);
        });

        stepsContainer.style.display = 'block';
        btnCopySteps.style.display = 'inline-block';
    }

    function formatExpressionHTML(terms, useColors = true) {
        const termStrings = terms.map(meta => {
            const termText = formatNameToSubscript(meta.term.replace(/'/g, '’'));
            if (useColors && meta.color) {
                return `<span style="color: ${meta.color}; font-weight: 700;">${termText}</span>`;
            }
            return `<span style="font-weight: 500;">${termText}</span>`;
        });
        return termStrings.join(' + ');
    }

    function formatExpressionFromTerms(terms, outputIndex) {
        const termStrings = terms.map(t => t.term);
        return `${formatNameToSubscript(outputVarNames[outputIndex])} = ${termStrings.map(formatNameToSubscript).join(' + ')}`;
    }

    function gerarTabelaVerdade(newVarNames = null, newOutputNames = null) {
        const numVars = parseInt(numVariaveisInput.value);
        const numSaidas = parseInt(numSaidasInput.value);

        if (newVarNames) {
            varNames = [...newVarNames, ...['A', 'B', 'C', 'D', 'E', 'F']].slice(0, 6);
        }
        if (newOutputNames) {
            outputVarNames = [...newOutputNames];
        } else {
            const numSaidasAtual = outputVarNames.length;
            if (numSaidas > numSaidasAtual) {
                if (numSaidasAtual === 1 && numSaidas > 1) {
                    const baseName = outputVarNames[0].replace(/\d+$/, '');
                    outputVarNames[0] = `${baseName}0`;
                }
                const baseName = outputVarNames.length > 0 ? outputVarNames[0].replace(/\d+$/, '') : 'S';
                for (let i = numSaidasAtual; i < numSaidas; i++) {
                    outputVarNames.push(`${baseName}${i}`);
                }
            } else if (numSaidas < numSaidasAtual) {
                outputVarNames.length = numSaidas;
                if (outputVarNames.length === 1) {
                    outputVarNames[0] = outputVarNames[0].replace(/\d+$/, '');
                }
            }
        }

        tabelaContainer.innerHTML = "";
        const numLinhas = Math.pow(2, numVars);

        // CORREÇÃO: Adiciona a classe 'input-separator' ao último cabeçalho de variável de entrada.
        const tableHeaders = varNames.slice(0, numVars).map((v, i) => `
            <th${i === numVars - 1 ? ' class="input-separator"' : ''}>
                <span class="variable-name" data-index="${i}">${formatNameToSubscript(v)}</span>
                <i class="bi bi-pencil-square edit-icon" data-index="${i}" title="Editar nome da variável"></i>
            </th>
        `).join("");

        const outputHeaders = outputVarNames.slice(0, numSaidas).map((outputName, i) => `
            <th>
                <span class="variable-name" data-index="output-${i}">${formatNameToSubscript(outputName)}</span>
                <i class="bi bi-pencil-square edit-icon" data-index="output-${i}" title="Editar nome da variável de saída"></i>
            </th>
        `).join("");

        const table = document.createElement("table");
        table.innerHTML = `
            <thead>
                <tr>
                    <th class="row-actions"></th> <!-- Cabeçalho para a coluna de visibilidade -->
                    ${tableHeaders}
                    ${outputHeaders}
                </tr>
            </thead>
            <tbody>
                ${Array.from({ length: numLinhas }, (_, i) => `
                    <tr>
                        <td class="row-actions">
                            <i class="bi bi-eye toggle-visibility-btn" title="Ocultar/Mostrar linha"></i>
                        </td>
                        ${i.toString(2).padStart(numVars, "0").split("").map((bit, bitIndex) => `<td${bitIndex === numVars - 1 ? ' class="input-separator"' : ''}>${bit}</td>`).join("")}
                        ${Array.from({ length: numSaidas }, (_, j) => `<td class="output-cell" data-output-index="${j}" data-current-state="0">0</td>`).join("")}
                    </tr>
                `).join("")}
            </tbody>
        `;

        table.querySelectorAll(".output-cell").forEach(cell => {
            cell.addEventListener("click", () => {
                let currentStateIndex = (parseInt(cell.dataset.currentState) + 1) % estadosSaida.length;
                cell.textContent = estadosSaida[currentStateIndex];
                cell.dataset.currentState = currentStateIndex;
                cell.classList.toggle("x-value", cell.textContent === "X");
                cell.classList.toggle("one-value", cell.textContent === "1");
            });
        });

        // Event listener para os botões de visibilidade (usando delegação de evento)
        table.querySelector('tbody').addEventListener('click', (event) => {
            if (event.target.classList.contains('toggle-visibility-btn')) {
                const icon = event.target;
                const row = icon.closest('tr');
                row.classList.toggle('row-hidden');
                icon.classList.toggle('bi-eye');
                icon.classList.toggle('bi-eye-slash');
            }
        });

        table.querySelector('thead').addEventListener('click', (event) => {
            if (event.target.classList.contains('edit-icon')) {
                const indexAttr = event.target.dataset.index;
                const span = event.target.previousElementSibling;

                if (indexAttr.startsWith('output-')) {
                    const outputIndex = parseInt(indexAttr.split('-')[1]);
                    const oldName = outputVarNames[outputIndex];
                    const newName = prompt(`Editar nome da variável de saída "${oldName}":`, oldName);
                    if (newName && newName.trim() && newName.trim() !== oldName) {
                        const plainName = newName.trim().substring(0, 10);
                        // MODIFICADO: Armazena o nome simples, a formatação ocorrerá na renderização.
                        outputVarNames[outputIndex] = plainName;
                        span.innerHTML = formatNameToSubscript(plainName);
                    }
                } else {
                    const numericIndex = parseInt(indexAttr);
                    const oldName = varNames[numericIndex];
                    const newName = prompt(`Editar nome da variável "${oldName}":`, oldName);
                    if (newName && newName.trim() && newName.trim() !== oldName) {
                        const plainName = newName.trim().substring(0, 10);
                        // MODIFICADO: Armazena o nome simples, a formatação ocorrerá na renderização.
                        varNames[numericIndex] = plainName;
                        span.innerHTML = formatNameToSubscript(plainName);
                    }
                }
            }
        });

        tabelaContainer.appendChild(table);
    }

    function lerValoresTabela() {
        const numSaidas = parseInt(numSaidasInput.value);
        const outputCells = document.querySelectorAll('.output-cell');

        const outputs = [];
        for (let i = 0; i < numSaidas; i++) {
            outputs[i] = [];
        }

        outputCells.forEach((cell) => {
            const outputIndex = parseInt(cell.dataset.outputIndex);
            const value = cell.textContent;
            // CORREÇÃO: Garante que o array de saída exista antes de adicionar um valor.
            if (outputs[outputIndex]) {
                outputs[outputIndex].push(value);
            }
        });

        return outputs;
    }

    function getKmapGridConfig(numVars) {
        // CORREÇÃO: Adiciona os cabeçalhos (rowHeaders, colHeaders) ao objeto de configuração.
        const grayCode = (n) => {
            if (n === 0) return [''];
            if (n === 1) return ['0', '1'];
            const prev = grayCode(n - 1);
            const result = [];
            for (let i = 0; i < prev.length; i++) result.push('0' + prev[i]);
            for (let i = prev.length - 1; i >= 0; i--) result.push('1' + prev[i]);
            return result;
        };

        if (numVars === 2) return { rows: 2, cols: 2, numSubGrids: 1, varsLeft: [varNames[0]], varsTop: [varNames[1]], rowHeaders: ['0', '1'], colHeaders: ['0', '1'] };
        if (numVars === 3) return { rows: 2, cols: 4, numSubGrids: 1, varsLeft: [varNames[0]], varsTop: [varNames[1], varNames[2]], rowHeaders: ['0', '1'], colHeaders: ['00', '01', '11', '10'] };
        if (numVars === 4) return { rows: 4, cols: 4, numSubGrids: 1, varsLeft: [varNames[0], varNames[1]], varsTop: [varNames[2], varNames[3]], rowHeaders: ['00', '01', '11', '10'], colHeaders: ['00', '01', '11', '10'] };
        if (numVars === 5) return { rows: 4, cols: 4, numSubGrids: 2, varsSub: [varNames[0]], varsLeft: [varNames[1], varNames[2]], varsTop: [varNames[3], varNames[4]], rowHeaders: ['00', '01', '11', '10'], colHeaders: ['00', '01', '11', '10'] };
        if (numVars === 6) return { rows: 4, cols: 4, numSubGrids: 4, varsSub: [varNames[0], varNames[1]], varsLeft: [varNames[2], varNames[3]], varsTop: [varNames[4], varNames[5]], rowHeaders: ['00', '01', '11', '10'], colHeaders: ['00', '01', '11', '10'] };
        return {};
    }

    function ttIndexToKmapPos(index, numVars) { const bin = index.toString(2).padStart(numVars, "0"); const grayCode = [0, 1, 3, 2]; let row, col, grid = 0; switch (numVars) { case 2: row = parseInt(bin[0], 2); col = parseInt(bin[1], 2); break; case 3: row = parseInt(bin[0], 2); col = grayCode.indexOf(parseInt(bin.substring(1, 3), 2)); break; case 4: row = grayCode.indexOf(parseInt(bin.substring(0, 2), 2)); col = grayCode.indexOf(parseInt(bin.substring(2, 4), 2)); break; case 5: grid = parseInt(bin[0], 2); row = grayCode.indexOf(parseInt(bin.substring(1, 3), 2)); col = grayCode.indexOf(parseInt(bin.substring(3, 5), 2)); break; case 6: grid = grayCode.indexOf(parseInt(bin.substring(0, 2), 2)); row = grayCode.indexOf(parseInt(bin.substring(2, 4), 2)); col = grayCode.indexOf(parseInt(bin.substring(4, 6), 2)); break } return { grid, row, col } }
    function kmapPosToTTIndex(pos, numVars) { let bin = ""; const grayCode = [0, 1, 3, 2]; switch (numVars) { case 2: bin = `${pos.row.toString(2)}${pos.col.toString(2)}`; break; case 3: bin = `${pos.row.toString(2)}${grayCode[pos.col].toString(2).padStart(2, "0")}`; break; case 4: bin = `${grayCode[pos.row].toString(2).padStart(2, "0")}${grayCode[pos.col].toString(2).padStart(2, "0")}`; break; case 5: bin = `${pos.grid.toString(2)}${grayCode[pos.row].toString(2).padStart(2, "0")}${grayCode[pos.col].toString(2).padStart(2, "0")}`; break; case 6: bin = `${grayCode[pos.grid].toString(2).padStart(2, "0")}${grayCode[pos.row].toString(2).padStart(2, "0")}${grayCode[pos.col].toString(2).padStart(2, "0")}`; break } return parseInt(bin, 2) }
    function gerarMatrizesKmap(numVars, values) { const gridConfig = getKmapGridConfig(numVars); if (!gridConfig.rows) return { kmapMatrices: [], gridConfig: {} }; const kmapMatrices = Array.from({ length: gridConfig.numSubGrids }, () => Array(gridConfig.rows).fill(null).map(() => Array(gridConfig.cols).fill(null))); values.forEach((val, index) => { const pos = ttIndexToKmapPos(index, numVars); if (kmapMatrices[pos.grid]?.[pos.row] !== undefined) { kmapMatrices[pos.grid][pos.row][pos.col] = val } }); return { kmapMatrices, gridConfig } }
    
    function desenharMapaK(numVars, kmapMatrices, gridConfig, outputIndex, isEditable = false, targetType = 'output') {
        const kmapContainer = isEditable 
            ? document.getElementById(`input-kmap-${outputIndex}`)
            : document.getElementById(`kmap-container-${outputIndex}`);

        kmapContainer.innerHTML = "";
        if (!gridConfig.rows) return;
        const mainWrapper = document.createElement("div");
        kmapContainer.appendChild(mainWrapper);

        const buildMapGrid = (matrix, gridIndex, vars) => {
            const { varsLeft, varsTop } = vars;
            const hasSplitLeft = varsLeft.length > 1;
            const hasSplitTop = varsTop.length > 1;
            const leftHeaderCols = varsLeft.length > 0 ? 1 : 0;
            const headerRows = varsTop.length > 0 ? 1 : 0;
            const totalRows = headerRows + gridConfig.rows + (hasSplitTop ? 1 : 0);
            const totalCols = leftHeaderCols + gridConfig.cols + (hasSplitLeft ? 1 : 0);
            const mapContainer = document.createElement("div");
            mapContainer.className = "kmap-sub-grid-container";
            const kmap = document.createElement("div");
            kmap.className = "kmap";
            kmap.id = `${targetType}-kmap-grid-${outputIndex}-${gridIndex}`;
            kmap.style.display = "grid";
            kmap.style.gridTemplateRows = `repeat(${totalRows}, auto)`;
            kmap.style.gridTemplateColumns = `repeat(${totalCols}, auto)`;
            const corner = document.createElement("div");
            corner.style.gridArea = `1 / 1 / ${headerRows + 1} / ${leftHeaderCols + 1}`;
            kmap.appendChild(corner);
            if (varsTop.length > 0) {
                const mainVar = varsTop[0];
                // MODIFICADO: Aplica a formatação de subscrito.
                const labels = [`${formatNameToSubscript(mainVar)}'`, formatNameToSubscript(mainVar)];
                const colSpan = gridConfig.cols / labels.length;
                labels.forEach((label, i) => {
                    const h = document.createElement("div");
                    h.className = "kmap-header";
                    h.innerHTML = label; // Usa innerHTML para renderizar o subscrito
                    h.style.gridArea = `1 / ${leftHeaderCols + 1 + i * colSpan} / 2 / ${leftHeaderCols + 1 + (i * colSpan + colSpan)}`;
                    kmap.appendChild(h)
                })
            }
            if (hasSplitTop) {
                const subVar = varsTop[1];
                // MODIFICADO: Aplica a formatação de subscrito.
                const subLabels = [`${formatNameToSubscript(subVar)}'`, formatNameToSubscript(subVar), formatNameToSubscript(subVar), `${formatNameToSubscript(subVar)}'`];
                const bottomRowGridStart = headerRows + gridConfig.rows + 1;
                subLabels.forEach((label, i) => {
                    const h = document.createElement("div");
                    h.className = "kmap-header";
                    h.innerHTML = label; // Usa innerHTML
                    h.style.gridArea = `${bottomRowGridStart} / ${leftHeaderCols + 1 + i} / ${bottomRowGridStart + 1} / ${leftHeaderCols + 2 + i}`;
                    kmap.appendChild(h)
                })
            }
            if (varsLeft.length > 0) {
                const mainVar = varsLeft[0];
                // MODIFICADO: Aplica a formatação de subscrito.
                const labels = [`${formatNameToSubscript(mainVar)}'`, formatNameToSubscript(mainVar)];
                const rowSpan = gridConfig.rows / labels.length;
                labels.forEach((label, i) => {
                    const h = document.createElement("div");
                    h.className = "kmap-header";
                    h.innerHTML = label; // Usa innerHTML
                    h.style.gridArea = `${headerRows + 1 + i * rowSpan} / 1 / ${headerRows + 1 + (i * rowSpan + rowSpan)} / 2`;
                    kmap.appendChild(h)
                })
            }
            if (hasSplitLeft) {
                const subVar = varsLeft[1];
                // MODIFICADO: Aplica a formatação de subscrito.
                const subLabels = [`${formatNameToSubscript(subVar)}'`, formatNameToSubscript(subVar), formatNameToSubscript(subVar), `${formatNameToSubscript(subVar)}'`];
                const rightHeaderColStart = leftHeaderCols + gridConfig.cols + 1;
                subLabels.forEach((label, r) => {
                    const h = document.createElement("div");
                    h.className = "kmap-header";
                    h.innerHTML = label; // Usa innerHTML
                    h.style.gridArea = `${headerRows + 1 + r} / ${rightHeaderColStart} / ${headerRows + 2 + r} / ${rightHeaderColStart + 1}`;
                    kmap.appendChild(h)
                })
            }
            matrix.forEach((rowData, r) => {
                rowData.forEach((cellData, c) => {
                    const cell = document.createElement("div");
                    cell.className = "kmap-cell";
                    if (cellData === "X") cell.classList.add("x-value");
                    if (cellData === "1") cell.classList.add("one-value");
                    cell.textContent = cellData;
                    cell.style.gridArea = `${headerRows + 1 + r} / ${leftHeaderCols + 1 + c} / ${headerRows + 2 + r} / ${leftHeaderCols + 2 + c}`;
                    if(isEditable){
                        cell.classList.add("editable-cell");
                        const currentR=r; const currentC=c; const currentGrid=gridIndex;
                        cell.addEventListener('click', ()=>{toggleCellValue(cell, currentR, currentC, currentGrid, numVars, outputIndex);});
                    }
                    kmap.appendChild(cell)
                })
            });
            mapContainer.appendChild(kmap);
            return mapContainer
        };

        if (numVars <= 4) {
            mainWrapper.appendChild(buildMapGrid(kmapMatrices[0], 0, gridConfig))
        } else if (numVars === 5) {
            const divA0 = document.createElement("div");
            const divA1 = document.createElement("div");
            const header0 = document.createElement("div");
            header0.className = "kmap-header";
            // MODIFICADO: Aplica a formatação de subscrito.
            header0.innerHTML = `${formatNameToSubscript(gridConfig.varsSub[0])}'`;
            divA0.appendChild(header0);
            const header1 = document.createElement("div");
            header1.className = "kmap-header";
            // MODIFICADO: Aplica a formatação de subscrito.
            header1.innerHTML = `${formatNameToSubscript(gridConfig.varsSub[0])}`;
            divA1.appendChild(header1);
            divA0.appendChild(buildMapGrid(kmapMatrices[0], 0, { varsLeft: gridConfig.varsLeft, varsTop: gridConfig.varsTop }));
            divA1.appendChild(buildMapGrid(kmapMatrices[1], 1, { varsLeft: gridConfig.varsLeft, varsTop: gridConfig.varsTop }));
            mainWrapper.append(divA0, divA1)
        } else if (numVars === 6) {
            mainWrapper.style.display = "grid";
            mainWrapper.style.gridTemplateColumns = "auto auto auto";
            mainWrapper.style.gridTemplateRows = "auto auto auto";
            mainWrapper.style.gap = "5px 15px";
            mainWrapper.style.alignItems = "center";
            mainWrapper.style.justifyItems = "center";
            const mainGridVarV = gridConfig.varsSub[0];
            const mainGridVarH = gridConfig.varsSub[1];
            const corner = document.createElement("div");
            corner.style.gridArea = "1 / 1";
            mainWrapper.appendChild(corner);
            // MODIFICADO: Aplica a formatação de subscrito.
            const topLabels = [`${formatNameToSubscript(mainGridVarH)}'`, formatNameToSubscript(mainGridVarH)];
            topLabels.forEach((label, i) => {
                const h = document.createElement("div");
                h.className = "kmap-header";
                h.innerHTML = label; // Usa innerHTML
                h.style.gridArea = `1 / ${2 + i}`;
                mainWrapper.appendChild(h)
            });
            // MODIFICADO: Aplica a formatação de subscrito.
            const leftLabels = [`${formatNameToSubscript(mainGridVarV)}'`, formatNameToSubscript(mainGridVarV)];
            leftLabels.forEach((label, i) => {
                const h = document.createElement("div");
                h.className = "kmap-header";
                h.innerHTML = label; // Usa innerHTML
                h.style.padding = "10px";
                h.style.gridArea = `${2 + i} / 1`;
                mainWrapper.appendChild(h)
            });
            const placement = { "0": "2 / 2", "1": "2 / 3", "3": "3 / 2", "2": "3 / 3" };
            kmapMatrices.forEach((matrix, index) => {
                const map = buildMapGrid(matrix, index, { varsLeft: gridConfig.varsLeft, varsTop: gridConfig.varsTop });
                map.style.gridArea = placement[index];
                mainWrapper.appendChild(map)
            })
        }
    }
    
    function desenharGrupos(groups, gridConfig, outputIndex, targetType = 'output') {
        // Limpa apenas os agrupamentos do mapa alvo (input ou output)
        const gridPrefix = `${targetType}-kmap-grid-${outputIndex}-`;
        document.querySelectorAll(`[id^="${gridPrefix}"]`).forEach(grid => {
            grid.querySelectorAll('.kmap-group').forEach(el => el.remove());
        });

        const { rows, cols } = gridConfig;
        const BORDER_WIDTH = 3;

        const drawRect = (rect, color, groupIndex) => {
            const kmapGrid = document.getElementById(`${targetType}-kmap-grid-${outputIndex}-${rect.grid}`);
            if (!kmapGrid) return;

            const numVariaveis = parseInt(numVariaveisInput.value);
            const subGridConfig = numVariaveis <= 4 ?
                gridConfig :
                { varsLeft: gridConfig.varsLeft, varsTop: gridConfig.varsTop };

            const leftHeaderCols = subGridConfig.varsLeft.length > 0 ? 1 : 0;
            const topHeaderRows = subGridConfig.varsTop.length > 0 ? 1 : 0;

            const groupDiv = document.createElement("div");
            groupDiv.className = "kmap-group";
            groupDiv.style.borderColor = color;
            if (groupIndex > 5) {
                groupIndex = 1;
            }
            groupDiv.style.margin = `${groupIndex * BORDER_WIDTH}px`
            groupDiv.style.borderWidth = `${BORDER_WIDTH}px`;
            groupDiv.style.gridArea = `${topHeaderRows + rect.r + 1} / ${leftHeaderCols + rect.c + 1} / ${topHeaderRows + rect.r + 1 + rect.h} / ${leftHeaderCols + rect.c + 1 + rect.w}`;
            kmapGrid.appendChild(groupDiv);
        };

        groups.forEach((group, i) => {
            const color = GROUP_COLORS[i % GROUP_COLORS.length];
            const numVars = parseInt(numVariaveisInput.value);

            const groupPos = group.map(ttIndex => ttIndexToKmapPos(ttIndex, numVars));

            const groupCellsByGrid = {};
            groupPos.forEach(pos => {
                if (!groupCellsByGrid[pos.grid]) groupCellsByGrid[pos.grid] = [];
                groupCellsByGrid[pos.grid].push(pos);
            });

            for (const grid in groupCellsByGrid) {
                const cellsInGrid = groupCellsByGrid[grid];
                const maxRow = rows;
                const maxCol = cols;
                const rectangles = findRectanglesForDrawing(cellsInGrid, maxRow, maxCol);
                rectangles.forEach(rect => {
                    drawRect({ ...rect, grid: parseInt(grid) }, color, i);
                });
            }
        });
    }

    function findRectanglesForDrawing(cells, maxRow, maxCol) {
        if (cells.length === 0) return [];
        const visited = new Set();
        const rectangles = [];
        const cellSet = new Set(cells.map(c => `${c.row}-${c.col}`));
        cells.sort((a, b) => a.row - b.row || a.col - b.col);
        cells.forEach(startCell => {
            const key = `${startCell.row}-${startCell.col}`;
            if (visited.has(key)) return;
            const possibleSizes = [{ w: 4, h: 4 }, { w: 4, h: 2 }, { w: 2, h: 4 }, { w: 4, h: 1 }, { w: 1, h: 4 }, { w: 2, h: 2 }, { w: 2, h: 1 }, { w: 1, h: 2 }, { w: 1, h: 1 }];
            for (const size of possibleSizes) {
                if (canFormRectangle(startCell, size, cellSet, maxRow, maxCol, visited)) {
                    const rect = createRectangle(startCell, size, maxRow, maxCol, visited);
                    rectangles.push(...rect);
                    break
                }
            }
        });
        return rectangles
    }
    function canFormRectangle(startCell, size, cellSet, maxRow, maxCol, visited) {
        for (let r = 0; r < size.h; r++) {
            for (let c = 0; c < size.w; c++) {
                const row = (startCell.row + r) % maxRow;
                const col = (startCell.col + c) % maxCol;
                if (!cellSet.has(`${row}-${col}`) || visited.has(`${row}-${col}`)) return false
            }
        }
        return true
    }
    function createRectangle(startCell, size, maxRow, maxCol, visited) {
        const rectangles = [];
        for (let r = 0; r < size.h; r++) {
            for (let c = 0; c < size.w; c++) visited.add(`${(startCell.row+r)%maxRow}-${(startCell.col+c)%maxCol}`)
        }
        if (startCell.col + size.w > maxCol) {
            const w1 = maxCol - startCell.col;
            const w2 = size.w - w1;
            rectangles.push({ r: startCell.row, c: startCell.col, w: w1, h: size.h });
            rectangles.push({ r: startCell.row, c: 0, w: w2, h: size.h })
        } else if (startCell.row + size.h > maxRow) {
            const h1 = maxRow - startCell.row;
            const h2 = size.h - h1;
            rectangles.push({ r: startCell.row, c: startCell.col, w: size.w, h: h1 });
            rectangles.push({ r: 0, c: startCell.col, w: size.w, h: h2 })
        } else {
            rectangles.push({ r: startCell.row, c: startCell.col, w: size.w, h: size.h })
        }
        return rectangles
    }
    function simplificar(numVars, matrices) {
        const minterms = [];
        const dontCares = [];
        matrices.forEach((matrix, grid) => {
            matrix.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val === '1' || val === 'X') {
                        const ttIndex = kmapPosToTTIndex({ grid, row: r, col: c }, numVars);
                        if (val === '1') {
                            minterms.push(ttIndex);
                        } else {
                            dontCares.push(ttIndex);
                        }
                    }
                });
            });
        });

        if (minterms.length === 0) return { finalGroups: [], expression: "0" };
        if (minterms.length + dontCares.length === Math.pow(2, numVars)) return { finalGroups: [], expression: "1" };

        const primeImplicants = findPrimeImplicants(numVars, [...minterms, ...dontCares]);
        const minimalCover = selectMinimalCover(primeImplicants, minterms);

        const finalExpression = minimalCover.map(term => getTermForGroup(numVars, term.implicant)).join(' + ');
        return { finalGroups: minimalCover.map(c => c.implicant), expression: finalExpression };
    }
    function findPrimeImplicants(numVars, terms) {
        if (terms.length === 0) return [];

        let currentLevel = new Map();
        terms.forEach(term => {
            const binary = term.toString(2).padStart(numVars, '0');
            currentLevel.set(binary, { term: binary, combined: false, originalTerms: [term] });
        });

        const allImplicants = new Map(currentLevel);

        while (currentLevel.size > 0) {
            const nextLevel = new Map();
            const currentItems = Array.from(currentLevel.values());

            for (let i = 0; i < currentItems.length; i++) {
                for (let j = i + 1; j < currentItems.length; j++) {
                    const item1 = currentItems[i];
                    const item2 = currentItems[j];

                    if (canCombineItems(item1.term, item2.term)) {
                        const combinedTerm = combineItems(item1.term, item2.term);
                        if (!nextLevel.has(combinedTerm)) {
                            const originalTerms = [...new Set([...item1.originalTerms, ...item2.originalTerms])];
                            nextLevel.set(combinedTerm, { term: combinedTerm, combined: false, originalTerms });
                        }
                        item1.combined = true;
                        item2.combined = true;
                    }
                }
            }

            currentLevel.forEach((value, key) => {
                if (!allImplicants.has(key) || allImplicants.get(key).originalTerms.length < value.originalTerms.length) {
                    allImplicants.set(key, value);
                }
            });

            currentLevel = nextLevel;
        }

        const primeImplicants = [];
        allImplicants.forEach((value, key) => {
            if (!value.combined) {
                primeImplicants.push(value.originalTerms);
            }
        });

        return primeImplicants;
    }

    function canCombineItems(item1, item2) {
        let diff = 0;
        for (let i = 0; i < item1.length; i++) {
            if (item1[i] !== item2[i]) {
                diff++;
            }
        }
        return diff === 1;
    }
    function combineItems(item1, item2) {
        let result = "";
        for (let i = 0; i < item1.length; i++) {
            result += (item1[i] === item2[i]) ? item1[i] : '-';
        }
        return result;
    }
    function expandImplicant(item, numVars) {
        const expanded = [];
        const floatingCount = (item.match(/-/g) || []).length;
        for (let i = 0; i < Math.pow(2, floatingCount); i++) {
            let tempBin = i.toString(2).padStart(floatingCount, '0');
            let tempItem = item;
            for (let j = 0; j < floatingCount; j++) {
                tempItem = tempItem.replace('-', tempBin[j]);
            }
            expanded.push(parseInt(tempItem, 2));
        }
        return expanded;
    }
    function selectMinimalCover(primeImplicants, minterms) {
        if (minterms.length === 0) return [];

        const mintermSet = new Set(minterms);
        const chart = new Map(minterms.map(m => [m, []]));

        const implicantObjects = primeImplicants.map((imp, index) => {
            const term = getTermForGroup(varNames.length, imp); // Use varNames.length for numVars
            const covers = new Set(imp.filter(m => mintermSet.has(m)));
            
            covers.forEach(m => {
                if (chart.has(m)) {
                    chart.get(m).push(index);
                }
            });

            return {
                id: index,
                implicant: imp,
                covers: covers,
                cost: (term.match(/[A-Z]/gi) || []).length, // Custo é o número de literais
                isEssential: false
            };
        });

        const cover = [];
        const coveredMinterms = new Set();

        // 1. Encontrar e adicionar implicantes essenciais
        chart.forEach((implicantIndices, minterm) => {
            if (implicantIndices.length === 1) {
                const essentialImplicant = implicantObjects[implicantIndices[0]];
                if (!essentialImplicant.isEssential) {
                    essentialImplicant.isEssential = true;
                    cover.push(essentialImplicant);
                    essentialImplicant.covers.forEach(m => coveredMinterms.add(m));
                }
            }
        });

        let uncoveredMinterms = new Set([...mintermSet].filter(m => !coveredMinterms.has(m)));

        // 2. Cobrir minterms restantes com uma abordagem gulosa (heurística)
        while (uncoveredMinterms.size > 0) {
            const remainingImplicants = implicantObjects.filter(impObj => !impObj.isEssential);
            
            let bestImplicant = null;
            let maxCovered = -1;
            let minCost = Infinity;

            remainingImplicants.forEach(impObj => {
                const newlyCovered = new Set([...impObj.covers].filter(m => uncoveredMinterms.has(m)));
                
                if (newlyCovered.size > 0) {
                    if (newlyCovered.size > maxCovered) {
                        maxCovered = newlyCovered.size;
                        minCost = impObj.cost;
                        bestImplicant = impObj;
                    } else if (newlyCovered.size === maxCovered) {
                        if (impObj.cost < minCost) {
                            minCost = impObj.cost;
                            bestImplicant = impObj;
                        }
                    }
                }
            });

            if (bestImplicant) {
                cover.push(bestImplicant);
                bestImplicant.isEssential = true; // Marcar como usado
                bestImplicant.covers.forEach(m => coveredMinterms.add(m));
                uncoveredMinterms = new Set([...mintermSet].filter(m => !coveredMinterms.has(m)));
            } else {
                // Se não houver mais implicantes para cobrir, saia do loop
                break;
            }
        }
        return cover;
    }


    function getTermForGroup(numVars, group) {
        if (!group || group.length === 0) return "";
        if (group.length === Math.pow(2, numVars)) return "1";
        
        let term = "";
        const binaries = group.map(g => g.toString(2).padStart(numVars, "0"));
        
        for (let i = 0; i < numVars; i++) {
            const firstBit = binaries[0][i];
            if (binaries.every(b => b[i] === firstBit)) {
                term += varNames[i];
                if (firstBit === "0") term += "'";
            }
        }
        
        // Ordena as variáveis alfabeticamente para consistência (ex: A'B em vez de BA')
        const sortedVars = [...varNames].sort((a, b) => b.length - a.length);
        const termParts = term.match(new RegExp(`(${sortedVars.join('|')})'?`, 'g'));
        if (!termParts) return "";

        return termParts.sort((a, b) => varNames.indexOf(a.replace("'", "")) - varNames.indexOf(b.replace("'", ""))).join("");
    }

    function processOneXorStep(termsWithMeta) {
        const parseTerm = (termStr) => {
            const vars = {};
            if (termStr === '1') return vars;
            const sortedVars = [...varNames].sort((a, b) => b.length - a.length);
            const parts = termStr.match(new RegExp(`(${sortedVars.join('|')})'?`, 'g')) || [];
            parts.forEach(part => {
                const varName = part.replace("'", "");
                vars[varName] = !part.includes("'");
            });
            return vars;
        };

        const formatPrefix = (prefixVars) => {
            let term = '';
            Object.keys(prefixVars).sort().forEach(v => {
                term += v;
                if (!prefixVars[v]) term += "'";
            });
            return term;
        };

        const originalTerms = [...termsWithMeta];
        
        for (let i = 0; i < originalTerms.length; i++) {
            for (let j = i + 1; j < originalTerms.length; j++) {
                const term1 = originalTerms[i];
                const term2 = originalTerms[j];

                if (term1.term.includes('(') || term2.term.includes(')')) continue;

                const parsed1 = parseTerm(term1.term);
                const parsed2 = parseTerm(term2.term);
                const allVars = new Set([...Object.keys(parsed1), ...Object.keys(parsed2)]);
                
                if (Object.keys(parsed1).length !== allVars.size || Object.keys(parsed2).length !== allVars.size) {
                    continue;
                }

                const prefixVars = {};
                const diffVars = [];

                allVars.forEach(v => {
                    if (parsed1[v] === parsed2[v]) {
                        prefixVars[v] = parsed1[v];
                    } else {
                        diffVars.push(v);
                    }
                });

                if (diffVars.length !== 2) continue;
                
                const [v1, v2] = diffVars.sort();

                if (parsed1[v1] === parsed2[v1] || parsed1[v2] === parsed2[v2]) continue;
                
                const isXnor = (parsed1[v1] === parsed1[v2]);
                const prefixStr = formatPrefix(prefixVars);
                let newTermStr = isXnor ? `(${v1} ⊕ ${v2})'` : `(${v1} ⊕ ${v2})`;
                if (prefixStr) newTermStr = `${prefixStr}${newTermStr}`;

                const newTerms = [...originalTerms];
                newTerms.splice(j, 1);
                newTerms.splice(i, 1, { term: newTermStr, color: term1.color });

                const explanation = `Os termos <strong>${term1.term}</strong> e <strong>${term2.term}</strong> foram combinados para formar o termo ${isXnor ? "XNOR" : "XOR"} <strong>${newTermStr}</strong>.`;
                
                return { newTerms, changed: true, explanation };
            }
        }

        return { changed: false };
    }
    
    function processOneCompoundStep(termsWithMeta) {
        const parseCompoundTerm = (termStr) => {
            const match = termStr.match(/^(.*?)\((.*)\)('?)$/);
            if (match) {
                const innerPart = match[2];
                if (!innerPart.includes('⊕')) return { prefixStr: termStr, xorPart: null, isXnor: false };
                return {
                    prefixStr: match[1] || '',
                    xorPart: innerPart,
                    isXnor: match[3] === "'"
                };
            }
            return { prefixStr: termStr, xorPart: null, isXnor: false };
        };
        const parseTerm = (termStr) => {
            const vars = {};
            if (termStr === '1' || termStr === '') return vars;
            const sortedVars = [...varNames].sort((a, b) => b.length - a.length);
            const parts = termStr.match(new RegExp(`(${sortedVars.join('|')})'?`, 'g')) || [];
            parts.forEach(part => {
                const varName = part.replace("'", "");
                vars[varName] = !part.includes("'");
            });
            return vars;
        };
        const formatPrefix = (prefixVars) => {
            let term = '';
            Object.keys(prefixVars).sort().forEach(v => {
                term += v;
                if (!prefixVars[v]) term += "'";
            });
            return term;
        };
        const checkPrefixInverse = (p1_vars, p2_vars) => {
            const p1_keys = Object.keys(p1_vars);
            const p2_keys = Object.keys(p2_vars);
    
            if (p1_keys.length !== p2_keys.length) return { isInverse: false };
            const allVars = new Set([...p1_keys, ...p2_keys]);
            if (allVars.size !== p1_keys.length) return { isInverse: false };
    
            const commonPrefix = {};
            const diffVars = [];
    
            for (const v of allVars) {
                if (p1_vars[v] === p2_vars[v]) {
                    commonPrefix[v] = p1_vars[v];
                } else {
                    diffVars.push(v);
                }
            }
    
            if (diffVars.length === 1) {
                return { isInverse: true, diffVar: diffVars[0], commonPrefix };
            }
    
            return { isInverse: false };
        };

        const currentTerms = [...termsWithMeta];
        for (let i = 0; i < currentTerms.length; i++) {
            for (let j = i + 1; j < currentTerms.length; j++) {
                const term1 = currentTerms[i];
                const term2 = currentTerms[j];
                const parsed1 = parseCompoundTerm(term1.term);
                const parsed2 = parseCompoundTerm(term2.term);

                if (parsed1.xorPart && parsed2.xorPart && parsed1.xorPart === parsed2.xorPart && parsed1.isXnor !== parsed2.isXnor) {
                    const prefix1 = parseTerm(parsed1.prefixStr);
                    const prefix2 = parseTerm(parsed2.prefixStr);
                    const { isInverse, diffVar, commonPrefix } = checkPrefixInverse(prefix1, prefix2);

                    if (isInverse) {
                        const commonPrefixStr = formatPrefix(commonPrefix);
                        const pIsNegatedInTerm1 = !prefix1[diffVar];
                        const qIsXnorInTerm1 = parsed1.isXnor;
                        const finalIsXnor = (pIsNegatedInTerm1 === qIsXnorInTerm1);
                        
                        const pTerm = diffVar;
                        const sortedVars = [...varNames].sort((a, b) => b.length - a.length);
                        const qVars = parsed1.xorPart.match(new RegExp(`(${sortedVars.join('|')})`, 'g')) || [];
                        
                        const allXorVars = [pTerm, ...qVars].sort((a,b) => a.localeCompare(b));

                        let newTermStr = `(${allXorVars.join(' ⊕ ')})`;

                        if (finalIsXnor) {
                           newTermStr += "'";
                        }

                        if (commonPrefixStr) newTermStr = `${commonPrefixStr}${newTermStr}`;

                        const newTermsList = [...currentTerms];
                        newTermsList.splice(j, 1);
                        newTermsList.splice(i, 1, { term: newTermStr, color: term1.color });

                        const explanation = `Analisando os termos <strong>${term1.term}</strong> e <strong>${term2.term}</strong>, reconhecemos o padrão <code>${finalIsXnor ? "P'Q' + PQ" : "P'Q + PQ'"}</code>. Isso simplifica para uma única porta ${finalIsXnor ? "XNOR" : "XOR"}, resultando em <strong>${newTermStr}</strong>.`;
                        return { newTerms: newTermsList, changed: true, explanation };
                    }
                }
            }
        }
        return { changed: false };
    }
    
    function processOneFactoringStep(termsWithMeta) {
        const simpleTerms = termsWithMeta.filter(t => !t.term.includes('⊕') && !t.term.includes('('));
        const complexTerms = termsWithMeta.filter(t => t.term.includes('⊕') || t.term.includes('('));

        if (simpleTerms.length < 2) return { changed: false };
        
        const potentialFactors = generatePotentialFactors(simpleTerms);
        if (potentialFactors.length === 0) return { changed: false };

        const bestFactor = potentialFactors[0];
        if (bestFactor.score <= 0) return { changed: false };
        
        const groupTermObjs = bestFactor.group;
        const groupTermStrs = groupTermObjs.map(t => t.term);
        const groupTermSet = new Set(groupTermStrs);
        const leftoverTerms = simpleTerms.filter(t => !groupTermSet.has(t.term));
        
        const remainders = groupTermObjs.map(termObj => {
            const sortedVars = [...varNames].sort((a, b) => b.length - a.length);
            const regex = new RegExp(`(${sortedVars.join('|')})'?`, 'g');
            const termLiterals = new Set(termObj.term.match(regex) || []);
            const prefixLiterals = new Set(bestFactor.prefix.match(regex) || []);
            const remainderLiterals = [...termLiterals].filter(lit => !prefixLiterals.has(lit));
            return {
                term: remainderLiterals.length > 0 ? remainderLiterals.sort().join('') : '1',
                color: termObj.color
            };
        });

        const initialRemaindersStr = remainders.map(r => r.term).join(' + ');
        const simplifiedRemainders = runInnerSimplification(remainders);
        const simplifiedRemaindersStr = simplifiedRemainders.map(t => t.term).join(' + ');
        
        let newFactoredTermStr;
        const isSingleComplexTerm = simplifiedRemainders.length === 1 && simplifiedRemaindersStr.startsWith('(') && (simplifiedRemaindersStr.endsWith(')') || simplifiedRemaindersStr.endsWith(")'"));

        if (isSingleComplexTerm) {
            newFactoredTermStr = `${bestFactor.prefix}${simplifiedRemaindersStr}`;
        } else {
            newFactoredTermStr = `${bestFactor.prefix}(${simplifiedRemaindersStr})`;
        }
        
        const newFactoredTerm = { term: newFactoredTermStr, color: groupTermObjs[0].color };
        const finalTerms = [newFactoredTerm, ...leftoverTerms, ...complexTerms];

        let explanation = `O fator comum <strong>${bestFactor.prefix}</strong> foi colocado em evidência nos termos <strong>${groupTermStrs.join(', ')}</strong>.`;
        if (initialRemaindersStr !== simplifiedRemaindersStr) {
            explanation += ` A expressão interna resultante <strong>${initialRemaindersStr}</strong> foi subsequentemente simplificada para <strong>${simplifiedRemaindersStr}</strong>.`;
        }

        return { newTerms: finalTerms, changed: true, explanation };
    }

    /**
     * NOVO: Processa a fatoração quando o fator comum é um termo complexo (entre parênteses).
     * Exemplo: AC(B⊙D) + A'C'(B⊙D) => (A⊙C)(B⊙D)
     * @param {Array} termsWithMeta - A lista atual de termos com seus metadados.
     * @returns {Object} - Um objeto indicando se a simplificação ocorreu e a nova lista de termos.
     */
    function processFactoringWithComplexTerms(termsWithMeta) {
        const parseTermStructure = (termStr) => {
            // Regex para capturar um prefixo e uma parte complexa em parênteses.
            const match = termStr.match(/^(.*?)\((.*)\)('?)$/);
            if (match) {
                // O que vem antes dos parênteses é o prefixo.
                const prefix = match[1] || ''; 
                // O que está dentro dos parênteses, incluindo a negação final se houver.
                const complexPart = `(${match[2]})${match[3]}`;
                return { prefix, complexPart };
            }
            return { prefix: termStr, complexPart: null };
        };

        for (let i = 0; i < termsWithMeta.length; i++) {
            for (let j = i + 1; j < termsWithMeta.length; j++) {
                const term1 = termsWithMeta[i];
                const term2 = termsWithMeta[j];

                const struct1 = parseTermStructure(term1.term);
                const struct2 = parseTermStructure(term2.term);

                // Continua apenas se ambos os termos tiverem uma parte complexa e se essas partes forem idênticas.
                if (struct1.complexPart && struct1.complexPart === struct2.complexPart) {
                    
                    // Os prefixos que serão somados e simplificados.
                    const prefixesToSimplify = [
                        { term: struct1.prefix || '1', color: term1.color },
                        { term: struct2.prefix || '1', color: term2.color }
                    ];

                    // Usa a lógica de simplificação interna que já criamos.
                    const simplifiedPrefixTerms = runInnerSimplification(prefixesToSimplify);
                    
                    // Combina o prefixo simplificado com a parte complexa comum.
                    const simplifiedPrefixStr = simplifiedPrefixTerms.map(t => t.term).join(' + ');

                    // Formata o novo termo final.
                    let newTermStr;
                    if (simplifiedPrefixTerms.length === 1) {
                         // Se o prefixo simplificado já for complexo, não adiciona parênteses extras.
                        if (simplifiedPrefixStr.startsWith('(') && (simplifiedPrefixStr.endsWith(')') || simplifiedPrefixStr.endsWith(")'"))) {
                            newTermStr = `${simplifiedPrefixStr}${struct1.complexPart}`;
                        } else {
                            newTermStr = `(${simplifiedPrefixStr})${struct1.complexPart}`;
                        }
                    } else {
                        newTermStr = `(${simplifiedPrefixStr})${struct1.complexPart}`;
                    }
                    
                    // Cria a nova lista de termos, substituindo os dois termos antigos pelo novo.
                    const newTermsList = [...termsWithMeta];
                    newTermsList.splice(j, 1); // Remove o segundo termo primeiro para não bagunçar o índice.
                    newTermsList.splice(i, 1, { term: newTermStr, color: term1.color });

                    const explanation = `O fator comum <strong>${struct1.complexPart}</strong> foi colocado em evidência nos termos <strong>${term1.term}</strong> e <strong>${term2.term}</strong>. A expressão dos prefixos <strong>${struct1.prefix} + ${struct2.prefix}</strong> foi simplificada para <strong>${simplifiedPrefixStr}</strong>.`;

                    return { newTerms: newTermsList, changed: true, explanation };
                }
            }
        }
        return { changed: false };
    }

    function runInnerSimplification(terms) {
        let currentTerms = [...terms];
        let changed = true;
        while(changed) {
            let changedThisCycle = false;
            
            const factorResult = processOneFactoringStep(currentTerms);
            if (factorResult.changed) {
                currentTerms = factorResult.newTerms;
                changedThisCycle = true;
                continue;
            }

            const xorResult = processOneXorStep(currentTerms);
            if (xorResult.changed) {
                currentTerms = xorResult.newTerms;
                changedThisCycle = true;
                continue;
            }

            const compoundResult = processOneCompoundStep(currentTerms);
            if (compoundResult.changed) {
                currentTerms = compoundResult.newTerms;
                changedThisCycle = true;
                continue;
            }

            if(!changedThisCycle) {
                changed = false;
            }
        }
        return currentTerms;
    }

    function generatePotentialFactors(terms) {
        const sortedVars = [...varNames].sort((a, b) => b.length - a.length);
        const regex = new RegExp(`(${sortedVars.join('|')})`, 'g');
        const countLiterals = (str) => (str.match(regex) || []).length;

        const prefixMap = new Map();
        terms.forEach(termObj => {
            const prefixes = getPrefixes(termObj.term);
            prefixes.forEach(p => {
                if (!prefixMap.has(p)) prefixMap.set(p, []);
                prefixMap.get(p).push(termObj);
            });
        });
        
        const potentialFactors = [];
        prefixMap.forEach((group, prefix) => {
            if (group.length > 1) {
                const score = (group.length - 1) * countLiterals(prefix);
                potentialFactors.push({ prefix, group, score });
            }
        });

        return potentialFactors.sort((a, b) => b.score - a.score);
    }

    function getPrefixes(term) {
        const sortedVars = [...varNames].sort((a, b) => b.length - a.length);
        const regex = new RegExp(`(${sortedVars.join('|')})'?`, 'g');
        const literals = term.match(regex) || [];
        if (literals.length === 0) return [];

        const prefixes = new Set();
        const n = literals.length;
        // Gera todas as combinações não vazias de literais
        for (let i = 1; i < (1 << n); i++) {
            const subset = [];
            for (let j = 0; j < n; j++) {
                if ((i >> j) & 1) {
                    subset.push(literals[j]);
                }
            }
            // Ordena para garantir que 'AB' e 'BA' sejam tratados como o mesmo prefixo
            prefixes.add(subset.sort().join(''));
        }
        return Array.from(prefixes);
    }

    /**
     * MODIFICADO: Formata TODAS as ocorrências de (P ⊕ Q)' para a notação XNOR (P ⊙ Q).
     * @param {string} termStr - A string do termo a ser formatada.
     * @returns {string} - A string com todas as notações XNOR convertidas.
     */
    function formatWithXNOR(termStr) {
        // A regex agora procura por um padrão: parênteses, contendo algo, um '⊕', algo de novo, e fechando com ")'".
        // O 'g' garante que TODAS as ocorrências sejam substituídas, não apenas a primeira.
        return termStr.replace(/\((.*?)\s?⊕\s?(.*?)\)'/g, '($1 ⊙ $2)');
    }


    function showCopyFeedback(button, isIconButton, originalText = "Copiar") {
        const originalContent = button.innerHTML;
        const originalTitle = button.title;

        if (isIconButton) {
            button.innerHTML = '<i class="bi bi-check-lg"></i>';
            button.title = "Copiado!";
        } else {
            button.textContent = "Copiado!";
        }
        
        button.disabled = true;
        
        setTimeout(() => {
            if (isIconButton) {
                button.innerHTML = originalContent;
                button.title = originalTitle;
            } else {
                button.textContent = originalText;
            }
            button.disabled = false;
        }, 1500);
    }

    btnIncrement.addEventListener('click', () => {
        numVariaveisInput.value = Math.min(parseInt(numVariaveisInput.value) + 1, 6);
        updateInputMode(); // Usar updateInputMode em vez de gerarTabelaVerdade
    });
    btnDecrement.addEventListener('click', () => {
        numVariaveisInput.value = Math.max(parseInt(numVariaveisInput.value) - 1, 2);
        updateInputMode(); // Usar updateInputMode em vez de gerarTabelaVerdade
    });

    btnIncrementSaidas.addEventListener('click', () => {
        numSaidasInput.value = Math.min(parseInt(numSaidasInput.value) + 1, 8);
        updateInputMode(); // Usar updateInputMode em vez de gerarTabelaVerdade
    });
    btnDecrementSaidas.addEventListener('click', () => {
        numSaidasInput.value = Math.max(parseInt(numSaidasInput.value) - 1, 1);
        updateInputMode(); // Usar updateInputMode em vez de gerarTabelaVerdade
    });
    btnVoltar.addEventListener('click', () => switchView(mainView));

    outputsContainer.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        const id = button.id;
        // Tenta obter o índice da saída a partir do cabeçalho da seção, que é mais robusto.
        const outputSection = button.closest('.output-section');
        if (!outputSection) return; // Sai se o botão não estiver dentro de uma seção de saída

        const header = outputSection.querySelector('.output-header h2');
        // Extrai o nome da variável do cabeçalho para encontrar seu índice
        const outputName = header.textContent.replace('Resultados para: ', '').trim();
        const outputIndex = outputVarNames.findIndex(name => name === outputName);

        if (outputIndex === -1) {
            console.error("Não foi possível encontrar o índice da saída para o botão:", button);
            return;
        }


        if (id.startsWith('btn-copy-main-expression-')) {
            const expression = document.getElementById(`simplified-expression-${outputIndex}`);
            navigator.clipboard.writeText(expression.textContent).then(() => {
                showCopyFeedback(button, true);
            }).catch(err => console.error('Falha ao copiar expressão:', err));

        } else if (id.startsWith('btn-copiar-mapa-')) {
            copiarMapaDeSaidaComoImagem(outputIndex, button);
        } else if (id.startsWith('btn-copiar-tabela-')) {
            copiarTabelaDeSaidaComoImagem(outputIndex, button);
        }
    });

    btnCopiarTabela.addEventListener('click', () => {
        const table = tabelaContainer.querySelector('table');
        if (!table) return;
        
        const originalText = btnCopiarTabela.textContent;
        btnCopiarTabela.disabled = true;

        // CORREÇÃO: Clonar a tabela para remover linhas e colunas indesejadas antes de copiar
        const tableClone = table.cloneNode(true);
        tableClone.querySelectorAll('.row-hidden').forEach(row => row.remove());
        tableClone.querySelectorAll('.row-actions').forEach(el => el.remove()); // Remove a coluna de ações

        // Adiciona o clone ao corpo (fora da tela) para que o html2canvas possa renderizá-lo
        tableClone.style.position = 'absolute';
        tableClone.style.top = '-9999px';
        tableClone.style.left = '-9999px';
        document.body.appendChild(tableClone);

        const isDarkMode = document.body.dataset.theme === 'dark';
        const bgColor = isDarkMode ? '#1b2333' : '#ffffff'; // Cor de fundo do modo escuro ajustada

        html2canvas(tableClone, { backgroundColor: bgColor, useCORS: true, scale: 2 }).then(canvas => {
            canvas.toBlob(blob => {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                    .then(() => {
                        btnCopiarTabela.textContent = "Copiado!";
                        setTimeout(() => {
                            btnCopiarTabela.textContent = originalText;
                            btnCopiarTabela.disabled = false;
                        }, 1500);
                    })
                    .catch(err => {
                        console.error('Falha ao copiar imagem da tabela:', err);
                        btnCopiarTabela.textContent = "Erro!";
                        setTimeout(() => {
                            btnCopiarTabela.textContent = originalText;
                            btnCopiarTabela.disabled = false;
                        }, 2000);
                    });
            }, 'image/png');
        }).catch(err => {
            console.error('Falha ao gerar canvas da tabela:', err);
            btnCopiarTabela.textContent = "Erro!";
            setTimeout(() => {
                btnCopiarTabela.textContent = originalText;
                btnCopiarTabela.disabled = false;
            }, 2000);
        }).finally(() => {
            // Remove o clone do DOM após a operação
            document.body.removeChild(tableClone);
        });
    });

    // --- LÓGICA PARA TABELAS PREDEFINIDAS ---
    const predefinedTables = {
        // Comparadores 1-bit
        'comp-gt-1bit': { numVars: 2, numOutputs: 1, varNames: ['A', 'B'], outputNames: ['A > B'], values: ['0','0','1','0'] },
        'comp-lt-1bit': { numVars: 2, numOutputs: 1, varNames: ['A', 'B'], outputNames: ['A < B'], values: ['0','1','0','0'] },
        'comp-eq-1bit': { numVars: 2, numOutputs: 1, varNames: ['A', 'B'], outputNames: ['A == B'], values: ['1','0','0','1'] },
        'comp-ne-1bit': { numVars: 2, numOutputs: 1, varNames: ['A', 'B'], outputNames: ['A != B'], values: ['0','1','1','0'] },
        'comp-ge-1bit': { numVars: 2, numOutputs: 1, varNames: ['A', 'B'], outputNames: ['A >= B'], values: ['1','0','1','1'] },
        'comp-le-1bit': { numVars: 2, numOutputs: 1, varNames: ['A', 'B'], outputNames: ['A <= B'], values: ['1','1','0','1'] },
        // Comparadores 2-bit
        'comp-gt-2bit': { numVars: 4, numOutputs: 1, varNames: ['A₁','A₀','B₁','B₀'], outputNames: ['A > B'], values: ['0','0','0','0','1','0','0','0','1','1','0','0','1','1','1','0'] },
        'comp-lt-2bit': { numVars: 4, numOutputs: 1, varNames: ['A₁','A₀','B₁','B₀'], outputNames: ['A < B'], values: ['0','1','1','1','0','0','1','1','0','0','0','1','0','0','0','0'] },
        'comp-eq-2bit': { numVars: 4, numOutputs: 1, varNames: ['A₁','A₀','B₁','B₀'], outputNames: ['A == B'], values: ['1','0','0','0','0','1','0','0','0','0','1','0','0','0','0','1'] },
        'comp-ne-2bit': { numVars: 4, numOutputs: 1, varNames: ['A₁','A₀','B₁','B₀'], outputNames: ['A != B'], values: ['0','1','1','1','1','0','1','1','1','1','0','1','1','1','1','0'] },
        'comp-ge-2bit': { numVars: 4, numOutputs: 1, varNames: ['A₁','A₀','B₁','B₀'], outputNames: ['A >= B'], values: ['1','0','0','0','1','1','0','0','1','1','1','0','1','1','1','1'] },
        'comp-le-2bit': { numVars: 4, numOutputs: 1, varNames: ['A₁','A₀','B₁','B₀'], outputNames: ['A <= B'], values: ['1','1','1','1','0','1','1','1','0','0','1','1','0','0','0','1'] },
        // Aritméticos 1-bit
        'half-adder-1bit': { numVars: 2, numOutputs: 2, varNames: ['A','B'], outputNames: ['S','C'], values: ['0','0','1','0','1','0','0','1'] },
        'full-adder-1bit': { numVars: 3, numOutputs: 2, varNames: ['A','B','Cᵢₙ'], outputNames: ['S','Cₒᵤₜ'], values: ['0','0','1','0','1','0','0','1','1','0','0','1','0','1','1','1'] },
        'half-subtractor-1bit': { numVars: 2, numOutputs: 2, varNames: ['A','B'], outputNames: ['D','Bₒᵤₜ'], values: ['0','0','1','1','1','0','0','0'] },
        'full-subtractor-1bit': { numVars: 3, numOutputs: 2, varNames: ['A','B','Bᵢₙ'], outputNames: ['D','Bₒᵤₜ'], values: ['0','0','1','1','1','0','0','0','1','1','0','0','0','0','1','1'] },
    };

    function loadPredefinedTable(exampleId) {
        const example = predefinedTables[exampleId];
        if (!example) return;

        // NOVO: Força o modo de entrada para Tabela Verdade
        isKarnaughInputMode = false;
        inputModeCheckbox.checked = false;

        numVariaveisInput.value = example.numVars;
        numSaidasInput.value = example.numOutputs;

        gerarTabelaVerdade(example.varNames, example.outputNames);

        const outputCells = tabelaContainer.querySelectorAll('.output-cell');
        if (outputCells.length !== example.values.length) {
            console.error("Discrepância entre células esperadas e geradas.");
            return;
        }

        outputCells.forEach((cell, index) => {
            const value = example.values[index];
            const stateIndex = estadosSaida.indexOf(value);
            cell.textContent = value;
            cell.dataset.currentState = stateIndex;
            cell.classList.toggle("x-value", value === "X");
            cell.classList.toggle("one-value", value === "1");
        });
    }

    // --- LÓGICA PARA MENU HAMBÚRGUER E TEMA ---

    function openNav() {
        sidenav.style.width = "300px";
    }

    function closeNav() {
        sidenav.style.width = "0";
    }

    hamburgerBtn.addEventListener('click', openNav);
    closeBtn.addEventListener('click', closeNav);

    // NOVO: Fecha a sidebar ao clicar fora dela
    window.addEventListener('click', (event) => {
        if (sidenav.style.width === "300px" && !sidenav.contains(event.target) && event.target !== hamburgerBtn) {
            closeNav();
        }
    });

    sidenav.addEventListener('click', (event) => {
        const target = event.target.closest('a');
        if (target && target.dataset.example) {
            event.preventDefault();
            loadPredefinedTable(target.dataset.example);
            closeNav(); // Fecha o menu após selecionar um exemplo
        }
    });

    btnGerarMapa.addEventListener('click', gerarMapaEExibir);

    const applyTheme = (theme) => {
        document.body.dataset.theme = theme;
        themeCheckbox.checked = theme === 'dark';
    };

    themeCheckbox.addEventListener('change', () => {
        const newTheme = themeCheckbox.checked ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    inputModeCheckbox.addEventListener('change', () => {
        isKarnaughInputMode = inputModeCheckbox.checked;
        updateInputMode();
    });

    function updateInputMode() {
        const btnCopiarTabelaPrincipal = document.getElementById('btn-copiar-tabela');
        if (isKarnaughInputMode) {
            // Modo Mapa de Karnaugh - gerar mapas editáveis
            gerarMapasKarnaughEditaveis();
            if (btnCopiarTabelaPrincipal) btnCopiarTabelaPrincipal.style.display = 'none'; // Oculta o botão
        } else {
            // Modo Tabela Verdade - gerar tabela tradicional
            gerarTabelaVerdade();
            if (btnCopiarTabelaPrincipal) btnCopiarTabelaPrincipal.style.display = 'inline-block'; // Mostra o botão
        }
    }

    // NOVO: Função para gerar os cabeçalhos de edição de variáveis no modo mapa
    function gerarCabecalhoEdicaoMapa() {
        const numVars = parseInt(numVariaveisInput.value);
        const numSaidas = parseInt(numSaidasInput.value);
        const headerContainer = document.getElementById('karnaugh-input-header');
        if (!headerContainer) return;

        // Limpa o container antes de adicionar novos elementos
        headerContainer.innerHTML = '';

        // Cria o grupo de variáveis de entrada
        const varCells = varNames.slice(0, numVars).map((v, i) => `
            <div class="variable-cell">
                <span class="variable-name" data-index="${i}">${formatNameToSubscript(v)}</span>
                <i class="bi bi-pencil-square edit-icon" data-index="${i}" title="Editar nome da variável"></i>
            </div>
        `).join('');

        const inputGroupContainer = document.createElement('div');
        inputGroupContainer.className = 'variable-group-container';
        inputGroupContainer.innerHTML = `
            <span class="variable-group-label">Entradas:</span>
            <div class="variable-group">${varCells}</div>
        `;
        headerContainer.appendChild(inputGroupContainer);

        // Cria o grupo de variáveis de saída
        const outputCells = outputVarNames.slice(0, numSaidas).map((outputName, i) => `
            <div class="variable-cell">
                <span class="variable-name" data-index="output-${i}">${formatNameToSubscript(outputName)}</span>
                <i class="bi bi-pencil-square edit-icon" data-index="output-${i}" title="Editar nome da variável de saída"></i>
            </div>
        `).join('');

        const outputGroupContainer = document.createElement('div');
        outputGroupContainer.className = 'variable-group-container';
        outputGroupContainer.innerHTML = `
            <span class="variable-group-label">Saídas:</span>
            <div class="variable-group">${outputCells}</div>
        `;
        headerContainer.appendChild(outputGroupContainer);


        headerContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('edit-icon')) {
                const cell = event.target.closest('.variable-cell');
                if (!cell) return;

                const span = cell.querySelector('.variable-name');
                const indexAttr = event.target.dataset.index;

                if (indexAttr.startsWith('output-')) {
                    const outputIndex = parseInt(indexAttr.split('-')[1]);
                    const oldName = outputVarNames[outputIndex];
                    const newName = prompt(`Editar nome da variável de saída "${oldName}":`, oldName);
                    if (newName && newName.trim() && newName.trim() !== oldName) {
                        const plainName = newName.trim().substring(0, 10);
                        outputVarNames[outputIndex] = plainName;
                        // Atualiza o cabeçalho e o título do mapa correspondente
                        gerarMapasKarnaughEditaveis();
                    }
                } else {
                    const numericIndex = parseInt(indexAttr);
                    const oldName = varNames[numericIndex];
                    const newName = prompt(`Editar nome da variável "${oldName}":`, oldName);
                    if (newName && newName.trim() && newName.trim() !== oldName) {
                        const plainName = newName.trim().substring(0, 10);
                        varNames[numericIndex] = plainName;
                        // Redesenha tudo para refletir a mudança
                        gerarMapasKarnaughEditaveis();
                    }
                }
            }
        });
    }

    function copiarMapaDeEntradaComoImagem(outputIndex) {
        const mapContainer = document.getElementById(`input-kmap-${outputIndex}`);
        // MODIFICADO: Alvo agora é o primeiro elemento filho, que contém o mapa real.
        const elementToCapture = mapContainer.firstChild;

        if (!elementToCapture) {
            console.error('Não foi possível encontrar o elemento do mapa para copiar.');
            return;
        }

        const isDarkMode = document.body.dataset.theme === 'dark';
        const bgColor = isDarkMode ? '#1e293b' : '#ffffff';

        html2canvas(elementToCapture, {
            backgroundColor: bgColor, 
            useCORS: true, 
            scale: 2
        }).then(canvas => {
            canvas.toBlob(blob => {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                    .then(() => showCopyFeedback(button, false, "Copiar Mapa"));
            }, 'image/png');
        }).catch(err => console.error('Falha ao gerar canvas do mapa de entrada:', err));
    }

    function copiarTabelaDeSaidaComoImagem(outputIndex, button) {
        const tableContainer = document.getElementById(`truth-table-container-${outputIndex}`);
        const table = tableContainer.querySelector('table');
        if (!table) return;

        const tableClone = table.cloneNode(true);
        tableClone.querySelectorAll('.row-hidden').forEach(row => row.remove());
        tableClone.querySelectorAll('.row-actions').forEach(el => el.remove());

        tableClone.style.position = 'absolute';
        tableClone.style.top = '-9999px';
        tableClone.style.left = '-9999px';
        document.body.appendChild(tableClone);

        // MODIFICADO: Força o fundo branco para consistência com a cópia da tabela de entrada.
        const bgColor = '#ffffff';

        html2canvas(tableClone, { backgroundColor: bgColor, useCORS: true, scale: 2 }).then(canvas => {
            canvas.toBlob(blob => {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                    .then(() => showCopyFeedback(button, false, "Copiar Tabela"));
            }, 'image/png');
        }).catch(err => {
            console.error('Falha ao gerar canvas da tabela de saída:', err);
        }).finally(() => {
            document.body.removeChild(tableClone);
        });
    }

    function copiarMapaDeSaidaComoImagem(outputIndex, button) {
        const mapContainer = document.getElementById(`kmap-container-${outputIndex}`);
        const isDarkMode = document.body.dataset.theme === 'dark';
        const bgColor = isDarkMode ? '#1e293b' : '#ffffff';

        html2canvas(mapContainer, { backgroundColor: bgColor, useCORS: true, scale: 2 }).then(canvas => {
            canvas.toBlob(blob => {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                    .then(() => showCopyFeedback(button, false, "Copiar Mapa"));
            }, 'image/png');
        }).catch(err => console.error('Falha ao gerar canvas do mapa de saída:', err));
    }

    function gerarMapasKarnaughEditaveis() {
        const numVars = parseInt(numVariaveisInput.value);
        const numSaidas = parseInt(numSaidasInput.value);
        // Atualizar nomes das saídas se necessário (o seu código para isto permanece aqui)
        const numSaidasAtual = outputVarNames.length;
        if (numSaidas > numSaidasAtual) {
            if (numSaidasAtual === 1 && numSaidas > 1) {
                const baseName = outputVarNames[0].replace(/\d+$/, '');
                outputVarNames[0] = `${baseName}0`;
            }
            const baseName = outputVarNames.length > 0 ? outputVarNames[0].replace(/\d+$/, '') : 'S';
            for (let i = numSaidasAtual; i < numSaidas; i++) {
                outputVarNames.push(`${baseName}${i}`);
            }
        } else if (numSaidas < numSaidasAtual) {
            outputVarNames.length = numSaidas;
            if (outputVarNames.length === 1) {
                outputVarNames[0] = outputVarNames[0].replace(/\d+$/, '');
            }
        }

        tabelaContainer.innerHTML = "";

        // 1. PRIMEIRO, CRIAMOS E INSERIMOS TODA A ESTRUTURA HTML
        const mapsContainer = document.createElement("div");
        mapsContainer.className = "karnaugh-input-maps";
        mapsContainer.innerHTML = `
            <div id="karnaugh-input-header" class="karnaugh-input-header"></div>
        `;

        for (let outputIndex = 0; outputIndex < numSaidas; outputIndex++) {
            const mapSection = document.createElement("div");
            mapSection.className = "input-map-section";
            // Criamos os contentores para os mapas, mas ainda não os preenchemos
            // MODIFICADO: Aplica a formatação de subscrito ao título do mapa.
            mapSection.innerHTML = `
                <h4>Mapa para ${formatNameToSubscript(outputVarNames[outputIndex])}</h4>
                <div id="input-kmap-${outputIndex}" class="input-kmap-container"></div>
                <div class="action-buttons">
                    <button id="btn-copiar-input-mapa-${outputIndex}" class="btn-secondary">Copiar Mapa</button>
                </div>
            `;
            mapsContainer.appendChild(mapSection);
        }

        // Adicionamos a estrutura completa à página
        tabelaContainer.appendChild(mapsContainer);

        // 2. DEPOIS, COM O HTML JÁ NA PÁGINA, PREENCHEMOS CADA MAPA
        for (let outputIndex = 0; outputIndex < numSaidas; outputIndex++) {
            // Agora, getElementById encontrará o container porque ele já existe no DOM
            gerarMapaEditavel(numVars, outputIndex);
        }


        // Adicionar event listeners para os botões de cópia dos mapas de entrada
        for (let outputIndex = 0; outputIndex < numSaidas; outputIndex++) {
            const btnCopiarInputMapa = document.getElementById(`btn-copiar-input-mapa-${outputIndex}`);
            if (btnCopiarInputMapa) {
                btnCopiarInputMapa.addEventListener('click', () => {
                    copiarMapaDeEntradaComoImagem(outputIndex, btnCopiarInputMapa);
                });
            }
        }
        // NOVO: Gera os cabeçalhos de edição
        gerarCabecalhoEdicaoMapa();
    }

    function gerarMapaEditavel(numVars, outputIndex) {
        const container = document.getElementById(`input-kmap-${outputIndex}`);
        if (!container) return; // Proteção adicional

        const numLinhas = Math.pow(2, numVars);

        if (!window.inputKmapValues) window.inputKmapValues = {};
        if (!window.inputKmapValues[outputIndex] || window.inputKmapValues[outputIndex].length !== numLinhas) {
            window.inputKmapValues[outputIndex] = new Array(numLinhas).fill('0');
        }

        const { kmapMatrices, gridConfig } = gerarMatrizesKmap(numVars, window.inputKmapValues[outputIndex]);

        // Desenha o mapa usando a função reutilizada, agora no modo editável
        desenharMapaK(numVars, kmapMatrices, gridConfig, outputIndex, true, 'input');

        // Chama a atualização dos grupos logo após criar o mapa
        atualizarAgrupamentosAutomaticos(outputIndex, numVars);
    }
    
    function toggleCellValue(cellDiv, row, col, grid, numVars, outputIndex) {
        const currentValue = cellDiv.textContent;
        let newValue;

        // Ciclar entre 0, 1, X
        if (currentValue === '0') {
            newValue = '1';
        } else if (currentValue === '1') {
            newValue = 'X';
        } else {
            newValue = '0';
        }

        // Atualizar a célula visual
        cellDiv.textContent = newValue;
        cellDiv.classList.remove('x-value', 'one-value');
        if (newValue === 'X') {
            cellDiv.classList.add('x-value');
        } else if (newValue === '1') {
            cellDiv.classList.add('one-value');
        }

        // Atualizar o array de valores
        const linearIndex = kmapPosToTTIndex({ grid, row, col }, numVars);
        if (window.inputKmapValues && window.inputKmapValues[outputIndex]) {
            window.inputKmapValues[outputIndex][linearIndex] = newValue;
        }

        // Atualizar agrupamentos automaticamente
        atualizarAgrupamentosAutomaticos(outputIndex, numVars);
    }

    function getLinearIndexFromKmapPosition(row, col, numVars) {
        // Esta função está incorreta para a lógica atual e não é mais necessária.
        // A conversão agora é feita diretamente por kmapPosToTTIndex.
        // Removendo ou deixando-a sem uso para evitar erros.
        const pos = { grid: 0, row: row, col: col };
        return kmapPosToTTIndex(pos, numVars);
    }

    function getGrayCode(n) {
        if (n === 0) return [''];
        if (n === 1) return ['0', '1'];
        
        const prev = getGrayCode(n - 1);
        const result = [];
        
        // Primeira metade: adicionar '0' no início
        for (let i = 0; i < prev.length; i++) {
            result.push('0' + prev[i]);
        }
        
        // Segunda metade: adicionar '1' no início (ordem reversa)
        for (let i = prev.length - 1; i >= 0; i--) {
            result.push('1' + prev[i]);
        }
        
        return result;
    }

    function atualizarAgrupamentosAutomaticos(outputIndex, numVars) {
        // Obter valores atuais do mapa
        const kmapValues = window.inputKmapValues[outputIndex];
        if (!kmapValues) return;

        try {
            // Gerar matrizes do mapa e simplificar
            const { kmapMatrices, gridConfig } = gerarMatrizesKmap(numVars, kmapValues);
            const { finalGroups } = simplificar(numVars, kmapMatrices);

            // Desenhar agrupamentos no mapa de entrada
            desenharGrupos(finalGroups, gridConfig, outputIndex, 'input');
        } catch (e) {
            console.error(`Erro ao atualizar agrupamentos para saída ${outputIndex}:`, e);
        }
    }

    // --- Inicialização da Aplicação ---
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    gerarTabelaVerdade();
    switchView(mainView);
});