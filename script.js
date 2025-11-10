// Variáveis globais
let measurements = [];
let alarmReferences = [];
let vibrationChartInstance = null;
let spectrumChartInstance = null;
let logoImageData = null;
let equipmentImagesData = [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Definir data atual
    document.getElementById('reportDate').valueAsDate = new Date();
    
    // Adicionar primeira medição e referência de exemplo
    addMeasurement();
    addAlarmReference();
    
    // Carregar dados salvos se existirem
    const savedData = localStorage.getItem('reportData');
    if (savedData) {
        console.log('Dados salvos encontrados no localStorage');
    }
});

// Upload de Logo
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem válido.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        logoImageData = e.target.result;
        const logoImage = document.getElementById('logoImage');
        const logoPlaceholder = document.getElementById('logoPlaceholder');
        
        logoImage.src = logoImageData;
        logoImage.style.display = 'block';
        logoPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// Upload de Imagens do Equipamento
function handleEquipmentImages(event) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        if (!file.type.startsWith('image/')) {
            alert(`Arquivo ${file.name} não é uma imagem válida.`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            equipmentImagesData.push(imageData);
            displayEquipmentImage(imageData, equipmentImagesData.length - 1);
        };
        reader.readAsDataURL(file);
    });
}

// Exibir imagem do equipamento
function displayEquipmentImage(imageData, index) {
    const container = document.getElementById('imagePreviewContainer');
    
    const imageItem = document.createElement('div');
    imageItem.className = 'image-preview-item';
    imageItem.id = `image-${index}`;
    
    const img = document.createElement('img');
    img.src = imageData;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'image-remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = function() {
        removeEquipmentImage(index);
    };
    
    imageItem.appendChild(img);
    imageItem.appendChild(removeBtn);
    container.appendChild(imageItem);
}

// Remover imagem do equipamento
function removeEquipmentImage(index) {
    equipmentImagesData.splice(index, 1);
    const imageElement = document.getElementById(`image-${index}`);
    if (imageElement) {
        imageElement.remove();
    }
    
    // Re-renderizar todas as imagens
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = '';
    equipmentImagesData.forEach((imageData, i) => {
        displayEquipmentImage(imageData, i);
    });
}

// Atualizar cor do alarme
function updateAlarmColor() {
    const alarmLevel = document.getElementById('alarmLevel').value;
    const indicator = document.getElementById('alarmIndicator');
    
    indicator.className = 'alarm-indicator ' + alarmLevel;
    
    // Gerar recomendações automáticas baseadas no nível de alarme
    generateAutoRecommendations(alarmLevel);
}

// Adicionar medição
function addMeasurement() {
    const table = document.getElementById('measurementsTable');
    const row = table.insertRow();
    const index = measurements.length;
    
    row.innerHTML = `
        <td><input type="date" id="mDate${index}" class="measurement-date"></td>
        <td><input type="number" step="0.01" id="mValue${index}" class="measurement-value" placeholder="0.00" onchange="checkAlarmLevel(${index})"></td>
        <td>
            <select id="mAlarm${index}" class="measurement-alarm">
                <option value="NORMAL">NORMAL</option>
                <option value="ALERTA 1">ALERTA 1</option>
                <option value="ALERTA 2">ALERTA 2</option>
                <option value="ALTO RISCO">ALTO RISCO</option>
            </select>
        </td>
        <td><span id="mStatus${index}" class="status-badge">-</span></td>
    `;
    
    measurements.push({ date: '', value: 0, alarm: 'NORMAL', status: '-' });
    
    // Definir data atual
    document.getElementById(`mDate${index}`).valueAsDate = new Date();
}

