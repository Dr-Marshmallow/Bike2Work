document.addEventListener('DOMContentLoaded', function() {
    // Riferimenti agli elementi DOM
    const columnSelector = document.getElementById('column-selector');
    const chartTypeSelector = document.getElementById('chart-type-selector');
    const generateChartBtn = document.getElementById('generate-chart');
    const chartCanvas = document.getElementById('data-chart');
    const exportPngBtn = document.getElementById('export-png');
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
    
    // Event Listener per il pulsante di esportazione PNG
    exportPngBtn.addEventListener('click', function() {
        if (chartInstance) {
            exportChartAsPNG();
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
                            text: `${column}`,
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
                                    const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${value} (${percentage}%)`;
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
                            label: column,
                            data: values,
                            backgroundColor: colors,
                            borderColor: 'white',
                            borderWidth: 1
                        }]
                    },
                    options: commonOptions
                });
                
                // Abilita il pulsante di esportazione
                exportPngBtn.disabled = false;
                
                // Popola e mostra la lista ordinabile
                populateSortableLabels(labels, values, colors);
            })
            .catch(error => {
                console.error('Errore nella generazione del grafico:', error);
                showError(`Si è verificato un errore durante la generazione del grafico: ${error.message}`);
                exportPngBtn.disabled = true;
                labelsContainer.classList.add('hidden');
            });
    }
    
    /**
     * Popola la lista ordinabile con le etichette del grafico
     */
    function populateSortableLabels(labels, values, colors) {
        // Pulisci la lista esistente
        sortableLabelsContainer.innerHTML = '';
        
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
                updateChartOrder();
            }
        });
    }
    
    /**
     * Aggiorna l'ordine del grafico in base all'ordine delle etichette
     */
    function updateChartOrder() {
        if (!chartInstance || !chartData) return;
        
        // Ottieni il nuovo ordine delle etichette
        const items = Array.from(sortableLabelsContainer.querySelectorAll('.sortable-item'));
        const newOrder = items.map(item => parseInt(item.dataset.index, 10));
        
        // Ottieni i dati attuali del grafico
        const currentLabels = [...chartInstance.data.labels];
        const currentData = [...chartInstance.data.datasets[0].data];
        const currentColors = [...chartInstance.data.datasets[0].backgroundColor];
        
        // Riordina i dati in base al nuovo ordine
        const newLabels = newOrder.map(index => currentLabels[index]);
        const newData = newOrder.map(index => currentData[index]);
        const newColors = newOrder.map(index => currentColors[index]);
        
        // Aggiorna il grafico con il nuovo ordine
        chartInstance.data.labels = newLabels;
        chartInstance.data.datasets[0].data = newData;
        chartInstance.data.datasets[0].backgroundColor = newColors;
        
        // Aggiorna il grafico
        chartInstance.update();
        
        // Aggiorna anche la legenda personalizzata se esiste
        updateCustomLegend(newOrder);
    }
    
    /**
     * Aggiorna la legenda personalizzata in base al nuovo ordine
     */
    function updateCustomLegend(newOrder) {
        const customLegend = document.getElementById('custom-legend');
        if (!customLegend) return;
        
        // Ottieni tutti gli elementi della legenda
        const items = Array.from(customLegend.children);
        if (items.length !== newOrder.length) return;
        
        // Crea un array temporaneo degli elementi nel nuovo ordine
        const newItems = newOrder.map(index => items[index]);
        
        // Svuota la legenda
        customLegend.innerHTML = '';
        
        // Aggiungi gli elementi nel nuovo ordine
        newItems.forEach(item => {
            customLegend.appendChild(item);
        });
    }
    
    /**
     * Esporta il grafico corrente come immagine PNG
     */
    function exportChartAsPNG() {
        try {
            // Ottieni il titolo del grafico per il nome del file
            const title = chartInstance.options.plugins.title.text || 'grafico';
            const fileName = title.replace(/:/g, '-').replace(/\s+/g, '_') + '.png';
            
            // Crea un link temporaneo
            const link = document.createElement('a');
            link.download = fileName;
            
            // Converti il canvas in URL data
            link.href = chartCanvas.toDataURL('image/png');
            
            // Simula il click sul link per avviare il download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Errore durante l\'esportazione:', error);
            showError(`Si è verificato un errore durante l'esportazione del grafico: ${error.message}`);
        }
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