document.addEventListener('DOMContentLoaded', function() {
    // Riferimenti agli elementi DOM
    const columnSelector = document.getElementById('column-selector');
    const chartTypeSelector = document.getElementById('chart-type-selector');
    const generateChartBtn = document.getElementById('generate-chart');
    const chartCanvas = document.getElementById('data-chart');
    const exportPdfBtn = document.getElementById('export-pdf');
    const sortableLabelsContainer = document.getElementById('sortable-labels');
    const labelsContainer = document.querySelector('.labels-container');
    
    // Variabili per memorizzare dati e stato
    let chartInstance = null;
    let chartData = null;
    let sortableInstance = null;
    
    // Inizialmente nascondi il contenitore delle etichette
    labelsContainer.classList.add('hidden');
    
    // Carica le colonne disponibili dal file Excel
    loadColumns();
    
    // Event Listener per il pulsante di generazione del grafico
    generateChartBtn.addEventListener('click', function() {
        const selectedColumn = columnSelector.value;
        const selectedChartType = chartTypeSelector.value;
        
        if (selectedColumn) {
            generateChart(selectedColumn, selectedChartType);
        } else {
            showError('Per favore, seleziona una colonna!');
        }
    });
    
    // Event Listener per il pulsante di esportazione PDF
    exportPdfBtn.addEventListener('click', function() {
        if (chartInstance) {
            exportChartAsPdf();
        }
    });
    
    /**
     * Carica le colonne disponibili nel file Excel
     */
    function loadColumns() {
        // Aggiorna lo stato del selettore durante il caricamento
        columnSelector.innerHTML = '<option value="">Caricamento colonne...</option>';
        columnSelector.disabled = true;
        
        fetch('/api/columns')
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errData => {
                        throw new Error(`Errore ${response.status}: ${errData.error || 'Errore server'}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                // Svuota il selector
                columnSelector.innerHTML = '';
                columnSelector.disabled = false;
                
                // Aggiungi opzione vuota
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = '-- Seleziona una colonna --';
                columnSelector.appendChild(emptyOption);
                
                // Aggiungi le colonne disponibili
                if (data.columns && data.columns.length > 0) {
                    data.columns.forEach(column => {
                        const option = document.createElement('option');
                        option.value = column;
                        option.textContent = column;
                        columnSelector.appendChild(option);
                    });
                    console.log(`Caricate ${data.columns.length} colonne con successo`);
                } else {
                    showError('Nessuna colonna trovata nel file Excel');
                }
            })
            .catch(error => {
                console.error('Errore nel caricamento delle colonne:', error);
                
                // Verifica lo stato del file con l'endpoint di test
                fetch('/api/test')
                    .then(response => response.json())
                    .then(testData => {
                        console.log('Informazioni di configurazione:', testData);
                        
                        let errorMsg = `Errore nel caricamento delle colonne: ${error.message}<br>`;
                        
                        if (testData.file_exists === false) {
                            errorMsg += `File Excel non trovato al percorso: ${testData.excel_file_path}<br>`;
                            errorMsg += 'Verifica che il file sia presente nella directory corretta.';
                        }
                        
                        showError(errorMsg);
                    })
                    .catch(testErr => {
                        showError(`Errore nel caricamento delle colonne: ${error.message}`);
                    });
                
                // Aggiorna il selettore con un messaggio di errore
                columnSelector.innerHTML = '<option value="">Errore nel caricamento delle colonne</option>';
                columnSelector.disabled = true;
            });
    }
    
    /**
     * Genera un grafico in base alla colonna e tipo selezionati
     */
    function generateChart(column, chartType) {
        fetch(`/api/data?column=${encodeURIComponent(column)}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errData => {
                        throw new Error(`Errore ${response.status}: ${errData.error || 'Errore server'}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                // Memorizza i dati per uso futuro
                chartData = data;
                
                // Prepara i dati per Chart.js
                const labels = Object.keys(data.data);
                const values = Object.values(data.data);
                
                if (labels.length === 0) {
                    showError('Nessun dato disponibile per questa colonna');
                    labelsContainer.classList.add('hidden');
                    return;
                }
                
                // Verifica se si tratta di una colonna con risposte multiple (checkbox)
                const isCheckbox = data.is_checkbox === true;
                
                // Se è una colonna checkbox, aggiorna il titolo per indicarlo
                const displayColumn = isCheckbox ? `${column} (risposte multiple)` : column;
                
                // Genera colori casuali
                const colors = generateColors(labels.length);
                
                // Distruggi il grafico esistente se presente
                if (chartInstance) {
                    chartInstance.destroy();
                }
                
                // Determina il tipo di grafico
                const isBarChart = chartType === 'bar';
                
                // Inserisci interruzioni di linea nelle etichette lunghe
                function wrapText(text, maxWidth = 20) {
                    if (!text || text.length <= maxWidth) return text;
                    
                    let result = '';
                    for (let i = 0; i < text.length; i += maxWidth) {
                        result += text.substr(i, maxWidth);
                        if (i + maxWidth < text.length) result += '\n';
                    }
                    return result;
                }
                
                // Crea un elemento DOM personalizzato per la legenda
                const customLegendContainer = document.createElement('div');
                customLegendContainer.id = 'custom-legend';
                customLegendContainer.style.position = 'absolute';
                customLegendContainer.style.right = '0px';
                customLegendContainer.style.top = '10px';
                customLegendContainer.style.maxWidth = '180px';
                customLegendContainer.style.overflow = 'auto';
                customLegendContainer.style.maxHeight = '90%';
                customLegendContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                customLegendContainer.style.borderRadius = '5px';
                customLegendContainer.style.padding = '10px';
                customLegendContainer.style.boxSizing = 'border-box';
                customLegendContainer.style.fontSize = '12px';
                
                // Svuota e prepara il contenitore per la legenda personalizzata
                const chartContainer = chartCanvas.parentNode;
                const existingLegend = document.getElementById('custom-legend');
                if (existingLegend) {
                    existingLegend.remove();
                }
                
                // Crea la legenda personalizzata per gli istogrammi
                if (isBarChart) {
                    // Aggiungi l'informazione che si tratta di risposte multiple, se applicabile
                    if (isCheckbox) {
                        const infoDiv = document.createElement('div');
                        infoDiv.style.fontSize = '11px';
                        infoDiv.style.marginBottom = '10px';
                        infoDiv.style.fontStyle = 'italic';
                        infoDiv.style.color = '#666';
                        infoDiv.textContent = 'Domanda con risposte multiple';
                        customLegendContainer.appendChild(infoDiv);
                    }
                    
                    labels.forEach((label, index) => {
                        const item = document.createElement('div');
                        item.style.display = 'flex';
                        item.style.alignItems = 'flex-start';
                        item.style.marginBottom = '8px';
                        
                        // Indicatore di colore
                        const colorBox = document.createElement('span');
                        colorBox.style.display = 'inline-block';
                        colorBox.style.width = '12px';
                        colorBox.style.height = '12px';
                        colorBox.style.backgroundColor = colors[index];
                        colorBox.style.marginRight = '8px';
                        colorBox.style.marginTop = '2px';
                        colorBox.style.flexShrink = '0';
                        
                        // Testo dell'etichetta
                        const labelText = document.createElement('span');
                        labelText.style.wordBreak = 'break-all';
                        labelText.style.lineHeight = '1.2';
                        labelText.textContent = label;
                        
                        item.appendChild(colorBox);
                        item.appendChild(labelText);
                        
                        customLegendContainer.appendChild(item);
                    });
                    
                    chartContainer.appendChild(customLegendContainer);
                }
                
                // Imposta le opzioni comuni per tutti i tipi di grafici
                const commonOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: chartType === 'pie' || chartType === 'doughnut', // Mostra la legenda solo per grafici a torta/ciambella
                            position: 'right',
                            align: 'start',
                            labels: {
                                boxWidth: 15,
                                padding: 10,
                                font: {
                                    size: 11
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: displayColumn, // Usa il titolo aggiornato
                            font: {
                                size: 16
                            },
                            padding: {
                                bottom: 10
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = '';
                                    if (isBarChart) {
                                        // Per istogrammi, usa l'etichetta originale
                                        const index = context.dataIndex;
                                        label = labels[index] || '';
                                    } else {
                                        label = context.label || '';
                                    }
                                    
                                    const value = context.raw || 0;
                                    
                                    if (isCheckbox) {
                                        // Per le domande con risposte multiple, non mostrare la percentuale sul totale 
                                        // (non ha molto senso poiché una persona può selezionare più opzioni)
                                        return `${label}: ${value}`;
                                    } else {
                                        const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = Math.round((value / total) * 100);
                                        return `${label}: ${value} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    },
                    layout: {
                        padding: {
                            top: 10,
                            right: isBarChart ? 200 : 10, // Spazio per la legenda personalizzata
                            bottom: 10,
                            left: 10
                        }
                    }
                };
                
                // Aggiungi opzioni specifiche per i grafici a barre e linee
                if (chartType === 'bar' || chartType === 'line') {
                    commonOptions.scales = {
                        x: {
                            ticks: {
                                display: !isBarChart, // Nascondi le etichette per tutti gli istogrammi
                                autoSkip: true,
                                maxRotation: 45,
                                minRotation: 45
                            },
                            grid: {
                                display: !isBarChart // Nascondi anche la griglia per tutti gli istogrammi
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    };
                }
                
                // Crea il nuovo grafico
                const ctx = chartCanvas.getContext('2d');
                chartInstance = new Chart(ctx, {
                    type: chartType,
                    data: {
                        labels: isBarChart ? labels.map(() => '') : labels, // Usa etichette vuote per istogrammi
                        datasets: [{
                            label: displayColumn, // Usa il titolo aggiornato anche qui
                            data: values,
                            backgroundColor: colors,
                            borderColor: 'white',
                            borderWidth: 1
                        }]
                    },
                    options: commonOptions
                });
                
                // Abilita il pulsante di esportazione
                exportPdfBtn.disabled = false;
                
                // Popola e mostra la lista ordinabile
                populateSortableLabels(labels, values, colors, isCheckbox);
            })
            .catch(error => {
                console.error('Errore nella generazione del grafico:', error);
                showError(`Si è verificato un errore durante la generazione del grafico: ${error.message}`);
                exportPdfBtn.disabled = true;
                labelsContainer.classList.add('hidden');
            });
    }
    
    /**
     * Popola la lista ordinabile con le etichette del grafico
     */
    function populateSortableLabels(labels, values, colors, isCheckbox = false) {
        // Pulisci la lista esistente
        sortableLabelsContainer.innerHTML = '';
        
        // Se è una domanda con checkbox, aggiungi un'informazione
        if (isCheckbox) {
            const infoElement = document.createElement('div');
            infoElement.className = 'checkbox-info';
            infoElement.textContent = 'Domanda con risposte multiple (checkbox)';
            infoElement.style.marginBottom = '10px';
            infoElement.style.fontStyle = 'italic';
            infoElement.style.fontSize = '14px';
            infoElement.style.color = '#666';
            sortableLabelsContainer.appendChild(infoElement);
        }
        
        // Crea gli elementi della lista
        labels.forEach((label, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'sortable-item';
            listItem.dataset.index = index;
            
            // Aggiungi l'indicatore di colore
            const colorIndicator = document.createElement('span');
            colorIndicator.className = 'color-indicator';
            colorIndicator.style.backgroundColor = colors[index];
            
            // Aggiungi il testo dell'etichetta
            const labelText = document.createElement('span');
            labelText.className = 'label-text';
            labelText.textContent = label;
            
            // Aggiungi il badge con il valore
            const valueBadge = document.createElement('span');
            valueBadge.className = 'value-badge';
            valueBadge.textContent = values[index];
            
            // Aggiungi gli elementi al list item
            listItem.appendChild(colorIndicator);
            listItem.appendChild(labelText);
            listItem.appendChild(valueBadge);
            
            // Aggiungi l'item alla lista
            sortableLabelsContainer.appendChild(listItem);
        });
        
        // Mostra il contenitore delle etichette
        labelsContainer.classList.remove('hidden');
        
        // Inizializza Sortable.js sulla lista
        initSortable();
    }
    
    /**
     * Inizializza Sortable.js sulla lista delle etichette
     */
    function initSortable() {
        // Distruggi l'istanza precedente se esiste
        if (sortableInstance) {
            sortableInstance.destroy();
        }
        
        // Crea una nuova istanza di Sortable
        sortableInstance = new Sortable(sortableLabelsContainer, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: function(evt) {
                // Riordina il grafico in base al nuovo ordine
                onSortUpdate(evt);
            }
        });
    }
    
    /**
     * Gestisce l'aggiornamento dell'ordine delle etichette
     */
    function onSortUpdate(evt) {
        // Ottieni il nuovo ordine
        const items = sortableLabelsContainer.querySelectorAll('.sortable-item');
        const newIndices = Array.from(items).map(item => parseInt(item.dataset.index));
        
        // Riorganizza i dati
        const oldLabels = Object.keys(chartData.data);
        const oldValues = Object.values(chartData.data);
        
        const newLabels = newIndices.map(index => oldLabels[index]);
        const newValues = newIndices.map(index => oldValues[index]);
        
        // Verifica se si tratta di una domanda con risposte multiple
        const isCheckbox = chartData.is_checkbox === true;
        
        // Aggiorna il grafico con il nuovo ordine
        updateChart(newLabels, newValues, isCheckbox);
    }
    
    /**
     * Aggiorna il grafico con le nuove etichette e valori
     */
    function updateChart(labels, values, isCheckbox = false) {
        // Genera nuovi colori
        const colors = generateColors(labels.length);
        
        // Ottieni il tipo di grafico corrente
        const chartType = chartInstance.config.type;
        
        // Aggiorna i dati
        chartInstance.data.labels = chartType === 'bar' ? labels.map(() => '') : labels;
        chartInstance.data.datasets[0].data = values;
        chartInstance.data.datasets[0].backgroundColor = colors;
        
        // Aggiorna il titolo se necessario
        const currentColumn = chartData.column;
        const displayColumn = isCheckbox ? `${currentColumn} (risposte multiple)` : currentColumn;
        chartInstance.options.plugins.title.text = displayColumn;
        
        // Aggiorna la legenda personalizzata per gli istogrammi
        if (chartType === 'bar') {
            // Trova la legenda esistente
            const existingLegend = document.getElementById('custom-legend');
            if (existingLegend) {
                existingLegend.innerHTML = '';
                
                // Aggiungi l'informazione sulla checkbox se necessario
                if (isCheckbox) {
                    const infoDiv = document.createElement('div');
                    infoDiv.style.fontSize = '11px';
                    infoDiv.style.marginBottom = '10px';
                    infoDiv.style.fontStyle = 'italic';
                    infoDiv.style.color = '#666';
                    infoDiv.textContent = 'Domanda con risposte multiple';
                    existingLegend.appendChild(infoDiv);
                }
                
                // Crea le nuove etichette
                labels.forEach((label, index) => {
                    const item = document.createElement('div');
                    item.style.display = 'flex';
                    item.style.alignItems = 'flex-start';
                    item.style.marginBottom = '8px';
                    
                    // Indicatore di colore
                    const colorBox = document.createElement('span');
                    colorBox.style.display = 'inline-block';
                    colorBox.style.width = '12px';
                    colorBox.style.height = '12px';
                    colorBox.style.backgroundColor = colors[index];
                    colorBox.style.marginRight = '8px';
                    colorBox.style.marginTop = '2px';
                    colorBox.style.flexShrink = '0';
                    
                    // Testo dell'etichetta
                    const labelText = document.createElement('span');
                    labelText.style.wordBreak = 'break-all';
                    labelText.style.lineHeight = '1.2';
                    labelText.textContent = label;
                    
                    item.appendChild(colorBox);
                    item.appendChild(labelText);
                    
                    existingLegend.appendChild(item);
                });
            }
        }
        
        // Aggiorna il grafico
        chartInstance.update();
        
        // Aggiorna i dati memorizzati
        chartData.data = labels.reduce((obj, label, index) => {
            obj[label] = values[index];
            return obj;
        }, {});
    }
    
    /**
     * Esporta il grafico corrente come PDF
     */
    function exportChartAsPdf() {
        if (!chartInstance) {
            showError('Nessun grafico da esportare');
            return;
        }
        
        // Mostra un indicatore di caricamento
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'export-loading';
        loadingIndicator.style.position = 'fixed';
        loadingIndicator.style.top = '50%';
        loadingIndicator.style.left = '50%';
        loadingIndicator.style.transform = 'translate(-50%, -50%)';
        loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        loadingIndicator.style.color = 'white';
        loadingIndicator.style.padding = '20px';
        loadingIndicator.style.borderRadius = '10px';
        loadingIndicator.style.zIndex = '1000';
        loadingIndicator.textContent = 'Esportazione in corso...';
        document.body.appendChild(loadingIndicator);
        
        const chartContainer = chartCanvas.parentNode;
        const isCheckbox = chartData.is_checkbox === true;
        
        // Ottieni il titolo corretto
        const columnName = chartData.column;
        const displayTitle = isCheckbox ? `${columnName} (risposte multiple)` : columnName;
        
        // Crea un contenitore temporaneo strutturato per l'esportazione
        const tempContainer = document.createElement('div');
        tempContainer.style.width = '800px';
        tempContainer.style.height = '650px'; // Aumentato per fare spazio al titolo
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.padding = '10px';
        tempContainer.style.boxSizing = 'border-box';
        document.body.appendChild(tempContainer);
        
        // Aggiungi un titolo centrato in alto
        const titleElement = document.createElement('div');
        titleElement.style.width = '100%';
        titleElement.style.textAlign = 'center';
        titleElement.style.fontSize = '24px';
        titleElement.style.fontWeight = 'bold';
        titleElement.style.marginBottom = '20px';
        titleElement.style.paddingTop = '10px';
        titleElement.style.paddingBottom = '5px';
        titleElement.style.borderBottom = '1px solid #ddd';
        titleElement.textContent = displayTitle;
        tempContainer.appendChild(titleElement);
        
        // Crea un contenitore per il grafico e la legenda
        const chartLegendContainer = document.createElement('div');
        chartLegendContainer.style.display = 'flex';
        chartLegendContainer.style.width = '100%';
        chartLegendContainer.style.height = 'calc(100% - 60px)'; // Sottrai lo spazio per il titolo
        tempContainer.appendChild(chartLegendContainer);
        
        // Area per il grafico (a sinistra)
        const chartArea = document.createElement('div');
        chartArea.style.flex = '1';
        chartArea.style.height = '100%';
        chartLegendContainer.appendChild(chartArea);
        
        // Canvas per il grafico
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 550; // Ridotto per fare spazio alla legenda
        exportCanvas.height = 550;
        chartArea.appendChild(exportCanvas);
        
        // Area per la legenda (a destra)
        const legendArea = document.createElement('div');
        legendArea.style.width = '230px';
        legendArea.style.paddingLeft = '15px';
        legendArea.style.height = '100%';
        legendArea.style.overflowY = 'auto';
        chartLegendContainer.appendChild(legendArea);
        
        // Prepara i dati per l'esportazione
        const labels = Object.keys(chartData.data);
        const values = Object.values(chartData.data);
        const colors = generateColors(labels.length);
        const chartType = chartInstance.config.type;
        
        // Crea la legenda personalizzata
        if (chartType === 'bar') {
            // Aggiungi l'informazione che si tratta di risposte multiple, se applicabile
            if (isCheckbox) {
                const infoDiv = document.createElement('div');
                infoDiv.style.fontSize = '12px';
                infoDiv.style.marginBottom = '15px';
                infoDiv.style.fontStyle = 'italic';
                infoDiv.style.color = '#666';
                infoDiv.textContent = 'Domanda con risposte multiple';
                legendArea.appendChild(infoDiv);
            }
            
            // Crea le etichette della legenda
            labels.forEach((label, index) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.alignItems = 'flex-start';
                item.style.marginBottom = '8px';
                
                // Indicatore di colore
                const colorBox = document.createElement('span');
                colorBox.style.display = 'inline-block';
                colorBox.style.width = '12px';
                colorBox.style.height = '12px';
                colorBox.style.backgroundColor = colors[index];
                colorBox.style.marginRight = '8px';
                colorBox.style.marginTop = '2px';
                colorBox.style.flexShrink = '0';
                
                // Testo dell'etichetta
                const labelText = document.createElement('span');
                labelText.style.wordBreak = 'break-word';
                labelText.style.lineHeight = '1.2';
                labelText.textContent = `${label} (${values[index]})`;
                
                item.appendChild(colorBox);
                item.appendChild(labelText);
                
                legendArea.appendChild(item);
            });
        }
        
        // Imposta le opzioni per l'esportazione
        const exportOptions = {
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: chartType === 'pie' || chartType === 'doughnut',
                    position: 'right',
                    align: 'start',
                    labels: {
                        boxWidth: 15,
                        padding: 10,
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: false, // Nascondi il titolo del grafico, usiamo quello personalizzato
                },
                tooltip: {
                    enabled: false
                }
            }
        };
        
        // Aggiungi opzioni specifiche per i grafici a barre e linee
        if (chartType === 'bar' || chartType === 'line') {
            exportOptions.scales = {
                x: {
                    ticks: {
                        display: chartType !== 'bar', // Nascondi le etichette per gli istogrammi
                        autoSkip: true,
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: chartType !== 'bar' // Nascondi la griglia per gli istogrammi
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            };
        }
        
        // Crea il grafico temporaneo per l'esportazione
        const ctx = exportCanvas.getContext('2d');
        const exportChart = new Chart(ctx, {
            type: chartType,
            data: {
                labels: chartType === 'bar' ? labels.map(() => '') : labels,
                datasets: [{
                    label: displayTitle,
                    data: values,
                    backgroundColor: colors,
                    borderColor: 'white',
                    borderWidth: 1
                }]
            },
            options: exportOptions
        });
        
        // Aspetta il render del grafico
        setTimeout(() => {
            // Crea un nuovo documento PDF
            const pdf = new jspdf.jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            
            // Aggiungi metadati al PDF
            pdf.setProperties({
                title: `Grafico ${displayTitle}`,
                subject: 'Esportazione grafico Bike2Work',
                creator: 'Bike2Work App',
                author: 'Bike2Work'
            });
            
            // Aggiungi data e ora di esportazione
            const now = new Date();
            const dateStr = now.toLocaleDateString('it-IT');
            const timeStr = now.toLocaleTimeString('it-IT');
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Esportato il ${dateStr} alle ${timeStr}`, 10, 10);
            
            // Usa html2canvas per catturare l'intero container con titolo, grafico e legenda
            html2canvas(tempContainer, {
                backgroundColor: 'white',
                scale: 2, // Migliora la qualità dell'immagine
                logging: false,
                useCORS: true
            }).then(canvas => {
                // Converti il canvas in un'immagine
                const imgData = canvas.toDataURL('image/png');
                
                // Calcola le dimensioni e la posizione corretta nel PDF
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                // Calcola le dimensioni mantenendo le proporzioni
                const ratio = canvas.width / canvas.height;
                let imgWidth = pdfWidth - 20; // Margine di 10mm su ciascun lato
                let imgHeight = imgWidth / ratio;
                
                // Se l'altezza è maggiore della pagina, adatta l'altezza
                if (imgHeight > pdfHeight - 30) { // Margine di 15mm sopra e sotto
                    imgHeight = pdfHeight - 30;
                    imgWidth = imgHeight * ratio;
                }
                
                // Calcola la posizione centrata
                const x = (pdfWidth - imgWidth) / 2;
                const y = 20; // Margine superiore di 20mm
                
                // Aggiungi l'immagine al PDF
                pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
                
                // Salva il PDF
                pdf.save(`grafico_${displayTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
                
                // Pulisci
                document.body.removeChild(tempContainer);
                document.body.removeChild(loadingIndicator);
                exportChart.destroy();
            }).catch(error => {
                console.error('Errore nell\'esportazione del grafico:', error);
                document.body.removeChild(tempContainer);
                document.body.removeChild(loadingIndicator);
                exportChart.destroy();
                showError('Si è verificato un errore durante l\'esportazione del grafico');
            });
        }, 500);
    }
    
    /**
     * Mostra un messaggio di errore all'utente
     */
    function showError(message) {
        // Se c'è già un elemento di errore, rimuovilo
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Crea un nuovo elemento di errore
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        
        // Aggiungi il pulsante di chiusura (x)
        const closeButton = document.createElement('span');
        closeButton.className = 'error-close-btn';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', function() {
            errorDiv.classList.add('fade-out');
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 300);
        });
        
        // Aggiungi il contenuto del messaggio
        const messageSpan = document.createElement('span');
        messageSpan.innerHTML = message;
        
        // Aggiungi entrambi all'elemento di errore
        errorDiv.appendChild(closeButton);
        errorDiv.appendChild(messageSpan);
        
        // Aggiungi il messaggio di errore prima del container del grafico
        const chartContainer = document.querySelector('.chart-container');
        chartContainer.parentNode.insertBefore(errorDiv, chartContainer);
        
        // Nascondi l'errore dopo 10 secondi
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.classList.add('fade-out');
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.remove();
                    }
                }, 300);
            }
        }, 10000);
    }
    
    /**
     * Genera colori casuali per il grafico
     */
    function generateColors(count) {
        // Palette di colori predefinita per i primi 10 elementi
        const palette = [
            'rgba(255, 99, 132, 0.7)',   // Rosso
            'rgba(75, 192, 192, 0.7)',   // Verde acqua
            'rgba(255, 159, 64, 0.7)',   // Arancione
            'rgba(54, 162, 235, 0.7)',   // Blu
            'rgba(153, 102, 255, 0.7)',  // Viola
            'rgba(255, 205, 86, 0.7)',   // Giallo
            'rgba(201, 203, 207, 0.7)',  // Grigio
            'rgba(255, 99, 255, 0.7)',   // Rosa
            'rgba(75, 192, 75, 0.7)',    // Verde
            'rgba(54, 72, 235, 0.7)'     // Blu scuro
        ];
        
        // Se ci sono più elementi di quanti colori predefiniti abbiamo,
        // genera colori casuali per i rimanenti
        const colors = [...palette];
        
        if (count > palette.length) {
            for (let i = palette.length; i < count; i++) {
                const r = Math.floor(Math.random() * 255);
                const g = Math.floor(Math.random() * 255);
                const b = Math.floor(Math.random() * 255);
                colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
            }
        }
        
        // Restituisci solo il numero di colori necessari
        return colors.slice(0, count);
    }
}); 