// Verificar nível de alarme baseado no valor
function checkAlarmLevel(index) {
    const value = parseFloat(document.getElementById(`mValue${index}`).value);
    const statusSpan = document.getElementById(`mStatus${index}`);
    const alarmSelect = document.getElementById(`mAlarm${index}`);
    
    if (isNaN(value)) return;
    
    let alarm = 'NORMAL';
    let statusClass = 'status-normal';
    
    if (value >= 15) {
        alarm = 'ALTO RISCO';
        statusClass = 'status-critical';
    } else if (value >= 10) {
        alarm = 'ALERTA 2';
        statusClass = 'status-alert2';
    } else if (value >= 7) {
        alarm = 'ALERTA 1';
        statusClass = 'status-alert1';
    }
    
    alarmSelect.value = alarm;
    statusSpan.textContent = alarm;
    statusSpan.className = 'status-badge ' + statusClass;
    
    measurements[index] = {
        date: document.getElementById(`mDate${index}`).value,
        value: value,
        alarm: alarm,
        status: alarm
    };
}

// Adicionar referência de alarme
function addAlarmReference() {
    const table = document.getElementById('alarmReferencesTable');
    const row = table.insertRow();
    const index = alarmReferences.length;
    
    row.innerHTML = `
        <td><input type="text" id="aPoint${index}" placeholder="Ponto de medição"></td>
        <td><input type="number" step="0.1" id="aNormal${index}" placeholder="0.0"></td>
        <td><input type="number" step="0.1" id="aAlert${index}" placeholder="0.0"></td>
        <td><input type="number" step="0.1" id="aRisk${index}" placeholder="0.0"></td>
    `;
    
    alarmReferences.push({ point: '', normal: 0, alert: 0, risk: 0 });
}

// Gerar gráfico
function generateChart(type) {
    if (type === 'vibration') {
        generateVibrationChart();
    } else if (type === 'spectrum') {
        generateSpectrumChart();
    }
}

// Gráfico de vibração temporal
function generateVibrationChart() {
    const ctx = document.getElementById('vibrationChart').getContext('2d');
    
    if (vibrationChartInstance) {
        vibrationChartInstance.destroy();
    }
    
    const labels = measurements.map((m, i) => m.date || `Medição ${i+1}`);
    const data = measurements.map(m => m.value);
    
    vibrationChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vibração (mm/s)',
                data: data,
                borderColor: '#0066cc',
                backgroundColor: 'rgba(0, 102, 204, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Histórico de Vibração',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amplitude (mm/s)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Data'
                    }
                }
            }
        }
    });
}

// Gráfico de espectro de frequência
function generateSpectrumChart() {
    const ctx = document.getElementById('spectrumChart').getContext('2d');
    
    if (spectrumChartInstance) {
        spectrumChartInstance.destroy();
    }
    
    const frequencies = Array.from({length: 50}, (_, i) => i * 2);
    const amplitudes = frequencies.map(() => Math.random() * 10);
    
    spectrumChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: frequencies.map(f => f + ' Hz'),
            datasets: [{
                label: 'Amplitude',
                data: amplitudes,
                backgroundColor: 'rgba(0, 102, 204, 0.7)',
                borderColor: '#0066cc',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Espectro de Frequência',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amplitude (mm/s)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Frequência (Hz)'
                    }
                }
            }
        }
    });
}

// Gerar recomendações automáticas
function generateAutoRecommendations(alarmLevel) {
    const recommendationBox = document.getElementById('autoRecommendations');
    let recommendations = '';
    
    switch(alarmLevel) {
        case 'normal':
            recommendations = `
                <p><strong>Status Normal - Recomendações:</strong></p>
                <p>✓ Manter rotina de inspeção programada</p>
                <p>✓ Continuar monitoramento periódico</p>
                <p>✓ Registrar dados para análise de tendência</p>
            `;
            break;
        case 'alerta':
            recommendations = `
                <p><strong>Status Alerta - Recomendações:</strong></p>
                <p>⚠ Aumentar frequência de monitoramento</p>
                <p>⚠ Verificar condições operacionais do equipamento</p>
                <p>⚠ Inspecionar componentes críticos (rolamentos, alinhamento)</p>
                <p>⚠ Planejar intervenção preventiva em até 30 dias</p>
            `;
            break;
        case 'critico':
            recommendations = `
                <p><strong>Status Crítico - Ações Urgentes:</strong></p>
                <p>🔴 INTERVENÇÃO IMEDIATA NECESSÁRIA</p>
                <p>🔴 Avaliar desligamento do equipamento</p>
                <p>🔴 Realizar análise detalhada de vibração</p>
                <p>🔴 Verificar balanceamento, alinhamento e folgas</p>
                <p>🔴 Substituir componentes defeituosos</p>
                <p>🔴 Programar manutenção corretiva urgente (1-3 dias)</p>
            `;
            break;
    }
    
    recommendationBox.innerHTML = recommendations;
}

