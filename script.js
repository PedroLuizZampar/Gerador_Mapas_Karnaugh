document.addEventListener('DOMContentLoaded', () => {
    // Mapeia os elementos HTML para constantes para fácil acesso.
    const numVariaveisInput = document.getElementById('numVariaveis');
    const btnIncrement = document.getElementById('btn-increment');
    const btnDecrement = document.getElementById('btn-decrement');
    const tabelaContainer = document.getElementById('tabela-container');
    const kmapContainer = document.getElementById('kmap-container');
    const expressionElement = document.getElementById('simplified-expression');
    const mainView = document.getElementById('main-view');
    const mapView = document.getElementById('map-view');
    const btnGerarMapa = document.getElementById('btn-gerar-mapa');
    const btnVoltar = document.getElementById('btn-voltar');
    const btnCopyMainExpression = document.getElementById('btn-copy-main-expression');
    const btnCopyMap = document.getElementById('btn-copiar-mapa');
    const btnCopiarTabela = document.getElementById('btn-copiar-tabela');
    const btnCopySteps = document.getElementById('btn-copy-steps');
    const stepsContainer = document.getElementById('simplification-steps-container');

    // Define constantes e variáveis globais.
    const estadosSaida = ['0', '1', 'X'];
    let varNames = ['A', 'B', 'C', 'D', 'E', 'F']; 
    let outputVarName = 'S'; // NOVO: Variável para o nome da saída, permitindo que seja editável.
    const GROUP_COLORS = ['#f44336', '#2196f3', '#4caf50', '#ffc107', '#9c27b0', '#e91e63', '#00bcd4', '#ff5722'];
    let simplificationStepsLog = [];

    /**
     * NOVO: Converte os dígitos de uma string para seus equivalentes em subscrito (Unicode).
     * @param {string} name - O nome da variável a ser formatado.
     * @returns {string} - O nome com os números em formato subscrito.
     */
    function formatNameToSubscript(name) {
        const subscriptDigits = {
            '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
            '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
        };
        // Usa uma expressão regular para encontrar todos os dígitos na string e substituí-los.
        return String(name).replace(/\d/g, digit => subscriptDigits[digit] || digit);
    }

    const switchView = (viewToShow) => {
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.remove('active');
        });
        viewToShow.classList.add('active');
    };

    const gerarMapaEExibir = () => {
        simplificationStepsLog = [];
        stepsContainer.style.display = 'none';
        btnCopySteps.style.display = 'none';
        stepsContainer.innerHTML = '';

        const numVariaveis = parseInt(numVariaveisInput.value);
        const truthTableValues = lerValoresTabela();
        const { kmapMatrices, gridConfig } = gerarMatrizesKmap(numVariaveis, truthTableValues);
        
        desenharMapaK(numVariaveis, kmapMatrices, gridConfig);
        
        try {
            const { finalGroups, expression } = simplificar(numVariaveis, kmapMatrices);

            // MODIFICADO: Usa a variável 'outputVarName' para o nome da saída.
            expressionElement.innerHTML = `${outputVarName} = ?`;
            btnCopyMainExpression.style.display = 'none';
            
            if (expression === "0" || expression === "1" || !finalGroups || finalGroups.length === 0) {
                expressionElement.innerHTML = `${outputVarName} = ${expression || '0'}`;
                desenharGrupos(finalGroups || [], gridConfig);
                renderizarPassos();
                switchView(mapView);
                return;
            }
            
            let stepCounter = 0;
            let currentTerms = finalGroups.map((group, i) => ({
                term: getTermForGroup(numVariaveis, group),
                color: GROUP_COLORS[i % GROUP_COLORS.length]
            }));

            simplificationStepsLog.push({
                title: `Passo ${stepCounter++}: Expressão Inicial (Soma de Produtos)`,
                termsWithMeta: [...currentTerms],
                plainExpression: formatExpressionFromTerms(currentTerms),
                explanation: 'Esta é a expressão booleana simplificada, obtida diretamente dos agrupamentos no mapa. As cores correspondem aos grupos. A partir daqui, aplicaremos regras algébricas para simplificar ainda mais.'
            });

            let changedInLoop = true;
            while(changedInLoop) {
                let somethingChangedThisCycle = false;

                const factorResult = processOneFactoringStep(currentTerms);
                if (factorResult.changed) {
                    simplificationStepsLog.push({
                        title: `Passo ${stepCounter++}: Fatoração (Termo em Evidência)`,
                        termsWithMeta: factorResult.newTerms,
                        plainExpression: formatExpressionFromTerms(factorResult.newTerms),
                        explanation: factorResult.explanation
                    });
                    currentTerms = factorResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue; 
                }

                const xorResult = processOneXorStep(currentTerms);
                if (xorResult.changed) {
                    simplificationStepsLog.push({
                        title: `Passo ${stepCounter++}: Simplificação (Porta XOR/XNOR)`,
                        termsWithMeta: xorResult.newTerms,
                        plainExpression: formatExpressionFromTerms(xorResult.newTerms),
                        explanation: xorResult.explanation
                    });
                    currentTerms = xorResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue;
                }

                // ===== INÍCIO DA MODIFICAÇÃO =====
                const complexFactorResult = processFactoringWithComplexTerms(currentTerms);
                if (complexFactorResult.changed) {
                    simplificationStepsLog.push({
                        title: `Passo ${stepCounter++}: Fatoração (Termo Complexo)`,
                        termsWithMeta: complexFactorResult.newTerms,
                        plainExpression: formatExpressionFromTerms(complexFactorResult.newTerms),
                        explanation: complexFactorResult.explanation
                    });
                    currentTerms = complexFactorResult.newTerms;
                    somethingChangedThisCycle = true;
                    continue;
                }
                // ===== FIM DA MODIFICAÇÃO =====
                
                const compoundResult = processOneCompoundStep(currentTerms);
                if (compoundResult.changed) {
                    simplificationStepsLog.push({
                        title: `Passo ${stepCounter++}: Simplificação (Associativa)`,
                        termsWithMeta: compoundResult.newTerms,
                        plainExpression: formatExpressionFromTerms(compoundResult.newTerms),
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
            
            // MODIFICADO: A condição agora verifica de forma mais robusta se existe
            // um padrão XNOR (um XOR negado) em qualquer parte do termo.
            const needsXnorConversion = currentTerms.some(t => t.term.includes("⊕") && t.term.includes(")'"));
            
            if (needsXnorConversion) {
                // A nova função formatWithXNOR é chamada aqui e irá converter todas as ocorrências.
                finalDisplayTerms = currentTerms.map(t => ({...t, term: formatWithXNOR(t.term)}));
                
                simplificationStepsLog.push({
                    title: `Passo ${stepCounter++}: Conversão para Notação XNOR (⊙)`,
                    termsWithMeta: [...finalDisplayTerms],
                    plainExpression: formatExpressionFromTerms(finalDisplayTerms),
                    explanation: "Para uma representação final mais limpa, convertemos a notação XNOR da forma (P ⊕ Q)' para a forma P ⊙ Q."
                });
            }
            
            // MODIFICADO: Usa a variável 'outputVarName' para o nome da saída.
            expressionElement.innerHTML = `${outputVarName} = ${formatExpressionHTML(finalDisplayTerms, false)}`;
            btnCopyMainExpression.style.display = 'inline-flex';
            desenharGrupos(finalGroups, gridConfig);
            
            renderizarPassos();

        } catch (e) {
            console.error("Erro durante a simplificação:", e);
            expressionElement.textContent = `${outputVarName} = Erro na simplificação`;
        }
        
        switchView(mapView);
    };
    
    function renderizarPassos() {
        if (simplificationStepsLog.length === 0) {
            stepsContainer.style.display = 'none';
            btnCopySteps.style.display = 'none';
            return;
        }

        stepsContainer.innerHTML = '';
        simplificationStepsLog.forEach((step, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'step';
            
            const useColors = (index === 0);
            const expressionHTML = formatExpressionHTML(step.termsWithMeta, useColors);
            const plainExpression = formatExpressionFromTerms(step.termsWithMeta);
            
            stepDiv.innerHTML = `
                <div class="step-title">${step.title}</div>
                <div class="step-explanation">${step.explanation}</div>
                <div class="step-expression-container">
                    <div class="step-expression">${expressionHTML}</div>
                    <button class="copy-icon-button copy-step-btn" data-expression="${plainExpression}" title="Copiar Expressão do Passo">
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
            const termText = meta.term.replace(/'/g, '’');
            if (useColors && meta.color) {
                return `<span style="color: ${meta.color}; font-weight: 700;">${termText}</span>`;
            }
            return `<span style="font-weight: 500;">${termText}</span>`;
        });
        return termStrings.join(' + ');
    }

    // MODIFICADO: Usa a variável 'outputVarName' para o nome da saída.
    function formatExpressionFromTerms(terms) {
        const termStrings = terms.map(t => t.term);
        return `${outputVarName} = ${termStrings.join(' + ')}`;
    }
    
    // MODIFICADO: A função agora adiciona o ícone de edição para a variável de saída 'S' e a lógica de edição foi aprimorada.
    function gerarTabelaVerdade() {
        const numVars = parseInt(numVariaveisInput.value);
        tabelaContainer.innerHTML = "";
        const numLinhas = Math.pow(2, numVars);

        const tableHeaders = varNames.slice(0, numVars).map((v, i) => `
            <th>
                <span class="variable-name" data-index="${i}">${v}</span>
                <i class="bi bi-pencil-square edit-icon" data-index="${i}" title="Editar nome da variável"></i>
            </th>
        `).join("");

        // NOVO: Cabeçalho para a variável de saída, agora com ícone de edição.
        const outputHeader = `
            <th>
                <span class="variable-name" data-index="output">${outputVarName}</span>
                <i class="bi bi-pencil-square edit-icon" data-index="output" title="Editar nome da variável de saída"></i>
            </th>
        `;

        const table = document.createElement("table");
        table.innerHTML = `
            <thead>
                <tr>
                    ${tableHeaders}
                    ${outputHeader}
                </tr>
            </thead>
            <tbody>
                ${Array.from({length: numLinhas}, (_, i) => `
                    <tr>
                        ${i.toString(2).padStart(numVars, "0").split("").map(bit => `<td>${bit}</td>`).join("")}
                        <td class="output-cell" data-current-state="0">0</td>
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

        // MODIFICADO: O listener agora trata a edição das variáveis de entrada e da variável de saída.
        table.querySelector('thead').addEventListener('click', (event) => {
            if (event.target.classList.contains('edit-icon')) {
                const index = event.target.dataset.index;
                const span = event.target.previousElementSibling;

                if (index === 'output') {
                    // Lógica para editar a variável de saída
                    const oldName = outputVarName;
                    const newName = prompt(`Editar nome da variável de saída "${oldName}":`, oldName);
                    if (newName && newName.trim() && newName.trim() !== oldName) {
                        // MODIFICADO: Aplica a formatação de subscrito antes de salvar e exibir.
                        const plainName = newName.trim().substring(0, 10);
                        const finalName = formatNameToSubscript(plainName);

                        outputVarName = finalName;
                        span.textContent = finalName;

                        // Atualiza a expressão simplificada se já estiver visível
                        if (mapView.classList.contains('active')) {
                            const currentExpression = expressionElement.innerHTML.split('=')[1];
                            expressionElement.innerHTML = `${outputVarName} =${currentExpression}`;
                        }
                    }
                } else {
                    // Lógica para editar as variáveis de entrada
                    const numericIndex = parseInt(index);
                    const oldName = varNames[numericIndex];
                    const newName = prompt(`Editar nome da variável "${oldName}":`, oldName);
                    if (newName && newName.trim() && newName.trim() !== oldName) {
                        // MODIFICADO: Aplica a formatação de subscrito antes de salvar e exibir.
                        const plainName = newName.trim().substring(0, 10);
                        const finalName = formatNameToSubscript(plainName);

                        varNames[numericIndex] = finalName;
                        span.textContent = finalName;
                    }
                }
            }
        });

        tabelaContainer.appendChild(table);
    }

    function lerValoresTabela(){return Array.from(document.querySelectorAll(".output-cell")).map(cell=>cell.textContent)}

    function getKmapGridConfig(numVars) {
        if (numVars === 2) return { rows: 2, cols: 2, numSubGrids: 1, varsLeft: [varNames[0]], varsTop: [varNames[1]] };
        if (numVars === 3) return { rows: 2, cols: 4, numSubGrids: 1, varsLeft: [varNames[0]], varsTop: [varNames[1], varNames[2]] };
        if (numVars === 4) return { rows: 4, cols: 4, numSubGrids: 1, varsLeft: [varNames[0], varNames[1]], varsTop: [varNames[2], varNames[3]] };
        if (numVars === 5) return { rows: 4, cols: 4, numSubGrids: 2, varsSub: [varNames[0]], varsLeft: [varNames[1], varNames[2]], varsTop: [varNames[3], varNames[4]] };
        if (numVars === 6) return { rows: 4, cols: 4, numSubGrids: 4, varsSub: [varNames[0], varNames[1]], varsLeft: [varNames[2], varNames[3]], varsTop: [varNames[4], varNames[5]] };
        return {};
    }

    function ttIndexToKmapPos(index,numVars){const bin=index.toString(2).padStart(numVars,"0");const grayCode=[0,1,3,2];let row,col,grid=0;switch(numVars){case 2:row=parseInt(bin[0],2);col=parseInt(bin[1],2);break;case 3:row=parseInt(bin[0],2);col=grayCode.indexOf(parseInt(bin.substring(1,3),2));break;case 4:row=grayCode.indexOf(parseInt(bin.substring(0,2),2));col=grayCode.indexOf(parseInt(bin.substring(2,4),2));break;case 5:grid=parseInt(bin[0],2);row=grayCode.indexOf(parseInt(bin.substring(1,3),2));col=grayCode.indexOf(parseInt(bin.substring(3,5),2));break;case 6:grid=grayCode.indexOf(parseInt(bin.substring(0,2),2));row=grayCode.indexOf(parseInt(bin.substring(2,4),2));col=grayCode.indexOf(parseInt(bin.substring(4,6),2));break}return{grid,row,col}}
    function kmapPosToTTIndex(pos,numVars){let bin="";const grayCode=[0,1,3,2];switch(numVars){case 2:bin=`${pos.row.toString(2)}${pos.col.toString(2)}`;break;case 3:bin=`${pos.row.toString(2)}${grayCode[pos.col].toString(2).padStart(2,"0")}`;break;case 4:bin=`${grayCode[pos.row].toString(2).padStart(2,"0")}${grayCode[pos.col].toString(2).padStart(2,"0")}`;break;case 5:bin=`${pos.grid.toString(2)}${grayCode[pos.row].toString(2).padStart(2,"0")}${grayCode[pos.col].toString(2).padStart(2,"0")}`;break;case 6:bin=`${grayCode[pos.grid].toString(2).padStart(2,"0")}${grayCode[pos.row].toString(2).padStart(2,"0")}${grayCode[pos.col].toString(2).padStart(2,"0")}`;break}return parseInt(bin,2)}
    function gerarMatrizesKmap(numVars,values){const gridConfig=getKmapGridConfig(numVars);if(!gridConfig.rows)return{kmapMatrices:[],gridConfig:{}};const kmapMatrices=Array.from({length:gridConfig.numSubGrids},()=>Array(gridConfig.rows).fill(null).map(()=>Array(gridConfig.cols).fill(null)));values.forEach((val,index)=>{const pos=ttIndexToKmapPos(index,numVars);if(kmapMatrices[pos.grid]?.[pos.row]!==undefined){kmapMatrices[pos.grid][pos.row][pos.col]=val}});return{kmapMatrices,gridConfig}}
    function desenharMapaK(numVars,kmapMatrices,gridConfig){kmapContainer.innerHTML="";if(!gridConfig.rows)return;const mainWrapper=document.createElement("div");kmapContainer.appendChild(mainWrapper);const buildMapGrid=(matrix,gridIndex,vars)=>{const{varsLeft,varsTop}=vars;const hasSplitLeft=varsLeft.length>1;const hasSplitTop=varsTop.length>1;const leftHeaderCols=varsLeft.length>0?1:0;const headerRows=varsTop.length>0?1:0;const totalRows=headerRows+gridConfig.rows+(hasSplitTop?1:0);const totalCols=leftHeaderCols+gridConfig.cols+(hasSplitLeft?1:0);const mapContainer=document.createElement("div");mapContainer.className="kmap-sub-grid-container";const kmap=document.createElement("div");kmap.className="kmap";kmap.id=`kmap-grid-${gridIndex}`;kmap.style.display="grid";kmap.style.gridTemplateRows=`repeat(${totalRows}, auto)`;kmap.style.gridTemplateColumns=`repeat(${totalCols}, auto)`;const corner=document.createElement("div");corner.style.gridArea=`1 / 1 / ${headerRows+1} / ${leftHeaderCols+1}`;kmap.appendChild(corner);if(varsTop.length>0){const mainVar=varsTop[0];const labels=[`${mainVar}'`,mainVar];const colSpan=gridConfig.cols/labels.length;labels.forEach((label,i)=>{const h=document.createElement("div");h.className="kmap-header";h.textContent=label;h.style.gridArea=`1 / ${leftHeaderCols+1+i*colSpan} / 2 / ${leftHeaderCols+1+(i*colSpan+colSpan)}`;kmap.appendChild(h)})}
    if(hasSplitTop){const subVar=varsTop[1];const subLabels=[`${subVar}'`,subVar,subVar,`${subVar}'`];const bottomRowGridStart=headerRows+gridConfig.rows+1;subLabels.forEach((label,i)=>{const h=document.createElement("div");h.className="kmap-header";h.textContent=label;h.style.gridArea=`${bottomRowGridStart} / ${leftHeaderCols+1+i} / ${bottomRowGridStart+1} / ${leftHeaderCols+2+i}`;kmap.appendChild(h)})}
    if(varsLeft.length>0){const mainVar=varsLeft[0];const labels=[`${mainVar}'`,mainVar];const rowSpan=gridConfig.rows/labels.length;labels.forEach((label,i)=>{const h=document.createElement("div");h.className="kmap-header";h.textContent=label;h.style.gridArea=`${headerRows+1+i*rowSpan} / 1 / ${headerRows+1+(i*rowSpan+rowSpan)} / 2`;kmap.appendChild(h)})}
    if(hasSplitLeft){const subVar=varsLeft[1];const subLabels=[`${subVar}'`,subVar,subVar,`${subVar}'`];const rightHeaderColStart=leftHeaderCols+gridConfig.cols+1;subLabels.forEach((label,r)=>{const h=document.createElement("div");h.className="kmap-header";h.textContent=label;h.style.gridArea=`${headerRows+1+r} / ${rightHeaderColStart} / ${headerRows+2+r} / ${rightHeaderColStart+1}`;kmap.appendChild(h)})}
    matrix.forEach((rowData,r)=>{rowData.forEach((cellData,c)=>{const cell=document.createElement("div");cell.className="kmap-cell";if(cellData==="X")cell.classList.add("x-value");if(cellData==="1")cell.classList.add("one-value");cell.textContent=cellData;cell.style.gridArea=`${headerRows+1+r} / ${leftHeaderCols+1+c} / ${headerRows+2+r} / ${leftHeaderCols+2+c}`;kmap.appendChild(cell)})});mapContainer.appendChild(kmap);return mapContainer};if(numVars<=4){mainWrapper.appendChild(buildMapGrid(kmapMatrices[0],0,gridConfig))}else if(numVars===5){mainWrapper.style.display="flex";mainWrapper.style.alignItems="center";mainWrapper.style.gap="20px";const divA0=document.createElement("div");const divA1=document.createElement("div");divA0.innerHTML=`<h3>${gridConfig.varsSub[0]}'</h3>`;divA1.innerHTML=`<h3>${gridConfig.varsSub[0]}</h3>`;divA0.appendChild(buildMapGrid(kmapMatrices[0],0,{varsLeft:gridConfig.varsLeft,varsTop:gridConfig.varsTop}));divA1.appendChild(buildMapGrid(kmapMatrices[1],1,{varsLeft:gridConfig.varsLeft,varsTop:gridConfig.varsTop}));mainWrapper.append(divA0,divA1)}else if(numVars===6){mainWrapper.style.display="grid";mainWrapper.style.gridTemplateColumns="auto auto auto";mainWrapper.style.gridTemplateRows="auto auto auto";mainWrapper.style.gap="5px 15px";mainWrapper.style.alignItems="center";mainWrapper.style.justifyItems="center";const mainGridVarV=gridConfig.varsSub[0];const mainGridVarH=gridConfig.varsSub[1];const corner=document.createElement("div");corner.style.gridArea="1 / 1";mainWrapper.appendChild(corner);const topLabels=[`${mainGridVarH}'`,mainGridVarH];topLabels.forEach((label,i)=>{const h=document.createElement("div");h.className="kmap-header";h.textContent=label;h.style.gridArea=`1 / ${2+i}`;mainWrapper.appendChild(h)});const leftLabels=[`${mainGridVarV}'`,mainGridVarV];leftLabels.forEach((label,i)=>{const h=document.createElement("div");h.className="kmap-header";h.textContent=label;h.style.padding="10px";h.style.gridArea=`${2+i} / 1`;mainWrapper.appendChild(h)});const subGridConfig={varsLeft:gridConfig.varsLeft,varsTop:gridConfig.varsTop};const placement={"0":"2 / 2","1":"2 / 3","3":"3 / 2","2":"3 / 3"};kmapMatrices.forEach((matrix,index)=>{const map=buildMapGrid(matrix,index,subGridConfig);map.style.gridArea=placement[index];mainWrapper.appendChild(map)})}}
    function desenharGrupos(groups, gridConfig) {
        document.querySelectorAll(".kmap-group").forEach(el => el.remove());

        const { rows, cols } = gridConfig;
        const BORDER_WIDTH = 3;

        const drawRect = (rect, color, groupIndex) => {
            const kmapGrid = document.getElementById(`kmap-grid-${rect.grid}`);
            if (!kmapGrid) return;

            const numVariaveis = parseInt(numVariaveisInput.value);
            const subGridConfig = numVariaveis <= 4
                ? gridConfig
                : { varsLeft: gridConfig.varsLeft, varsTop: gridConfig.varsTop };

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
                const rects = findRectanglesForDrawing(groupCellsByGrid[grid], rows, cols);
                rects.forEach(r => drawRect({ ...r, grid: parseInt(grid) }, color, i));
            }
        });
    }

    function findRectanglesForDrawing(cells,maxRow,maxCol){if(cells.length===0)return[];const visited=new Set;const rectangles=[];const cellSet=new Set(cells.map(c=>`${c.row}-${c.col}`));cells.sort((a,b)=>a.row-b.row||a.col-b.col);cells.forEach(startCell=>{const key=`${startCell.row}-${startCell.col}`;if(visited.has(key))return;const possibleSizes=[{w:4,h:4},{w:4,h:2},{w:2,h:4},{w:4,h:1},{w:1,h:4},{w:2,h:2},{w:2,h:1},{w:1,h:2},{w:1,h:1}];for(const size of possibleSizes){if(canFormRectangle(startCell,size,cellSet,maxRow,maxCol,visited)){const rect=createRectangle(startCell,size,maxRow,maxCol,visited);rectangles.push(...rect);break}}});return rectangles}
    function canFormRectangle(startCell,size,cellSet,maxRow,maxCol,visited){for(let r=0;r<size.h;r++){for(let c=0;c<size.w;c++){const row=(startCell.row+r)%maxRow;const col=(startCell.col+c)%maxCol;if(!cellSet.has(`${row}-${col}`)||visited.has(`${row}-${col}`))return false}}return true}
    function createRectangle(startCell,size,maxRow,maxCol,visited){const rectangles=[];for(let r=0;r<size.h;r++){for(let c=0;c<size.w;c++)visited.add(`${(startCell.row+r)%maxRow}-${(startCell.col+c)%maxCol}`)}
    if(startCell.col+size.w>maxCol){const w1=maxCol-startCell.col;const w2=size.w-w1;rectangles.push({r:startCell.row,c:startCell.col,w:w1,h:size.h});rectangles.push({r:startCell.row,c:0,w:w2,h:size.h})}else if(startCell.row+size.h>maxRow){const h1=maxRow-startCell.row;const h2=size.h-h1;rectangles.push({r:startCell.row,c:startCell.col,w:size.w,h:h1});rectangles.push({r:0,c:startCell.col,w:size.w,h:h2})}else{rectangles.push({r:startCell.row,c:startCell.col,w:size.w,h:size.h})}
    return rectangles}
    function simplificar(numVars,matrices){const minterms=[],dontCares=[];matrices.forEach((matrix,grid)=>{matrix.forEach((row,r)=>{row.forEach((val,c)=>{if(val==="1"||val==="X"){const ttIndex=kmapPosToTTIndex({grid,row:r,col:c},numVars);if(val==="1")minterms.push(ttIndex);if(val==="X")dontCares.push(ttIndex)}})})});if(minterms.length===0)return{expression:"0",finalGroups:[]};const allTerms=[...minterms,...dontCares];if(allTerms.length===Math.pow(2,numVars))return{expression:"1",finalGroups:[Array.from({length:Math.pow(2,numVars)},(_,i)=>i)]};const primeImplicants=findPrimeImplicants(numVars,allTerms);const finalGroups=selectMinimalCover(primeImplicants,minterms);const expression=finalGroups.map(group=>getTermForGroup(numVars,group)).filter(Boolean).join(" + ");return{finalGroups,expression}}
    function findPrimeImplicants(numVars,terms){if(terms.length===0)return[];let currentLevel=new Map;terms.forEach(term=>{const ones=(term.toString(2).match(/1/g)||[]).length;if(!currentLevel.has(ones))currentLevel.set(ones,[]);currentLevel.get(ones).push({term,mask:0})});const primeImplicants=[];while(currentLevel.size>0){const nextLevel=new Map;const combined=new Set;for(let ones=0;ones<numVars;ones++){const group1=currentLevel.get(ones)||[];const group2=currentLevel.get(ones+1)||[];group1.forEach((item1,i1)=>{group2.forEach((item2,i2)=>{if(canCombineItems(item1,item2)){const newItem=combineItems(item1,item2);const newOnes=(newItem.term.toString(2).match(/1/g)||[]).length;if(!nextLevel.has(newOnes))nextLevel.set(newOnes,[]);if(!nextLevel.get(newOnes).some(ex=>ex.term===newItem.term&&ex.mask===newItem.mask))nextLevel.get(newOnes).push(newItem);combined.add(`${ones}-${i1}`);combined.add(`${ones+1}-${i2}`)}})})};currentLevel.forEach((group,ones)=>{group.forEach((item,index)=>{if(!combined.has(`${ones}-${index}`))primeImplicants.push(expandImplicant(item,numVars))})});currentLevel=nextLevel}
    return primeImplicants}
    function canCombineItems(item1,item2){const diff=item1.term^item2.term;return item1.mask===item2.mask&&diff>0&&(diff&(diff-1))===0}
    function combineItems(item1,item2){return{term:item1.term&item2.term,mask:item1.mask|(item1.term^item2.term)}}
    function expandImplicant(item,numVars){const terms=[];const dontCareBits=[];for(let i=0;i<numVars;i++)if(item.mask&(1<<i))dontCareBits.push(i);for(let i=0;i<(1<<dontCareBits.length);i++){let newTerm=item.term;for(let j=0;j<dontCareBits.length;j++)if(i&(1<<j))newTerm|=1<<dontCareBits[j];terms.push(newTerm)}
    return terms.sort((a,b)=>a-b)}
    function selectMinimalCover(primeImplicants,minterms){if(minterms.length===0)return[];const mintermSet=new Set(minterms);const coverage=new Map(minterms.map(mt=>[mt,[]]));primeImplicants.forEach((pi,index)=>pi.forEach(term=>{if(coverage.has(term))coverage.get(term).push(index)}));const finalGroups=[];const usedMinterms=new Set;const essentialPIs=new Set;coverage.forEach(piList=>{if(piList.length===1)essentialPIs.add(piList[0])});essentialPIs.forEach(piIndex=>{finalGroups.push(primeImplicants[piIndex]);primeImplicants[piIndex].forEach(term=>{if(mintermSet.has(term))usedMinterms.add(term)})});const uncoveredMinterms=new Set(minterms.filter(mt=>!usedMinterms.has(mt)));const remainingPIs=primeImplicants.filter((_,index)=>!essentialPIs.has(index));while(uncoveredMinterms.size>0){let bestPi=null,maxCovered=0,bestPiIndex=-1;remainingPIs.forEach((pi,index)=>{const coveredCount=pi.filter(term=>uncoveredMinterms.has(term)).length;if(coveredCount>maxCovered){maxCovered=coveredCount;bestPi=pi;bestPiIndex=index}
    else if(coveredCount>0&&coveredCount===maxCovered&&pi.length>(bestPi?.length||0)){bestPi=pi;bestPiIndex=index}});if(!bestPi)break;finalGroups.push(bestPi);bestPi.forEach(term=>uncoveredMinterms.delete(term));if(bestPiIndex>-1)remainingPIs.splice(bestPiIndex,1)}
    return finalGroups}

    function getTermForGroup(numVars,group){
        if(group.length===Math.pow(2,numVars))return"1";
        let term="";
        const binaries=group.map(g=>g.toString(2).padStart(numVars,"0"));
        for(let i=0;i<numVars;i++){
            const firstBit=binaries[0][i];
            if(binaries.every(b=>b[i]===firstBit)){
                term+=varNames[i];
                if(firstBit==="0")term+="'"
            }
        }
        const termParts=term.match(new RegExp(`(${varNames.join('|')})'?`, 'g')); 
        if(!termParts)return"";
        return termParts.sort((a,b)=>a.localeCompare(b)).join("")
    }

    function processOneXorStep(termsWithMeta) {
        const parseTerm = (termStr) => {
            const vars = {};
            if (termStr === '1') return vars;
            const parts = termStr.match(new RegExp(`(${varNames.join('|')})'?`, 'g')) || [];
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
            const parts = termStr.match(new RegExp(`(${varNames.join('|')})'?`, 'g')) || [];
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
                        const qVars = parsed1.xorPart.match(/[\w']+/g) || [];
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
            const regex = new RegExp(`(${varNames.join('|')})'?`, 'g');
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
        const regex = new RegExp(`(${varNames.join('|')})`, 'g');
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
        const regex = new RegExp(`(${varNames.join('|')})'?`, 'g');
        const literals = term.match(regex) || [];
        if (literals.length === 0) return [];
        const prefixes = new Set();
        const n = literals.length;
        for (let i = 1; i < (1 << n); i++) {
            const subset = [];
            for (let j = 0; j < n; j++) {
                if ((i >> j) & 1) subset.push(literals[j]);
            }
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
        // Regex para encontrar TODAS as ocorrências de (P ⊕ Q)'
        // O 'g' no final (global) é crucial para encontrar mais de uma correspondência.
        // A interrogação (?) nos quantificadores (+) os torna "não gulosos" (lazy),
        // garantindo que cada par de parênteses seja tratado individualmente.
        const xnorPattern = /\(([^()]+?⊕[^()]+?)\)'/g;

        // Verifica se a string contém o padrão a ser substituído.
        if (!xnorPattern.test(termStr)) {
            return termStr;
        }

        // Usa a função replace com uma função de callback para fazer a substituição.
        // O callback é executado para cada correspondência encontrada pela regex global.
        // `match` é a correspondência inteira (ex: "(A ⊕ C)'")
        // `capturedXorPart` é o que foi capturado pelo grupo em parênteses na regex (ex: "A ⊕ C")
        return termStr.replace(xnorPattern, (match, capturedXorPart) => {
            // Substitui o símbolo de XOR por XNOR dentro da parte capturada.
            const xnorPart = capturedXorPart.replace('⊕', '⊙');
            // Retorna a nova sub-string formatada (ex: '(A ⊙ C)').
            return `(${xnorPart})`;
        });
    }

    function showCopyFeedback(button, iconClass) {
        const icon = button.querySelector('i');
        icon.classList.remove(iconClass);
        icon.classList.add('bi-clipboard-check');
        button.style.color = 'green';
        setTimeout(() => {
            icon.classList.remove('bi-clipboard-check');
            icon.classList.add(iconClass);
            button.style.color = '';
        }, 1500);
    }

    btnIncrement.addEventListener('click', () => { let v = parseInt(numVariaveisInput.value); if (v < 6) { numVariaveisInput.value = v + 1; gerarTabelaVerdade(); } });
    btnDecrement.addEventListener('click', () => { let v = parseInt(numVariaveisInput.value); if (v > 2) { numVariaveisInput.value = v - 1; gerarTabelaVerdade(); } });
    btnGerarMapa.addEventListener('click', gerarMapaEExibir);
    btnVoltar.addEventListener('click', () => switchView(mainView));
    
    btnCopyMainExpression.addEventListener('click', () => {
        const textToCopy = expressionElement.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            showCopyFeedback(btnCopyMainExpression, 'bi-clipboard');
        }).catch(err => console.error('Falha ao copiar expressão:', err));
    });

    btnCopyMap.addEventListener('click', () => {
        const originalText = btnCopyMap.textContent;
        btnCopyMap.disabled = true;

        const areaParaCapturar = document.querySelector('.kmap-and-expression');
        html2canvas(areaParaCapturar, { backgroundColor: '#ffffff', useCORS: true, scale: 2 }).then(canvas => {
            canvas.toBlob(blob => {
                if (blob && navigator.clipboard && window.ClipboardItem) {
                    const item = new ClipboardItem({ 'image/png': blob });
                    navigator.clipboard.write([item]).then(() => {
                        btnCopyMap.textContent = 'Copiado!';
                        setTimeout(() => { 
                            btnCopyMap.textContent = originalText; 
                            btnCopyMap.disabled = false;
                        }, 1500);
                    }).catch(err => {
                        console.error('Erro ao copiar imagem:', err);
                        alert('Falha ao copiar imagem para a área de transferência.');
                        btnCopyMap.textContent = originalText;
                        btnCopyMap.disabled = false;
                    });
                } else {
                    alert('Seu navegador não suporta copiar imagens para a área de transferência.');
                    btnCopyMap.textContent = originalText;
                    btnCopyMap.disabled = false;
                }
            }, 'image/png');
        }).catch(err => {
            console.error('Erro ao renderizar imagem:', err);
            btnCopyMap.textContent = originalText;
            btnCopyMap.disabled = false;
        });
    });

    stepsContainer.addEventListener('click', (event) => {
        const copyBtn = event.target.closest('.copy-step-btn');
        if (copyBtn) {
            const textToCopy = copyBtn.dataset.expression;
            navigator.clipboard.writeText(textToCopy).then(() => {
                showCopyFeedback(copyBtn, 'bi-clipboard');
            }).catch(err => console.error('Falha ao copiar: ', err));
        }
    });

    btnCopySteps.addEventListener('click', () => {
        const originalText = btnCopySteps.textContent;
        btnCopySteps.disabled = true;
        
        const stepsContent = document.getElementById('simplification-steps-container');
        const styles = `
            <style>
                body { font-family: sans-serif; color: #1e293b; }
                .step { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0; }
                .step:last-child { border-bottom: none; }
                .step-title { font-weight: 500; font-size: 1.2rem; color: #1e293b; margin-bottom: 0.5rem; }
                .step-explanation { font-size: 1rem; color: #475569; margin-bottom: 1rem; line-height: 1.6; }
                .step-expression-container { display: flex; align-items: center; background-color: #f1f5f9; padding: 0.75rem 1rem; border-radius: 0.5rem; }
                .step-expression { font-family: monospace; font-size: 1.1rem; color: rgb(0, 60, 189); flex-grow: 1; }
                .copy-icon-button { display: none; }
                h2, p { margin: 0; }
            </style>
        `;
        const htmlToCopy = `<!DOCTYPE html><html><head>${styles}</head><body><h2>Passos da Simplificação</h2>${stepsContent.innerHTML}</body></html>`;

        try {
            const blob = new Blob([htmlToCopy], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({ 'text/html': blob });
            navigator.clipboard.write([clipboardItem]).then(() => {
                btnCopySteps.textContent = 'Copiado!';
                setTimeout(() => { 
                    btnCopySteps.textContent = originalText; 
                    btnCopySteps.disabled = false;
                }, 1500);
            }).catch(err => {
                console.error('Falha ao copiar conteúdo formatado:', err);
                alert('Falha ao copiar os passos.');
                btnCopySteps.textContent = originalText;
                btnCopySteps.disabled = false;
            });
        } catch (e) {
            console.error('Falha ao criar blob para cópia:', e);
            alert('Seu navegador não suporta a cópia de conteúdo formatado.');
            btnCopySteps.textContent = originalText;
            btnCopySteps.disabled = false;
        }
    });

    btnCopiarTabela.addEventListener('click', () => {
        const originalText = btnCopiarTabela.textContent;
        btnCopiarTabela.disabled = true;

        const areaParaCapturar = document.querySelector('#tabela-container table');

        html2canvas(areaParaCapturar, { 
            backgroundColor: '#ffffff',
            useCORS: true, 
            scale: 2
        }).then(canvas => {
            canvas.toBlob(blob => {
                if (blob && navigator.clipboard && window.ClipboardItem) {
                    const item = new ClipboardItem({ 'image/png': blob });
                    navigator.clipboard.write([item]).then(() => {
                        btnCopiarTabela.textContent = 'Copiado!';
                        setTimeout(() => { 
                            btnCopiarTabela.textContent = originalText; 
                            btnCopiarTabela.disabled = false;
                        }, 1500);
                    }).catch(err => {
                        console.error('Erro ao copiar tabela como imagem:', err);
                        alert('Falha ao copiar tabela para a área de transferência.');
                        btnCopiarTabela.textContent = originalText;
                        btnCopiarTabela.disabled = false;
                    });
                } else {
                    alert('Seu navegador não suporta copiar imagens para a área de transferência.');
                    btnCopiarTabela.textContent = originalText;
                    btnCopiarTabela.disabled = false;
                }
            }, 'image/png');
        }).catch(err => {
            console.error('Erro ao renderizar a tabela como imagem:', err);
            alert('Ocorreu um erro ao gerar a imagem da tabela.');
            btnCopiarTabela.textContent = originalText;
            btnCopiarTabela.disabled = false;
        });
    });

    // --- Inicialização da Aplicação ---
    gerarTabelaVerdade();
    switchView(mainView);
});