
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

interface TripData {
    id: string; // Unique ID for each entry
    // Original Inputs from form
    denNedeli: string;
    data: string;
    probeg: number;
    raskhod: number;
    cenaAI92: number;
    vremyaVPuti: number;
    smenaCh: number;
    zakazovDo23: number;
    zakazovPosle23: number;
    // summaVyplatFakt: number; // Removed from TripData

    // Calculated values
    zakazovVsego: number;
    summaVyplatRaschetnaya: number;
}

interface ActualPayout {
    id: string;
    date: string;
    amount: number;
}


document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const S1_PROBEG_DO_RABOTY = 22;
    const T1_CENA_ZAKAZA_DO_23 = 180;
    const U1_CENA_ZAKAZA_POSLE_23 = 208.54;
    const V1_SREDNYAYA_KOMPENSATSIA_TOPLIVO = 37;
    const TRIP_DATA_LS_KEY = 'tripData';
    const RECORDED_PAYOUTS_LS_KEY = 'recordedPayouts';
    const DNI_NEDELI_MAP = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];


    // --- DOM Elements ---
    const calculatorView = document.getElementById('calculator-view') as HTMLElement;
    const summaryView = document.getElementById('summary-view') as HTMLElement;
    const payoutsView = document.getElementById('payouts-view') as HTMLElement;

    const navCalculatorButton = document.getElementById('nav-calculator-button') as HTMLButtonElement;
    const navSummaryButton = document.getElementById('nav-summary-button') as HTMLButtonElement;
    const navPayoutsButton = document.getElementById('nav-payouts-button') as HTMLButtonElement;

    // Calculator View
    const denNedeliInput = document.getElementById('denNedeliInput') as HTMLSelectElement;
    const dataInput = document.getElementById('dataInput') as HTMLInputElement;
    const probegInput = document.getElementById('probegInput') as HTMLInputElement;
    const raskhodInput = document.getElementById('raskhodInput') as HTMLInputElement;
    const cenaAI92Input = document.getElementById('cenaAI92Input') as HTMLInputElement;
    const vremyaVPutiInput = document.getElementById('vremyaVPutiInput') as HTMLInputElement;
    const smenaChInput = document.getElementById('smenaChInput') as HTMLInputElement;
    const zakazovDo23Input = document.getElementById('zakazovDo23Input') as HTMLInputElement;
    const zakazovPosle23Input = document.getElementById('zakazovPosle23Input') as HTMLInputElement;
    const saveButton = document.getElementById('save-button') as HTMLButtonElement;
    
    const zakazovVsegoResultSpan = document.getElementById('zakazovVsegoResult') as HTMLSpanElement;
    const srRasstoyanieResultSpan = document.getElementById('srRasstoyanieResult') as HTMLSpanElement;
    const toplivaZatrachenoResultSpan = document.getElementById('toplivaZatrachenoResult') as HTMLSpanElement;
    const gsmResultSpan = document.getElementById('gsmResult') as HTMLSpanElement;
    const summaVyplatRaschetnayaResultSpan = document.getElementById('summaVyplatRaschetnayaResult') as HTMLSpanElement;
    const summaChistymiRaschetnayaResultSpan = document.getElementById('summaChistymiRaschetnayaResult') as HTMLSpanElement;
    const prosentZatratResultSpan = document.getElementById('protsentZatratResult') as HTMLSpanElement;
    const vChasChistymiResultSpan = document.getElementById('vChasChistymiResult') as HTMLSpanElement;

    // Summary View
    const actualPayoutDateInput = document.getElementById('actualPayoutDateInput') as HTMLInputElement;
    const actualPayoutAmountInput = document.getElementById('actualPayoutAmountInput') as HTMLInputElement;
    const recordActualPayoutButton = document.getElementById('recordActualPayoutButton') as HTMLButtonElement;
    const totalActualPayoutsSumSpan = document.getElementById('total-actual-payouts-sum') as HTMLSpanElement;
    const netBalanceAmountSpan = document.getElementById('net-balance-amount') as HTMLSpanElement;
    
    const dateFilterFromInput = document.getElementById('dateFilterFrom') as HTMLInputElement;
    const dateFilterToInput = document.getElementById('dateFilterTo') as HTMLInputElement;
    const applyDateFilterButton = document.getElementById('applyDateFilterButton') as HTMLButtonElement;
    const resetDateFilterButton = document.getElementById('resetDateFilterButton') as HTMLButtonElement;
    
    const summaryTableBody = document.querySelector('#summary-table tbody') as HTMLTableSectionElement;
    const totalOrdersSpan = document.getElementById('total-orders') as HTMLSpanElement;
    const totalPayoutSpan = document.getElementById('total-payout') as HTMLSpanElement;
    const noDataMessage = document.getElementById('no-data-message') as HTMLParagraphElement;

    // Payouts View
    const payoutsTableBody = document.querySelector('#payouts-table tbody') as HTMLTableSectionElement;
    const noPayoutsMessage = document.getElementById('no-payouts-message') as HTMLParagraphElement;
    const payoutsFilterInfo = document.getElementById('payouts-filter-info') as HTMLParagraphElement;
    const editPayoutSection = document.getElementById('edit-payout-section') as HTMLElement;
    const editingPayoutIdInput = document.getElementById('editingPayoutId') as HTMLInputElement;
    const editingPayoutDateInput = document.getElementById('editingPayoutDateInput') as HTMLInputElement;
    const editingPayoutAmountInput = document.getElementById('editingPayoutAmountInput') as HTMLInputElement;
    const savePayoutEditButton = document.getElementById('savePayoutEditButton') as HTMLButtonElement;
    const cancelPayoutEditButton = document.getElementById('cancelPayoutEditButton') as HTMLButtonElement;


    // --- State & Helper Functions ---
    let currentCalculatedData: { C1_zakazovVsego: number; N1_summaVyplatRaschetnaya: number; } | null = null;
    let editingTripId: string | null = null;
    let editingPayoutId: string | null = null;

    const getTripData = (): TripData[] => JSON.parse(localStorage.getItem(TRIP_DATA_LS_KEY) || '[]');
    const saveTripDataToLS = (data: TripData[]): void => localStorage.setItem(TRIP_DATA_LS_KEY, JSON.stringify(data));
    
    const getRecordedPayouts = (): ActualPayout[] => JSON.parse(localStorage.getItem(RECORDED_PAYOUTS_LS_KEY) || '[]');
    const saveRecordedPayouts = (payouts: ActualPayout[]): void => localStorage.setItem(RECORDED_PAYOUTS_LS_KEY, JSON.stringify(payouts));

    const formatDateForFilename = (date: Date): string => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

    const updateDenNedeliFromDate = (dateString: string) => {
        if (dateString && denNedeliInput) {
            const dateObj = new Date(dateString);
            const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
            const correctedDate = new Date(dateObj.getTime() + userTimezoneOffset);
            denNedeliInput.value = DNI_NEDELI_MAP[correctedDate.getDay()] || DNI_NEDELI_MAP[0];
        }
    };
    
    const exportToCSV = (data: TripData[]) => {
        if (data.length === 0) return;
        const headers = ["День недели", "Дата", "Количество заказов", "Сумма выплат расчетная (р.)"];
        const csvRows = [
            headers.join(','),
            ...data.map(row => [
                `"${row.denNedeli.replace(/"/g, '""')}"`, 
                row.data,
                row.zakazovVsego,
                row.summaVyplatRaschetnaya.toFixed(2)
            ].join(','))
        ];
        const csvString = `\uFEFF${csvRows.join('\n')}`;
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' }); 
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `trip_summary_${formatDateForFilename(new Date())}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const clearResultSpans = () => {
        [zakazovVsegoResultSpan, srRasstoyanieResultSpan, toplivaZatrachenoResultSpan,
         gsmResultSpan, summaVyplatRaschetnayaResultSpan, summaChistymiRaschetnayaResultSpan,
         prosentZatratResultSpan, vChasChistymiResultSpan].forEach(span => {
            if (span) {
                span.textContent = '_';
                span.style.color = '';
            }
        });
        currentCalculatedData = null;
    };

    const displayInputErrorInResults = (message: string = 'Ошибка ввода') => {
        [zakazovVsegoResultSpan, srRasstoyanieResultSpan, toplivaZatrachenoResultSpan,
         gsmResultSpan, summaVyplatRaschetnayaResultSpan, summaChistymiRaschetnayaResultSpan,
         prosentZatratResultSpan, vChasChistymiResultSpan].forEach(span => {
            if (span) {
                span.textContent = message;
                span.style.color = 'red';
            }
        });
        currentCalculatedData = null;
    };

    const resetCalculatorForm = (setDateToToday: boolean = true) => {
        if (setDateToToday && dataInput) {
            dataInput.value = new Date().toISOString().split('T')[0];
            updateDenNedeliFromDate(dataInput.value);
        }
        probegInput.value = '0';
        raskhodInput.value = '0';
        cenaAI92Input.value = '0';
        vremyaVPutiInput.value = '0';
        smenaChInput.value = '0';
        zakazovDo23Input.value = '0';
        zakazovPosle23Input.value = '0';
        
        clearResultSpans();
        editingTripId = null;
        saveButton.textContent = 'Записать';
        if (denNedeliInput) denNedeliInput.disabled = true;
    };

    const calculateResults = (): boolean => {
        clearResultSpans();
        const D1_probeg = parseFloat(probegInput.value);
        const E1_raskhod = parseFloat(raskhodInput.value);
        const G1_cenaAI92 = parseFloat(cenaAI92Input.value);
        const K1_smenaCh = parseFloat(smenaChInput.value);
        const L1_zakazovDo23 = parseInt(zakazovDo23Input.value, 10);
        const M1_zakazovPosle23 = parseInt(zakazovPosle23Input.value, 10);

        if ([D1_probeg, E1_raskhod, G1_cenaAI92, K1_smenaCh, L1_zakazovDo23, M1_zakazovPosle23].some(isNaN) ||
            [D1_probeg, E1_raskhod, G1_cenaAI92, K1_smenaCh, L1_zakazovDo23, M1_zakazovPosle23].some(v => v < 0)) {
            displayInputErrorInResults("Значения не могут быть отрицательными или пустыми.");
            return false;
        }
      
        const C1_zakazovVsego = L1_zakazovDo23 + M1_zakazovPosle23;
        zakazovVsegoResultSpan.textContent = C1_zakazovVsego.toString();

        let F1_srRasstoyanie = 0;
        if (C1_zakazovVsego > 0 && (D1_probeg - S1_PROBEG_DO_RABOTY) >= 0) {
            F1_srRasstoyanie = (D1_probeg - S1_PROBEG_DO_RABOTY) / C1_zakazovVsego / 2;
        }
        srRasstoyanieResultSpan.textContent = F1_srRasstoyanie.toFixed(1) + ' км';
        
        const H1_toplivaZatracheno = (D1_probeg / 100) * E1_raskhod;
        toplivaZatrachenoResultSpan.textContent = H1_toplivaZatracheno.toFixed(2) + ' л';

        const I1_gsmR = H1_toplivaZatracheno * G1_cenaAI92;
        gsmResultSpan.textContent = I1_gsmR.toFixed(2) + ' р.';

        const N1_summaVyplatRaschetnaya = 
            (C1_zakazovVsego * V1_SREDNYAYA_KOMPENSATSIA_TOPLIVO) + 
            (M1_zakazovPosle23 * U1_CENA_ZAKAZA_POSLE_23) + 
            (L1_zakazovDo23 * T1_CENA_ZAKAZA_DO_23);
        summaVyplatRaschetnayaResultSpan.textContent = N1_summaVyplatRaschetnaya.toFixed(2) + ' р.';

        const P1_summaChistymiRaschetnaya = N1_summaVyplatRaschetnaya - I1_gsmR;
        summaChistymiRaschetnayaResultSpan.textContent = P1_summaChistymiRaschetnaya.toFixed(2) + ' р.';

        let Q1_protsentZatrat = N1_summaVyplatRaschetnaya > 0 ? (I1_gsmR / N1_summaVyplatRaschetnaya) * 100 : 0;
        prosentZatratResultSpan.textContent = Q1_protsentZatrat.toFixed(2) + ' %';

        let R1_vChasChistymi = K1_smenaCh > 0 ? P1_summaChistymiRaschetnaya / K1_smenaCh : 0;
        vChasChistymiResultSpan.textContent = R1_vChasChistymi.toFixed(2) + ' р.';
        
        currentCalculatedData = { C1_zakazovVsego, N1_summaVyplatRaschetnaya };
        return true;
    };

    // --- View Management ---
    const setActiveNavButton = (activeButton: HTMLButtonElement) => {
        [navCalculatorButton, navSummaryButton, navPayoutsButton].forEach(btn => btn.classList.remove('active'));
        activeButton.classList.add('active');
    };

    const showCalculatorView = () => {
        calculatorView.style.display = 'block';
        summaryView.style.display = 'none';
        payoutsView.style.display = 'none';
        setActiveNavButton(navCalculatorButton);
    };

    const showSummaryView = () => {
        calculatorView.style.display = 'none';
        summaryView.style.display = 'block';
        payoutsView.style.display = 'none';
        setActiveNavButton(navSummaryButton);
        renderSummaryTable(); // This will also call updateNetBalanceDisplay
        updateTotalActualPayoutsDisplay(); 
    };

    const showPayoutsView = () => {
        calculatorView.style.display = 'none';
        summaryView.style.display = 'none';
        payoutsView.style.display = 'block';
        setActiveNavButton(navPayoutsButton);
        const filterFrom = dateFilterFromInput.value;
        const filterTo = dateFilterToInput.value;
        renderPayoutsTable(filterFrom, filterTo);
        editPayoutSection.style.display = 'none'; 
    };
    
    const loadTripForEditing = (tripId: string) => {
        const tripToEdit = getTripData().find(trip => trip.id === tripId);
        if (tripToEdit) {
            denNedeliInput.value = tripToEdit.denNedeli; 
            dataInput.value = tripToEdit.data;
            probegInput.value = tripToEdit.probeg.toString();
            raskhodInput.value = tripToEdit.raskhod.toString();
            cenaAI92Input.value = tripToEdit.cenaAI92.toString();
            vremyaVPutiInput.value = tripToEdit.vremyaVPuti.toString();
            smenaChInput.value = tripToEdit.smenaCh.toString();
            zakazovDo23Input.value = tripToEdit.zakazovDo23.toString();
            zakazovPosle23Input.value = tripToEdit.zakazovPosle23.toString();

            editingTripId = tripId;
            saveButton.textContent = 'Обновить запись';
            denNedeliInput.disabled = true;
            showCalculatorView();
            calculateResults(); 
            probegInput.focus();
        } else {
            alert("Не удалось найти запись для редактирования.");
        }
    };
    
    const getFilteredTripData = (filterFrom?: string, filterTo?: string): TripData[] => {
        let data = getTripData();
        if (filterFrom && filterTo) {
            return data.filter(item => item.data >= filterFrom && item.data <= filterTo);
        } else if (filterFrom) {
            return data.filter(item => item.data >= filterFrom);
        } else if (filterTo) {
            return data.filter(item => item.data <= filterTo);
        }
        return data;
    };
    
    const getFilteredActualPayoutsSum = (filterFrom?: string, filterTo?: string): number => {
        let payouts = getRecordedPayouts();
        if (filterFrom && filterTo) {
            payouts = payouts.filter(p => p.date >= filterFrom && p.date <= filterTo);
        } else if (filterFrom) {
            payouts = payouts.filter(p => p.date >= filterFrom);
        } else if (filterTo) {
            payouts = payouts.filter(p => p.date <= filterTo);
        }
        return payouts.reduce((sum, payout) => sum + payout.amount, 0);
    };

    const updateNetBalanceDisplay = () => {
        const filterFrom = dateFilterFromInput.value;
        const filterTo = dateFilterToInput.value;

        const filteredTrips = getFilteredTripData(filterFrom, filterTo);
        const totalCalculatedPayoutInPeriod = filteredTrips.reduce((sum, trip) => sum + trip.summaVyplatRaschetnaya, 0);
        
        const totalActualPayoutsInPeriod = getFilteredActualPayoutsSum(filterFrom, filterTo);
        
        const netBalance = totalCalculatedPayoutInPeriod - totalActualPayoutsInPeriod;
        netBalanceAmountSpan.textContent = netBalance.toFixed(2);
        netBalanceAmountSpan.style.color = netBalance >= 0 ? 'green' : 'red';
    };


    // --- Summary Table Rendering & Filtering ---
    const renderSummaryTable = () => {
        const filterFrom = dateFilterFromInput.value;
        const filterTo = dateFilterToInput.value;
        let dataToRender = getFilteredTripData(filterFrom, filterTo);
        
        summaryTableBody.innerHTML = ''; 
        if (dataToRender.length === 0) {
            noDataMessage.style.display = 'block';
            summaryTableBody.parentElement!.style.display = 'none'; 
            totalOrdersSpan.textContent = '0';
            totalPayoutSpan.textContent = '0.00';
        } else {
            noDataMessage.style.display = 'none';
            summaryTableBody.parentElement!.style.display = ''; 

            let grandTotalOrders = 0;
            let grandTotalPayout = 0;
            dataToRender.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()); 

            dataToRender.forEach(item => {
                const row = summaryTableBody.insertRow();
                row.insertCell().textContent = item.denNedeli;
                row.insertCell().textContent = item.data;
                row.insertCell().textContent = item.zakazovVsego.toString();
                row.insertCell().textContent = item.summaVyplatRaschetnaya.toFixed(2);

                const actionsCell = row.insertCell();
                const editButtonEl = document.createElement('button');
                editButtonEl.classList.add('edit-button');
                editButtonEl.innerHTML = '✏️ <span class="sr-only">Редактировать</span>'; 
                editButtonEl.title = "Редактировать запись";
                editButtonEl.addEventListener('click', () => loadTripForEditing(item.id));
                actionsCell.appendChild(editButtonEl);

                grandTotalOrders += item.zakazovVsego;
                grandTotalPayout += item.summaVyplatRaschetnaya;
            });

            totalOrdersSpan.textContent = grandTotalOrders.toString();
            totalPayoutSpan.textContent = grandTotalPayout.toFixed(2);
        }
        updateNetBalanceDisplay(); // Update balance after summary table is rendered
    };

    // --- Actual Payouts Logic ---
    const updateTotalActualPayoutsDisplay = () => { // This shows total of ALL payouts
        const payouts = getRecordedPayouts();
        const total = payouts.reduce((sum, payout) => sum + payout.amount, 0);
        totalActualPayoutsSumSpan.textContent = total.toFixed(2);
    };

    recordActualPayoutButton.addEventListener('click', () => {
        const date = actualPayoutDateInput.value;
        const amount = parseFloat(actualPayoutAmountInput.value);

        if (!date) {
            alert("Пожалуйста, выберите дату получения выплаты.");
            actualPayoutDateInput.focus();
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            alert("Пожалуйста, введите корректную сумму выплаты.");
            actualPayoutAmountInput.focus();
            return;
        }

        const newPayout: ActualPayout = {
            id: Date.now().toString(),
            date,
            amount
        };
        const payouts = getRecordedPayouts();
        payouts.push(newPayout);
        saveRecordedPayouts(payouts);

        alert("Фактическая выплата зарегистрирована!");
        actualPayoutDateInput.value = new Date().toISOString().split('T')[0]; // Reset to today
        actualPayoutAmountInput.value = '0';
        updateTotalActualPayoutsDisplay();
        updateNetBalanceDisplay(); 
        
        if (payoutsView.style.display === 'block') {
            renderPayoutsTable(dateFilterFromInput.value, dateFilterToInput.value);
        }
    });
    
    // --- Payouts Page Logic ---
    const renderPayoutsTable = (filterFrom?: string, filterTo?: string) => {
        let payouts = getRecordedPayouts();
        let filterActive = false;

        if (filterFrom && filterTo) {
            payouts = payouts.filter(p => p.date >= filterFrom && p.date <= filterTo);
            filterActive = true;
        } else if (filterFrom) {
            payouts = payouts.filter(p => p.date >= filterFrom);
            filterActive = true;
        } else if (filterTo) {
            payouts = payouts.filter(p => p.date <= filterTo);
            filterActive = true;
        }

        payoutsTableBody.innerHTML = '';
        if (payouts.length === 0) {
            noPayoutsMessage.style.display = 'block';
            payoutsTableBody.parentElement!.style.display = 'none';
        } else {
            noPayoutsMessage.style.display = 'none';
            payoutsTableBody.parentElement!.style.display = '';
        }

        if (payoutsFilterInfo) {
            if (filterActive) {
                payoutsFilterInfo.textContent = `Данные отфильтрованы по периоду${filterFrom ? ' с ' + filterFrom : ''}${filterTo ? ' по ' + filterTo : ''}.`;
                payoutsFilterInfo.style.display = 'block';
            } else {
                payoutsFilterInfo.style.display = 'none';
            }
        }
        
        payouts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        payouts.forEach(payout => {
            const row = payoutsTableBody.insertRow();
            row.insertCell().textContent = payout.date;
            row.insertCell().textContent = payout.amount.toFixed(2);
            const actionsCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.classList.add('edit-button');
            editBtn.innerHTML = '✏️ <span class="sr-only">Редактировать</span>';
            editBtn.title = "Редактировать выплату";
            editBtn.addEventListener('click', () => loadPayoutForEditing(payout.id));
            actionsCell.appendChild(editBtn);
        });
    };

    const loadPayoutForEditing = (payoutId: string) => {
        const payout = getRecordedPayouts().find(p => p.id === payoutId);
        if (payout) {
            editingPayoutId = payoutId;
            editingPayoutIdInput.value = payoutId;
            editingPayoutDateInput.value = payout.date;
            editingPayoutAmountInput.value = payout.amount.toString();
            editPayoutSection.style.display = 'block';
            payoutsTableBody.parentElement!.style.display = 'none'; 
            noPayoutsMessage.style.display = 'none';
            payoutsFilterInfo.style.display = 'none';
        }
    };

    savePayoutEditButton.addEventListener('click', () => {
        if (!editingPayoutId) return;
        const newDate = editingPayoutDateInput.value;
        const newAmount = parseFloat(editingPayoutAmountInput.value);

        if (!newDate) {
            alert("Дата выплаты не может быть пустой.");
            editingPayoutDateInput.focus();
            return;
        }
        if (isNaN(newAmount) || newAmount < 0) {
            alert("Сумма выплаты некорректна.");
            editingPayoutAmountInput.focus();
            return;
        }

        let payouts = getRecordedPayouts();
        const index = payouts.findIndex(p => p.id === editingPayoutId);
        if (index > -1) {
            payouts[index].date = newDate;
            payouts[index].amount = newAmount;
            saveRecordedPayouts(payouts);
            alert("Выплата обновлена.");
            editPayoutSection.style.display = 'none';
            editingPayoutId = null;
            renderPayoutsTable(dateFilterFromInput.value, dateFilterToInput.value);
            updateTotalActualPayoutsDisplay(); 
            updateNetBalanceDisplay(); 
        } else {
            alert("Ошибка: не удалось найти выплату для обновления.");
        }
    });
    
    cancelPayoutEditButton.addEventListener('click', () => {
        editPayoutSection.style.display = 'none';
        editingPayoutId = null;
        renderPayoutsTable(dateFilterFromInput.value, dateFilterToInput.value); 
    });

    // --- Event Handlers (Calculator & Trip Saving) ---
    saveButton.addEventListener('click', () => {
        const calculationSuccess = calculateResults();
        if (!dataInput.value) {
            alert("Пожалуйста, выберите дату."); dataInput.focus(); return;
        }
        if (!calculationSuccess || !currentCalculatedData) {
            alert('Не удалось записать данные из-за ошибок ввода или расчета.'); return;
        }

        const allData = getTripData();
        const tripEntryData: Omit<TripData, 'id' | 'zakazovVsego' | 'summaVyplatRaschetnaya'> = {
            denNedeli: denNedeliInput.value,
            data: dataInput.value,
            probeg: parseFloat(probegInput.value),
            raskhod: parseFloat(raskhodInput.value),
            cenaAI92: parseFloat(cenaAI92Input.value),
            vremyaVPuti: parseFloat(vremyaVPutiInput.value),
            smenaCh: parseFloat(smenaChInput.value),
            zakazovDo23: parseInt(zakazovDo23Input.value, 10),
            zakazovPosle23: parseInt(zakazovPosle23Input.value, 10),
        };

        if (editingTripId) {
            const index = allData.findIndex(trip => trip.id === editingTripId);
            if (index > -1) {
                allData[index] = { 
                    ...allData[index], 
                    ...tripEntryData, 
                    zakazovVsego: currentCalculatedData.C1_zakazovVsego, 
                    summaVyplatRaschetnaya: currentCalculatedData.N1_summaVyplatRaschetnaya 
                };
                alert('Запись успешно обновлена!');
            } else {
                alert('Ошибка: не удалось найти запись для обновления.'); editingTripId = null; saveButton.textContent = 'Записать'; return;
            }
        } else {
            const existingEntryIndex = allData.findIndex(trip => trip.data === dataInput.value);
            if (existingEntryIndex > -1) {
                allData[existingEntryIndex] = { 
                    ...allData[existingEntryIndex], 
                    ...tripEntryData,
                    zakazovVsego: currentCalculatedData.C1_zakazovVsego,
                    summaVyplatRaschetnaya: currentCalculatedData.N1_summaVyplatRaschetnaya
                };
                alert(`Запись за ${dataInput.value} обновлена!`);
            } else {
                allData.push({ 
                    id: Date.now().toString(), 
                    ...tripEntryData, 
                    zakazovVsego: currentCalculatedData.C1_zakazovVsego,
                    summaVyplatRaschetnaya: currentCalculatedData.N1_summaVyplatRaschetnaya
                });
                alert('Данные успешно записаны!');
            }
        }
        saveTripDataToLS(allData);
        exportToCSV(allData); 
        if (summaryView.style.display === 'block') renderSummaryTable(); // Will also update net balance
        resetCalculatorForm(true); 
        calculateResults(); 
    });

    dataInput.addEventListener('change', () => {
        updateDenNedeliFromDate(dataInput.value);
        calculateResults(); 
    });
    
    [probegInput, raskhodInput, cenaAI92Input, vremyaVPutiInput, smenaChInput, 
     zakazovDo23Input, zakazovPosle23Input].forEach(input => {
        input.addEventListener('input', calculateResults);
    });
    
    // Nav buttons
    navCalculatorButton.addEventListener('click', showCalculatorView);
    navSummaryButton.addEventListener('click', showSummaryView);
    navPayoutsButton.addEventListener('click', showPayoutsView);

    // Date Filter Buttons
    const applyFilters = () => {
        renderSummaryTable(); // Updates summary table and net balance
        if (payoutsView.style.display === 'block') {
            renderPayoutsTable(dateFilterFromInput.value, dateFilterToInput.value);
        }
    };

    applyDateFilterButton.addEventListener('click', applyFilters);
    resetDateFilterButton.addEventListener('click', () => {
        dateFilterFromInput.value = '';
        dateFilterToInput.value = '';
        applyFilters();
    });

    // --- Initialization ---
    denNedeliInput.disabled = true;
    resetCalculatorForm(true); 
    showCalculatorView(); 
    calculateResults(); 
    updateTotalActualPayoutsDisplay(); 
    updateNetBalanceDisplay(); // Initial calculation for balance
    if (actualPayoutDateInput) {
        actualPayoutDateInput.value = new Date().toISOString().split('T')[0];
    }
});