// Gerar PDF usando html2pdf
async function generatePDF() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';
    
    try {
        const element = document.querySelector('.container');
        
        // Configurações do PDF
        const options = {
            margin: [10, 10, 10, 10],
            filename: `Relatorio_${document.getElementById('reportNumber').value || 'Preditivo'}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait'
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        
        // Gerar PDF
        await html2pdf().set(options).from(element).save();
        
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            alert('PDF gerado com sucesso!');
        }, 1000);
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        loadingOverlay.style.display = 'none';
        alert('Erro ao gerar PDF. Por favor, tente novamente.');
    }
}

// Salvar dados
function saveData() {
    const data = {
        reportNumber: document.getElementById('reportNumber').value,
        alarmLevel: document.getElementById('alarmLevel').value,
        reportDate: document.getElementById('reportDate').value,
        inspector: document.getElementById('inspector').value,
        tagNumber: document.getElementById('tagNumber').value,
        orderNumber: document.getElementById('orderNumber').value,
        equipment: document.getElementById('equipment').value,
        component: document.getElementById('component').value,
        tag: document.getElementById('tag').value,
        defects: document.getElementById('defects').value,
        customRecommendations: document.getElementById('customRecommendations').value,
        measurements: measurements,
        alarmReferences: alarmReferences,
        logoImageData: logoImageData,
        equipmentImagesData: equipmentImagesData
    };
    
    localStorage.setItem('reportData', JSON.stringify(data));
    alert('Dados salvos com sucesso!');
}

// Carregar dados
function loadData() {
    const savedData = localStorage.getItem('reportData');
    
    if (!savedData) {
        alert('Nenhum dado salvo encontrado.');
        return;
    }
    
    const data = JSON.parse(savedData);
    
    document.getElementById('reportNumber').value = data.reportNumber || '';
    document.getElementById('alarmLevel').value = data.alarmLevel || 'normal';
    document.getElementById('reportDate').value = data.reportDate || '';
    document.getElementById('inspector').value = data.inspector || '';
    document.getElementById('tagNumber').value = data.tagNumber || '';
    document.getElementById('orderNumber').value = data.orderNumber || '';
    document.getElementById('equipment').value = data.equipment || '';
    document.getElementById('component').value = data.component || '';
    document.getElementById('tag').value = data.tag || '';
    document.getElementById('defects').value = data.defects || '';
    document.getElementById('customRecommendations').value = data.customRecommendations || '';
    
    // Carregar logo
    if (data.logoImageData) {
        logoImageData = data.logoImageData;
        const logoImage = document.getElementById('logoImage');
        const logoPlaceholder = document.getElementById('logoPlaceholder');
        logoImage.src = logoImageData;
        logoImage.style.display = 'block';
        logoPlaceholder.style.display = 'none';
    }
    
    // Carregar imagens do equipamento
    if (data.equipmentImagesData && data.equipmentImagesData.length > 0) {
        equipmentImagesData = data.equipmentImagesData;
        const container = document.getElementById('imagePreviewContainer');
        container.innerHTML = '';
        equipmentImagesData.forEach((imageData, i) => {
            displayEquipmentImage(imageData, i);
        });
    }
    
    updateAlarmColor();
    alert('Dados carregados com sucesso!');
}

// Limpar formulário
function clearForm() {
    if (confirm('Tem certeza que deseja limpar todos os dados do formulário?')) {
        localStorage.removeItem('reportData');
        location.reload();
    }
}
