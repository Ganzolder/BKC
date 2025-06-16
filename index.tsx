
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
    // vremyaVPuti is removed
    // smenaCh is now a global setting
    zakazovDo23: number;
    zakazovPosle23: number;

    // Calculated values
    zakazovVsego: number;
    summaVyplatRaschetnaya: number;
}

interface ActualPayout {
    id: string;
    date: string;
    amount: number;
}

interface AppSettings {
    s1_probegDoRaboty: number;
    t1_cenaZakazaDo23: number;
    u1_cenaZakazaPosle23: number;
    v1_srednyayaKompensatsiaToplivo: number;
    k1_smenaChDefault: number; 
    amortizationPerKm: number; // New setting for amortization cost per km
}

interface WeeklyAggregatedData {
    weekStartDate: string; // Monday's date YYYY-MM-DD
    weekEndDate: string;   // Sunday's date YYYY-MM-DD
    weekLabel: string; // e.g. "2023-10-23 - 2023-10-29"
    totalOrders: number;
    totalPayout: number;
    shiftsWorked: number;
}


document.addEventListener('DOMContentLoaded', () => {
    // --- Constants & Settings ---
    const DEFAULT_SETTINGS: AppSettings = {
        s1_probegDoRaboty: 22,
        t1_cenaZakazaDo23: 180,
        u1_cenaZakazaPosle23: 208.54,
        v1_srednyayaKompensatsiaToplivo: 37,
        k1_smenaChDefault: 6, 
        amortizationPerKm: 3, // Default amortization cost
    };
    let appSettings = { ...DEFAULT_SETTINGS };
    const SETTINGS_LS_KEY = 'taxiCalculatorAppSettings';
    
    const TRIP_DATA_LS_KEY = 'tripData';
    const RECORDED_PAYOUTS_LS_KEY = 'recordedPayouts';
    const DNI_NEDELI_MAP = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];


    // --- DOM Elements ---
    const calculatorView = document.getElementById('calculator-view') as HTMLElement;
    const summaryView = document.getElementById('summary-view') as HTMLElement;
    const payoutsView = document.getElementById('payouts-view') as HTMLElement;
    const settingsView = document.getElementById('settings-view') as HTMLElement;

    const navCalculatorButton = document.getElementById('nav-calculator-button') as HTMLButtonElement;
    const navSummaryButton = document.getElementById('nav-summary-button') as HTMLButtonElement;
    const navPayoutsButton = document.getElementById('nav-payouts-button') as HTMLButtonElement;
    const settingsIconButton = document.getElementById('settings-icon-button') as HTMLButtonElement;

    // File Menu Elements
    const fileMenuContainer = document.getElementById('file-menu-container') as HTMLElement;
    const fileMenuButton = document.getElementById('file-menu-button') as HTMLButtonElement;
    const fileMenuDropdown = document.getElementById('file-menu-dropdown') as HTMLElement;
    const importTripsCsvButton = document.getElementById('import-trips-csv-button') as HTMLButtonElement;
    const importTripsCsvInput = document.getElementById('import-trips-csv-input') as HTMLInputElement;
    const importPayoutsCsvButton = document.getElementById('import-payouts-csv-button') as HTMLButtonElement;
    const importPayoutsCsvInput = document.getElementById('import-payouts-csv-input') as HTMLInputElement;
    const backupAllDataButton = document.getElementById('backup-all-data-button') as HTMLButtonElement;


    // Calculator View
    const denNedeliDisplay = document.getElementById('denNedeliDisplay') as HTMLParagraphElement;
    const dataInput = document.getElementById('dataInput') as HTMLInputElement;
    const probegInput = document.getElementById('probegInput') as HTMLInputElement;
    const raskhodInput = document.getElementById('raskhodInput') as HTMLInputElement;
    const cenaAI92Input = document.getElementById('cenaAI92Input') as HTMLInputElement;
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
    const totalActualPayoutsLabelTextSpan = document.getElementById('total-actual-payouts-label-text') as HTMLSpanElement;
    const totalActualPayoutsSumSpan = document.getElementById('total-actual-payouts-sum') as HTMLSpanElement;
    const netBalanceAmountSpan = document.getElementById('net-balance-amount') as HTMLSpanElement;
    
    const dateFilterFromInput = document.getElementById('dateFilterFrom') as HTMLInputElement;
    const dateFilterToInput = document.getElementById('dateFilterTo') as HTMLInputElement;
    const applyDateFilterButton = document.getElementById('applyDateFilterButton') as HTMLButtonElement;
    const resetDateFilterButton = document.getElementById('resetDateFilterButton') as HTMLButtonElement;
    const exportCsvButton = document.getElementById('exportCsvButton') as HTMLButtonElement;
    
    const summaryTableBody = document.querySelector('#summary-table tbody') as HTMLTableSectionElement;
    const totalOrdersSpan = document.getElementById('total-orders') as HTMLSpanElement;
    const totalPayoutSpan = document.getElementById('total-payout') as HTMLSpanElement;
    const noDataMessage = document.getElementById('no-data-message') as HTMLParagraphElement;

    // Weekly Summary Elements
    const toggleWeeklySummaryButton = document.getElementById('toggle-weekly-summary-button') as HTMLButtonElement;
    const weeklySummaryDetailsRegion = document.getElementById('weekly-summary-details-region') as HTMLElement;
    const weeklySummaryTableBody = document.getElementById('weekly-summary-table-body') as HTMLTableSectionElement;
    const noWeeklyDataMessage = document.getElementById('no-weekly-data-message') as HTMLParagraphElement;

    // Overall Statistics Elements
    const overallStatisticsSection = document.getElementById('overall-statistics-section') as HTMLElement;
    const overallStatsTotalOrdersSpan = document.getElementById('overall-stats-total-orders') as HTMLSpanElement;
    const overallStatsShiftsWorkedSpan = document.getElementById('overall-stats-shifts-worked') as HTMLSpanElement;
    const overallStatsAvgOrdersPerShiftSpan = document.getElementById('overall-stats-avg-orders-per-shift') as HTMLSpanElement;
    const overallStatsTotalMileageSpan = document.getElementById('overall-stats-total-mileage') as HTMLSpanElement;
    const overallStatsAvgFuelConsumptionSpan = document.getElementById('overall-stats-avg-fuel-consumption') as HTMLSpanElement;
    const overallStatsAvgMileagePerOrderSpan = document.getElementById('overall-stats-avg-mileage-per-order') as HTMLSpanElement;
    const overallStatsTotalFuelBurnedSpan = document.getElementById('overall-stats-total-fuel-burned') as HTMLSpanElement;
    const overallStatsTotalFuelCostSpan = document.getElementById('overall-stats-total-fuel-cost') as HTMLSpanElement;
    const overallStatsAvgFuelCostPerOrderSpan = document.getElementById('overall-stats-avg-fuel-cost-per-order') as HTMLSpanElement;
    const overallStatsAmortizationCostSpan = document.getElementById('overall-stats-amortization-cost') as HTMLSpanElement;
    const overallStatsFuelCostPercentageSpan = document.getElementById('overall-stats-fuel-cost-percentage') as HTMLSpanElement;
    const overallStatsTotalCostPercentageSpan = document.getElementById('overall-stats-total-cost-percentage') as HTMLSpanElement;
    const overallStatsAvgHourlyIncomeSpan = document.getElementById('overall-stats-avg-hourly-income') as HTMLSpanElement;
    const overallStatsEquivalentMonthlyIncomeSpan = document.getElementById('overall-stats-equivalent-monthly-income') as HTMLSpanElement;
    const overallStatsMonthProgressPercentageSpan = document.getElementById('overall-stats-month-progress-percentage') as HTMLSpanElement;
    const overallStatsEarningsForecastSpan = document.getElementById('overall-stats-earnings-forecast') as HTMLSpanElement;
    const overallStatsAvgGrossPerShiftPeriodSpan = document.getElementById('overall-stats-avg-gross-per-effective-shift') as HTMLSpanElement; 


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
    const exportPayoutsCsvButton = document.getElementById('export-payouts-csv-button') as HTMLButtonElement;


    // Settings View
    const settingS1ProbegInput = document.getElementById('settingS1Probeg') as HTMLInputElement;
    const settingT1CenaDo23Input = document.getElementById('settingT1CenaDo23') as HTMLInputElement;
    const settingU1CenaPosle23Input = document.getElementById('settingU1CenaPosle23') as HTMLInputElement;
    const settingV1KompensatsiaInput = document.getElementById('settingV1Kompensatsia') as HTMLInputElement;
    const settingK1SmenaDefaultInput = document.getElementById('settingK1SmenaDefault') as HTMLInputElement; 
    const settingAmortizationPerKmInput = document.getElementById('settingAmortizationPerKm') as HTMLInputElement;
    const saveSettingsButton = document.getElementById('save-settings-button') as HTMLButtonElement;
    const backToCalculatorButton = document.getElementById('back-to-calculator-button') as HTMLButtonElement;


    // --- State & Helper Functions ---
    let currentCalculatedData: { C1_zakazovVsego: number; N1_summaVyplatRaschetnaya: number; } | null = null;
    let editingTripId: string | null = null;
    let editingPayoutId: string | null = null;
    let lastActiveViewFn: (() => void) | null = null; 

    const loadSettings = () => {
        const storedSettings = localStorage.getItem(SETTINGS_LS_KEY);
        if (storedSettings) {
            try {
                const parsedSettings = JSON.parse(storedSettings) as Partial<AppSettings>;
                appSettings = { ...DEFAULT_SETTINGS, ...parsedSettings };
            } catch (e) {
                console.error("Failed to parse settings from localStorage", e);
                appSettings = { ...DEFAULT_SETTINGS };
            }
        } else {
            appSettings = { ...DEFAULT_SETTINGS };
        }
        settingS1ProbegInput.value = appSettings.s1_probegDoRaboty.toString();
        settingT1CenaDo23Input.value = appSettings.t1_cenaZakazaDo23.toString();
        settingU1CenaPosle23Input.value = appSettings.u1_cenaZakazaPosle23.toString();
        settingV1KompensatsiaInput.value = appSettings.v1_srednyayaKompensatsiaToplivo.toString();
        settingK1SmenaDefaultInput.value = appSettings.k1_smenaChDefault.toString();
        settingAmortizationPerKmInput.value = appSettings.amortizationPerKm.toString();
    };

    const saveSettings = () => {
        const newS1 = parseFloat(settingS1ProbegInput.value);
        const newT1 = parseFloat(settingT1CenaDo23Input.value);
        const newU1 = parseFloat(settingU1CenaPosle23Input.value);
        const newV1 = parseFloat(settingV1KompensatsiaInput.value);
        const newK1 = parseFloat(settingK1SmenaDefaultInput.value);
        const newAmortization = parseFloat(settingAmortizationPerKmInput.value);

        if (isNaN(newS1) || isNaN(newT1) || isNaN(newU1) || isNaN(newV1) || isNaN(newK1) || isNaN(newAmortization) ||
            newS1 < 0 || newT1 < 0 || newU1 < 0 || newV1 < 0 || newK1 <=0 || newAmortization < 0 ) {
            alert("Все значения настроек должны быть положительными числами (продолжительность смены > 0). Стоимость амортизации не может быть отрицательной.");
            return false;
        }

        appSettings.s1_probegDoRaboty = newS1;
        appSettings.t1_cenaZakazaDo23 = newT1;
        appSettings.u1_cenaZakazaPosle23 = newU1;
        appSettings.v1_srednyayaKompensatsiaToplivo = newV1;
        appSettings.k1_smenaChDefault = newK1;
        appSettings.amortizationPerKm = newAmortization;

        localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(appSettings));
        alert("Настройки сохранены!");
        calculateResults(); 
        if (summaryView.style.display === 'block') applyFilters(); // Re-apply filters if summary view is active
        return true;
    };

    const getTripData = (): TripData[] => JSON.parse(localStorage.getItem(TRIP_DATA_LS_KEY) || '[]');
    const saveTripDataToLS = (data: TripData[]): void => localStorage.setItem(TRIP_DATA_LS_KEY, JSON.stringify(data));
    
    const getRecordedPayouts = (): ActualPayout[] => JSON.parse(localStorage.getItem(RECORDED_PAYOUTS_LS_KEY) || '[]');
    const saveRecordedPayouts = (payouts: ActualPayout[]): void => localStorage.setItem(RECORDED_PAYOUTS_LS_KEY, JSON.stringify(payouts));

    const formatDateForFilename = (date: Date): string => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const formatDateForStorage = (date: Date): string => date.toISOString().split('T')[0];

    const getMonday = (d: Date): Date => {
        const date = new Date(d);
        const day = date.getDay(); // Sunday - 0, Monday - 1, ...
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(date.setDate(diff));
    };
    
    const getDayOfWeekName = (dateString: string): string => {
        if (!dateString) return DNI_NEDELI_MAP[0];
        try {
            const dateObj = new Date(dateString);
            const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
            const correctedDate = new Date(dateObj.getTime() + userTimezoneOffset); 
            return DNI_NEDELI_MAP[correctedDate.getDay()] || DNI_NEDELI_MAP[0];
        } catch (e) {
            console.error("Error parsing date for day of week:", dateString, e);
            return DNI_NEDELI_MAP[0];
        }
    };

    const updateDenNedeliFromDate = (dateString: string) => {
        if (denNedeliDisplay) {
            denNedeliDisplay.textContent = getDayOfWeekName(dateString);
        }
    };
    
    const exportToCSV = () => {
        const data = getFilteredTripData(dateFilterFromInput.value, dateFilterToInput.value);
        if (data.length === 0) {
            alert("Нет данных для экспорта в выбранном периоде.");
            return;
        }
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

    const exportPayoutsToCSV = () => {
        const filterFrom = dateFilterFromInput.value;
        const filterTo = dateFilterToInput.value;
        let payouts = getRecordedPayouts();

        if (filterFrom && filterTo) {
            payouts = payouts.filter(p => p.date >= filterFrom && p.date <= filterTo);
        } else if (filterFrom) {
            payouts = payouts.filter(p => p.date >= filterFrom);
        } else if (filterTo) {
            payouts = payouts.filter(p => p.date <= filterTo);
        }

        if (payouts.length === 0) {
            alert("Нет данных о выплатах для экспорта в выбранном периоде.");
            return;
        }
        const headers = ["Дата получения", "Сумма выплаты, р."];
        const csvRows = [
            headers.join(','),
            ...payouts.map(payout => [
                payout.date,
                payout.amount.toFixed(2)
            ].join(','))
        ];
        const csvString = `\uFEFF${csvRows.join('\n')}`;
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `payout_summary_${formatDateForFilename(new Date())}.csv`;
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
            dataInput.value = formatDateForStorage(new Date());
            updateDenNedeliFromDate(dataInput.value);
        } else if (dataInput) {
             updateDenNedeliFromDate(dataInput.value); 
        }

        probegInput.value = '0';
        raskhodInput.value = '0';
        cenaAI92Input.value = '0';
        zakazovDo23Input.value = '0';
        zakazovPosle23Input.value = '0';
        
        clearResultSpans();
        editingTripId = null;
        saveButton.textContent = 'Записать';
    };

    const calculateResults = (): boolean => {
        clearResultSpans();
        const D1_probeg = parseFloat(probegInput.value);
        const E1_raskhod = parseFloat(raskhodInput.value);
        const G1_cenaAI92 = parseFloat(cenaAI92Input.value);
        const K1_smenaCh = appSettings.k1_smenaChDefault; 
        const L1_zakazovDo23 = parseInt(zakazovDo23Input.value, 10);
        const M1_zakazovPosle23 = parseInt(zakazovPosle23Input.value, 10);

        if ([D1_probeg, E1_raskhod, G1_cenaAI92].some(isNaN) ||
            [L1_zakazovDo23, M1_zakazovPosle23].some(v => isNaN(v) || v < 0) || 
            [D1_probeg, E1_raskhod, G1_cenaAI92].some(v => v < 0) ) {
            displayInputErrorInResults("Значения не могут быть отрицательными или пустыми.");
            return false;
        }
        if (K1_smenaCh <= 0) { 
             displayInputErrorInResults("Продолжительность смены в настройках должна быть > 0.");
             return false;
        }
      
        const C1_zakazovVsego = L1_zakazovDo23 + M1_zakazovPosle23;
        zakazovVsegoResultSpan.textContent = C1_zakazovVsego.toString();

        let F1_srRasstoyanie = 0;
        if (C1_zakazovVsego > 0 && (D1_probeg - appSettings.s1_probegDoRaboty) >= 0) {
            F1_srRasstoyanie = (D1_probeg - appSettings.s1_probegDoRaboty) / C1_zakazovVsego / 2;
        }
        srRasstoyanieResultSpan.textContent = F1_srRasstoyanie.toFixed(1) + ' км';
        
        const H1_toplivaZatracheno = (D1_probeg / 100) * E1_raskhod;
        toplivaZatrachenoResultSpan.textContent = H1_toplivaZatracheno.toFixed(2) + ' л';

        const I1_gsmR = H1_toplivaZatracheno * G1_cenaAI92;
        gsmResultSpan.textContent = I1_gsmR.toFixed(2) + ' р.';

        const N1_summaVyplatRaschetnaya = 
            (C1_zakazovVsego * appSettings.v1_srednyayaKompensatsiaToplivo) + 
            (M1_zakazovPosle23 * appSettings.u1_cenaZakazaPosle23) + 
            (L1_zakazovDo23 * appSettings.t1_cenaZakazaDo23);
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
    const setActiveNavButton = (activeButton: HTMLButtonElement | null) => {
        [navCalculatorButton, navSummaryButton, navPayoutsButton].forEach(btn => btn.classList.remove('active'));
        if (activeButton) {
            activeButton.classList.add('active');
        }
    };

    const showCalculatorView = () => {
        calculatorView.style.display = 'block';
        summaryView.style.display = 'none';
        payoutsView.style.display = 'none';
        settingsView.style.display = 'none';
        setActiveNavButton(navCalculatorButton);
        lastActiveViewFn = showCalculatorView;
    };

    const showSummaryView = () => {
        calculatorView.style.display = 'none';
        summaryView.style.display = 'block';
        payoutsView.style.display = 'none';
        settingsView.style.display = 'none';
        setActiveNavButton(navSummaryButton);
        
        // Set default "From" date if both filters are empty (e.g., on first load of summary view)
        if (!dateFilterFromInput.value && !dateFilterToInput.value) {
            dateFilterFromInput.value = formatDateForStorage(getMonday(new Date()));
        }
        applyFilters(); // This will render tables and update displays based on filters
        lastActiveViewFn = showSummaryView;
    };

    const showPayoutsView = () => {
        calculatorView.style.display = 'none';
        summaryView.style.display = 'none';
        payoutsView.style.display = 'block';
        settingsView.style.display = 'none';
        setActiveNavButton(navPayoutsButton);
        const filterFrom = dateFilterFromInput.value; // Use existing filters from summary view
        const filterTo = dateFilterToInput.value;
        renderPayoutsTable(filterFrom, filterTo);
        editPayoutSection.style.display = 'none'; 
        lastActiveViewFn = showPayoutsView;
    };

    const showSettingsView = () => {
        if (calculatorView.style.display === 'block') lastActiveViewFn = showCalculatorView;
        else if (summaryView.style.display === 'block') lastActiveViewFn = showSummaryView;
        else if (payoutsView.style.display === 'block') lastActiveViewFn = showPayoutsView;

        calculatorView.style.display = 'none';
        summaryView.style.display = 'none';
        payoutsView.style.display = 'none';
        settingsView.style.display = 'block';
        setActiveNavButton(null); 
        loadSettings(); 
    };
    
    lastActiveViewFn = showCalculatorView;

    const loadTripForEditing = (tripId: string) => {
        const tripToEdit = getTripData().find(trip => trip.id === tripId);
        if (tripToEdit) {
            dataInput.value = tripToEdit.data; 
            updateDenNedeliFromDate(dataInput.value); 
            probegInput.value = tripToEdit.probeg.toString();
            raskhodInput.value = tripToEdit.raskhod.toString();
            cenaAI92Input.value = tripToEdit.cenaAI92.toString();
            zakazovDo23Input.value = tripToEdit.zakazovDo23.toString();
            zakazovPosle23Input.value = tripToEdit.zakazovPosle23.toString();

            editingTripId = tripId;
            saveButton.textContent = 'Обновить запись';
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

    const renderOverallStatistics = (
        filteredTrips: TripData[],
        periodTotalOrders: number,
        periodTotalCalculatedPayout: number
    ) => {
        let statShiftsWorked = 0;
        let statTotalMileage = 0;
        let statTotalActualFuelConsumed = 0; 
        let statAvgFuelConsumption = 0;
        let statTotalMileageForOrders = 0; 
        let statAvgMileagePerOrderRoundTrip = 0;
        let statTotalFuelBurned = 0;
        let statTotalFuelCost = 0;
        let statAvgFuelCostPerOrder = 0;
        
        let statTotalAmortizationCost = 0;
        let statFuelCostPercentage = 0;
        let statTotalCostPercentage = 0;
        let statAvgHourlyIncome = 0;
        let statEquivalentMonthlyIncome = 0;
        let statAvgGrossPerShiftInPeriod = 0; 

        if (filteredTrips.length > 0) {
            overallStatisticsSection.style.display = 'block';
            statShiftsWorked = filteredTrips.length;

            filteredTrips.forEach(trip => {
                statTotalMileage += trip.probeg;
                const fuelForThisTrip = (trip.probeg / 100) * trip.raskhod;
                statTotalActualFuelConsumed += fuelForThisTrip;
                statTotalFuelBurned += fuelForThisTrip;
                statTotalFuelCost += fuelForThisTrip * trip.cenaAI92;
                if (trip.probeg >= appSettings.s1_probegDoRaboty && trip.zakazovVsego > 0) {
                     statTotalMileageForOrders += (trip.probeg - appSettings.s1_probegDoRaboty);
                }
            });

            const statAvgOrdersPerShift = statShiftsWorked > 0 ? periodTotalOrders / statShiftsWorked : 0;
            overallStatsAvgOrdersPerShiftSpan.textContent = statAvgOrdersPerShift.toFixed(2);

            statAvgFuelConsumption = statTotalMileage > 0 ? (statTotalActualFuelConsumed / statTotalMileage) * 100 : 0;
            
            if (periodTotalOrders > 0) {
                 statAvgMileagePerOrderRoundTrip = statTotalMileageForOrders / periodTotalOrders;
                 statAvgFuelCostPerOrder = statTotalFuelCost / periodTotalOrders;
            }

            statTotalAmortizationCost = statTotalMileage * appSettings.amortizationPerKm;
            statFuelCostPercentage = periodTotalCalculatedPayout > 0 ? (statTotalFuelCost / periodTotalCalculatedPayout) * 100 : 0;
            const totalExpenses = statTotalFuelCost + statTotalAmortizationCost;
            statTotalCostPercentage = periodTotalCalculatedPayout > 0 ? (totalExpenses / periodTotalCalculatedPayout) * 100 : 0;
            
            const totalHoursWorked = statShiftsWorked * appSettings.k1_smenaChDefault;
            statAvgHourlyIncome = totalHoursWorked > 0 ? (periodTotalCalculatedPayout - totalExpenses) / totalHoursWorked : 0; // Net hourly income
            statEquivalentMonthlyIncome = statAvgHourlyIncome * 8 * 21; 

            statAvgGrossPerShiftInPeriod = statShiftsWorked > 0 ? periodTotalCalculatedPayout / statShiftsWorked : 0;

        } else {
            overallStatisticsSection.style.display = 'none';
        }

        let statEarningsForecast = 0;
        const allTripsForForecast = getTripData();
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); 

        const tripsThisMonth = allTripsForForecast.filter(trip => {
            const tripDate = new Date(trip.data);
            return tripDate.getFullYear() === currentYear && tripDate.getMonth() === currentMonth;
        });

        if (tripsThisMonth.length > 0) {
            let totalPayoutCurrentMonth = 0;
            let totalOrdersCurrentMonth = 0;
            tripsThisMonth.forEach(trip => {
                totalPayoutCurrentMonth += trip.summaVyplatRaschetnaya;
                totalOrdersCurrentMonth += trip.zakazovVsego;
            });
            const shiftsWorkedCurrentMonth = tripsThisMonth.length;

            const avgIncomePerOrderCurrentMonth = totalOrdersCurrentMonth > 0 ? totalPayoutCurrentMonth / totalOrdersCurrentMonth : 0;
            const avgOrdersPerShiftCurrentMonth = shiftsWorkedCurrentMonth > 0 ? totalOrdersCurrentMonth / shiftsWorkedCurrentMonth : 0;

            let tuesdaysInMonth = 0, wednesdaysInMonth = 0, fridaysInMonth = 0, saturdaysInMonth = 0;
            const daysInCurrentActualMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            for (let day = 1; day <= daysInCurrentActualMonth; day++) {
                const d = new Date(currentYear, currentMonth, day);
                const dayOfWeek = d.getDay(); 
                if (dayOfWeek === 2) tuesdaysInMonth++;      
                else if (dayOfWeek === 3) wednesdaysInMonth++; 
                else if (dayOfWeek === 5) fridaysInMonth++;    
                else if (dayOfWeek === 6) saturdaysInMonth++;  
            }
            const effectiveDaysForForecast = tuesdaysInMonth + fridaysInMonth + saturdaysInMonth + (wednesdaysInMonth / 2);
            statEarningsForecast = avgIncomePerOrderCurrentMonth * avgOrdersPerShiftCurrentMonth * effectiveDaysForForecast;
        }

        const today = new Date();
        const currentDayOfMonth = today.getDate();
        const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const statMonthProgressPercentage = daysInCurrentMonth > 0 ? (currentDayOfMonth / daysInCurrentMonth) * 100 : 0;

        overallStatsTotalOrdersSpan.textContent = periodTotalOrders.toString();
        overallStatsShiftsWorkedSpan.textContent = statShiftsWorked.toString();
        overallStatsTotalMileageSpan.textContent = statTotalMileage.toFixed(1) + ' км';
        overallStatsAvgFuelConsumptionSpan.textContent = isNaN(statAvgFuelConsumption) || !isFinite(statAvgFuelConsumption) ? 'Н/Д' : statAvgFuelConsumption.toFixed(2) + ' л';
        overallStatsAvgMileagePerOrderSpan.textContent = isNaN(statAvgMileagePerOrderRoundTrip) || !isFinite(statAvgMileagePerOrderRoundTrip) ? 'Н/Д' : statAvgMileagePerOrderRoundTrip.toFixed(1) + ' км';
        overallStatsTotalFuelBurnedSpan.textContent = statTotalFuelBurned.toFixed(2) + ' л';
        overallStatsTotalFuelCostSpan.textContent = statTotalFuelCost.toFixed(2) + ' р.';
        overallStatsAvgFuelCostPerOrderSpan.textContent = isNaN(statAvgFuelCostPerOrder) || !isFinite(statAvgFuelCostPerOrder) ? 'Н/Д' : statAvgFuelCostPerOrder.toFixed(2) + ' р.';
        overallStatsAmortizationCostSpan.textContent = statTotalAmortizationCost.toFixed(2) + ' р.';
        overallStatsFuelCostPercentageSpan.textContent = isNaN(statFuelCostPercentage) || !isFinite(statFuelCostPercentage) ? 'Н/Д' : statFuelCostPercentage.toFixed(2) + ' %';
        overallStatsTotalCostPercentageSpan.textContent = isNaN(statTotalCostPercentage) || !isFinite(statTotalCostPercentage) ? 'Н/Д' : statTotalCostPercentage.toFixed(2) + ' %';
        overallStatsAvgHourlyIncomeSpan.textContent = isNaN(statAvgHourlyIncome) || !isFinite(statAvgHourlyIncome) ? 'Н/Д' : statAvgHourlyIncome.toFixed(2) + ' р.';
        overallStatsEquivalentMonthlyIncomeSpan.textContent = isNaN(statEquivalentMonthlyIncome) || !isFinite(statEquivalentMonthlyIncome) ? 'Н/Д' : statEquivalentMonthlyIncome.toFixed(2) + ' р.';
        overallStatsAvgGrossPerShiftPeriodSpan.textContent = isNaN(statAvgGrossPerShiftInPeriod) || !isFinite(statAvgGrossPerShiftInPeriod) ? 'Н/Д' : statAvgGrossPerShiftInPeriod.toFixed(2) + ' р.';
        overallStatsMonthProgressPercentageSpan.textContent = isNaN(statMonthProgressPercentage) || !isFinite(statMonthProgressPercentage) ? '0.0' : statMonthProgressPercentage.toFixed(1) + ' %';
        overallStatsEarningsForecastSpan.textContent = isNaN(statEarningsForecast) || !isFinite(statEarningsForecast) ? 'Н/Д' : statEarningsForecast.toFixed(2) + ' р.';
    };

    const renderSummaryTable = () => {
        const filterFrom = dateFilterFromInput.value;
        const filterTo = dateFilterToInput.value;
        let dataToRender = getFilteredTripData(filterFrom, filterTo);
        
        summaryTableBody.innerHTML = ''; 
        let grandTotalOrders = 0;
        let grandTotalPayout = 0;

        if (dataToRender.length === 0) {
            noDataMessage.style.display = 'block';
            summaryTableBody.parentElement!.style.display = 'none'; 
            totalOrdersSpan.textContent = '0';
            totalPayoutSpan.textContent = '0.00';
        } else {
            noDataMessage.style.display = 'none';
            summaryTableBody.parentElement!.style.display = ''; 
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
        updateNetBalanceDisplay(); 
        renderOverallStatistics(dataToRender, grandTotalOrders, grandTotalPayout); 
    };

    const updateTotalActualPayoutsDisplay = (filterFrom?: string, filterTo?: string) => {
        let payoutsToSum = getRecordedPayouts();

        if (filterFrom && filterTo) {
            payoutsToSum = payoutsToSum.filter(p => p.date >= filterFrom && p.date <= filterTo);
        } else if (filterFrom) {
            payoutsToSum = payoutsToSum.filter(p => p.date >= filterFrom);
        } else if (filterTo) {
            payoutsToSum = payoutsToSum.filter(p => p.date <= filterTo);
        }
        // If no filters, all payouts are summed

        const total = payoutsToSum.reduce((sum, payout) => sum + payout.amount, 0);
        totalActualPayoutsSumSpan.textContent = total.toFixed(2);

        if (totalActualPayoutsLabelTextSpan) {
            const baseText = "Общая сумма полученных выплат";
            const periodText = (filterFrom || filterTo) ? "(в периоде)" : "(всего)";
            totalActualPayoutsLabelTextSpan.textContent = `${baseText} ${periodText}:`;
        }
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
            id: Date.now().toString() + Math.random().toString().substring(2),
            date,
            amount
        };
        const payouts = getRecordedPayouts();
        payouts.push(newPayout);
        saveRecordedPayouts(payouts);

        alert("Фактическая выплата зарегистрирована!");
        actualPayoutDateInput.value = formatDateForStorage(new Date()); 
        actualPayoutAmountInput.value = '0';
        
        // Update displays based on current filters
        updateTotalActualPayoutsDisplay(dateFilterFromInput.value, dateFilterToInput.value);
        updateNetBalanceDisplay(); 
        
        if (payoutsView.style.display === 'block') {
            renderPayoutsTable(dateFilterFromInput.value, dateFilterToInput.value);
        }
    });

    const renderWeeklySummaryTable = (filterFrom?: string, filterTo?: string) => {
        const trips = getFilteredTripData(filterFrom, filterTo);
        weeklySummaryTableBody.innerHTML = '';

        if (trips.length === 0) {
            noWeeklyDataMessage.style.display = 'block';
            weeklySummaryTableBody.parentElement!.style.display = 'none';
            return;
        }

        noWeeklyDataMessage.style.display = 'none';
        weeklySummaryTableBody.parentElement!.style.display = '';

        const weeklyData: Map<string, WeeklyAggregatedData> = new Map();

        trips.forEach(trip => {
            const tripDate = new Date(trip.data);
            const monday = getMonday(tripDate);
            const mondayString = formatDateForStorage(monday);
            
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            const sundayString = formatDateForStorage(sunday);

            const weekLabel = `${mondayString} - ${sundayString}`;

            if (!weeklyData.has(mondayString)) {
                weeklyData.set(mondayString, {
                    weekStartDate: mondayString,
                    weekEndDate: sundayString,
                    weekLabel: weekLabel,
                    totalOrders: 0,
                    totalPayout: 0,
                    shiftsWorked: 0,
                });
            }

            const week = weeklyData.get(mondayString)!;
            week.totalOrders += trip.zakazovVsego;
            week.totalPayout += trip.summaVyplatRaschetnaya;
            week.shiftsWorked += 1;
        });

        const sortedWeeks = Array.from(weeklyData.values()).sort((a, b) => 
            new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()
        );

        sortedWeeks.forEach(week => {
            const row = weeklySummaryTableBody.insertRow();
            row.insertCell().textContent = week.weekLabel;
            row.insertCell().textContent = week.totalOrders.toString();
            row.insertCell().textContent = week.totalPayout.toFixed(2);
            row.insertCell().textContent = week.shiftsWorked.toString();
            const avgOrdersPerShift = week.shiftsWorked > 0 ? (week.totalOrders / week.shiftsWorked).toFixed(2) : '0.00';
            const avgPayoutPerShift = week.shiftsWorked > 0 ? (week.totalPayout / week.shiftsWorked).toFixed(2) : '0.00';
            row.insertCell().textContent = avgOrdersPerShift;
            row.insertCell().textContent = avgPayoutPerShift;
        });
         if (sortedWeeks.length === 0) {
            noWeeklyDataMessage.style.display = 'block';
            weeklySummaryTableBody.parentElement!.style.display = 'none';
        }

    };
    
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
            // Re-render with current filters
            renderPayoutsTable(dateFilterFromInput.value, dateFilterToInput.value);
            updateTotalActualPayoutsDisplay(dateFilterFromInput.value, dateFilterToInput.value); 
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
            denNedeli: denNedeliDisplay.textContent || getDayOfWeekName(dataInput.value),
            data: dataInput.value,
            probeg: parseFloat(probegInput.value),
            raskhod: parseFloat(raskhodInput.value),
            cenaAI92: parseFloat(cenaAI92Input.value),
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
                    id: Date.now().toString() + Math.random().toString().substring(2),
                    ...tripEntryData, 
                    zakazovVsego: currentCalculatedData.C1_zakazovVsego,
                    summaVyplatRaschetnaya: currentCalculatedData.N1_summaVyplatRaschetnaya
                });
                alert('Данные успешно записаны!');
            }
        }
        saveTripDataToLS(allData);
        if (summaryView.style.display === 'block') applyFilters(); // Re-apply filters if summary view is active
        resetCalculatorForm(true); 
        calculateResults(); 
    });

    dataInput.addEventListener('change', () => {
        updateDenNedeliFromDate(dataInput.value);
        calculateResults(); 
    });
    
    [probegInput, raskhodInput, cenaAI92Input, 
     zakazovDo23Input, zakazovPosle23Input].forEach(input => {
        input.addEventListener('input', calculateResults);
    });
    
    navCalculatorButton.addEventListener('click', showCalculatorView);
    navSummaryButton.addEventListener('click', showSummaryView);
    navPayoutsButton.addEventListener('click', showPayoutsView);
    settingsIconButton.addEventListener('click', showSettingsView);

    saveSettingsButton.addEventListener('click', saveSettings);
    backToCalculatorButton.addEventListener('click', () => {
        if(lastActiveViewFn) {
            lastActiveViewFn();
        } else {
            showCalculatorView(); 
        }
    });

    const applyFilters = () => {
        const filterFrom = dateFilterFromInput.value;
        const filterTo = dateFilterToInput.value;

        renderSummaryTable(); // Uses global filter inputs internally. Calls updateNetBalanceDisplay and renderOverallStatistics.
        renderWeeklySummaryTable(filterFrom, filterTo);
        updateTotalActualPayoutsDisplay(filterFrom, filterTo); // Update the visual sum in "Actual Payout" section.

        if (payoutsView.style.display === 'block') {
            renderPayoutsTable(filterFrom, filterTo);
        }
    };

    applyDateFilterButton.addEventListener('click', applyFilters);

    resetDateFilterButton.addEventListener('click', () => {
        dateFilterFromInput.value = formatDateForStorage(getMonday(new Date())); // Default "from"
        dateFilterToInput.value = ''; // Clear "to"
        applyFilters();
    });

    exportCsvButton.addEventListener('click', exportToCSV);
    exportPayoutsCsvButton.addEventListener('click', exportPayoutsToCSV);

    fileMenuButton.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const isExpanded = fileMenuButton.getAttribute('aria-expanded') === 'true';
        fileMenuDropdown.style.display = isExpanded ? 'none' : 'block';
        fileMenuButton.setAttribute('aria-expanded', (!isExpanded).toString());
    });

    document.addEventListener('click', (e) => {
        if (fileMenuContainer && fileMenuDropdown.style.display === 'block' && !fileMenuContainer.contains(e.target as Node)) {
            fileMenuDropdown.style.display = 'none';
            fileMenuButton.setAttribute('aria-expanded', 'false');
        }
    });
    
    const closeFileMenu = () => {
        fileMenuDropdown.style.display = 'none';
        fileMenuButton.setAttribute('aria-expanded', 'false');
    };

    importTripsCsvButton.addEventListener('click', () => importTripsCsvInput.click());
    importPayoutsCsvButton.addEventListener('click', () => importPayoutsCsvInput.click());

    const parseCSV = (csvText: string): { headers: string[], rows: string[][] } => {
        const lines = csvText.trim().split(/\r?\n/);
        if (lines.length === 0) return { headers: [], rows: [] };
        const firstLine = lines[0].startsWith('\uFEFF') ? lines[0].substring(1) : lines[0];
        const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, '')); 
        const rows = lines.slice(1).map(line => {
            return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        });
        return { headers, rows };
    };
    
    importTripsCsvInput.addEventListener('change', (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
            alert('Пожалуйста, выберите CSV файл.');
            importTripsCsvInput.value = ''; 
            closeFileMenu();
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const { headers, rows } = parseCSV(text);
            const expectedHeaders = ["Дата", "Пробег", "Расход", "Цена АИ-92", "Смена", "Заказов до 23", "Заказов после 23"];
            
            if (!expectedHeaders.every(eh => headers.includes(eh))) {
                alert(`Ошибка: CSV файл должен содержать следующие заголовки: ${expectedHeaders.join(', ')}`);
                importTripsCsvInput.value = '';
                closeFileMenu();
                return;
            }
            const headerMap: { [key: string]: number } = {};
            headers.forEach((h, i) => headerMap[h] = i);

            let importedCount = 0;
            let updatedCount = 0;
            let errorCount = 0;
            const existingTrips = getTripData();

            rows.forEach((row, rowIndex) => {
                try {
                    const data = row[headerMap["Дата"]];
                    if (!data || !new Date(data).toISOString().split('T')[0]) throw new Error("Неверный формат даты");
                    const formattedDate = new Date(data).toISOString().split('T')[0];

                    const probeg = parseFloat(row[headerMap["Пробег"]]);
                    const raskhod = parseFloat(row[headerMap["Расход"]]);
                    const cenaAI92 = parseFloat(row[headerMap["Цена АИ-92"]]);
                    const zakazovDo23 = parseInt(row[headerMap["Заказов до 23"]], 10);
                    const zakazovPosle23 = parseInt(row[headerMap["Заказов после 23"]], 10);

                    if ([probeg, raskhod, cenaAI92, zakazovDo23, zakazovPosle23].some(isNaN) || 
                        [probeg, raskhod, cenaAI92, zakazovDo23, zakazovPosle23].some(v => v < 0) ) { 
                        throw new Error("Некорректные числовые значения");
                    }

                    const denNedeli = getDayOfWeekName(formattedDate);
                    const C1_zakazovVsego = zakazovDo23 + zakazovPosle23;
                    const N1_summaVyplatRaschetnaya = 
                        (C1_zakazovVsego * appSettings.v1_srednyayaKompensatsiaToplivo) + 
                        (zakazovPosle23 * appSettings.u1_cenaZakazaPosle23) + 
                        (zakazovDo23 * appSettings.t1_cenaZakazaDo23);
                    
                    const newTrip: Omit<TripData, 'id'> = {
                        denNedeli, data: formattedDate, probeg, raskhod, cenaAI92, 
                        zakazovDo23, zakazovPosle23, zakazovVsego: C1_zakazovVsego, summaVyplatRaschetnaya: N1_summaVyplatRaschetnaya
                    };

                    const existingIndex = existingTrips.findIndex(t => t.data === formattedDate);
                    if (existingIndex > -1) {
                        existingTrips[existingIndex] = { ...existingTrips[existingIndex], ...newTrip };
                        updatedCount++;
                    } else {
                        existingTrips.push({ id: Date.now().toString() + Math.random().toString().substring(2) + rowIndex, ...newTrip });
                        importedCount++;
                    }
                } catch (err) {
                    console.error(`Ошибка импорта строки ${rowIndex + 1} из CSV поездок:`, err, row);
                    errorCount++;
                }
            });
            saveTripDataToLS(existingTrips);
            alert(`Импорт поездок завершен.\nНовых записей: ${importedCount}\nОбновлено записей: ${updatedCount}\nОшибок: ${errorCount}`);
            if (summaryView.style.display === 'block') applyFilters(); // Re-apply filters
            importTripsCsvInput.value = ''; 
            closeFileMenu();
        };
        reader.onerror = () => {
            alert('Не удалось прочитать файл.');
            importTripsCsvInput.value = '';
            closeFileMenu();
        };
        reader.readAsText(file, 'UTF-8');
    });

    importPayoutsCsvInput.addEventListener('change', (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
         if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
            alert('Пожалуйста, выберите CSV файл.');
            importPayoutsCsvInput.value = '';
            closeFileMenu();
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const { headers, rows } = parseCSV(text);
            const expectedHeaders = ["Дата", "Сумма"];

            if (!expectedHeaders.every(eh => headers.includes(eh))) {
                alert(`Ошибка: CSV файл выплат должен содержать следующие заголовки: ${expectedHeaders.join(', ')}`);
                importPayoutsCsvInput.value = '';
                closeFileMenu();
                return;
            }
            const headerMap: { [key: string]: number } = {};
            headers.forEach((h, i) => headerMap[h] = i);

            let importedCount = 0;
            let duplicateCount = 0;
            let errorCount = 0;
            const existingPayouts = getRecordedPayouts();

            rows.forEach((row, rowIndex) => {
                try {
                    const dateStr = row[headerMap["Дата"]];
                    if (!dateStr || !new Date(dateStr).toISOString().split('T')[0]) throw new Error("Неверный формат даты");
                    const formattedDate = new Date(dateStr).toISOString().split('T')[0];
                    
                    const amount = parseFloat(row[headerMap["Сумма"]]);
                    if (isNaN(amount) || amount <= 0) throw new Error("Некорректная сумма");

                    const isDuplicate = existingPayouts.some(p => p.date === formattedDate && p.amount === amount);
                    if (isDuplicate) {
                        duplicateCount++;
                        return;
                    }

                    existingPayouts.push({
                        id: Date.now().toString() + Math.random().toString().substring(2) + rowIndex,
                        date: formattedDate,
                        amount
                    });
                    importedCount++;
                } catch (err) {
                    console.error(`Ошибка импорта строки ${rowIndex + 1} из CSV выплат:`, err, row);
                    errorCount++;
                }
            });
            saveRecordedPayouts(existingPayouts);
            alert(`Импорт выплат завершен.\nНовых записей: ${importedCount}\nПропущено дубликатов: ${duplicateCount}\nОшибок: ${errorCount}`);
            
            //Update displays based on current filters
            updateTotalActualPayoutsDisplay(dateFilterFromInput.value, dateFilterToInput.value);
            updateNetBalanceDisplay(); // This also respects filters implicitly
            if (payoutsView.style.display === 'block') {
                renderPayoutsTable(dateFilterFromInput.value, dateFilterToInput.value);
            }
            
            importPayoutsCsvInput.value = '';
            closeFileMenu();
        };
        reader.onerror = () => {
            alert('Не удалось прочитать файл.');
            importPayoutsCsvInput.value = '';
            closeFileMenu();
        };
        reader.readAsText(file, 'UTF-8');
    });

    const exportAllDataForBackup = () => {
        const allTrips = getTripData();
        if (allTrips.length > 0) {
            const tripsHeaders = ["Дата", "Пробег", "Расход", "Цена АИ-92", "Смена", "Заказов до 23", "Заказов после 23"];
            const tripsCsvRows = [
                tripsHeaders.join(','),
                ...allTrips.map(trip => [
                    trip.data,
                    trip.probeg,
                    trip.raskhod,
                    trip.cenaAI92,
                    appSettings.k1_smenaChDefault, 
                    trip.zakazovDo23,
                    trip.zakazovPosle23
                ].join(','))
            ];
            const tripsCsvString = `\uFEFF${tripsCsvRows.join('\n')}`;
            const tripsBlob = new Blob([tripsCsvString], { type: 'text/csv;charset=utf-8;' });
            const tripsLink = document.createElement("a");
            tripsLink.href = URL.createObjectURL(tripsBlob);
            tripsLink.download = `all_trips_backup_${formatDateForFilename(new Date())}.csv`;
            document.body.appendChild(tripsLink);
            tripsLink.click();
            document.body.removeChild(tripsLink);
        } else {
            alert("Нет данных о поездках для резервного копирования.");
        }

        const allPayouts = getRecordedPayouts();
        if (allPayouts.length > 0) {
            const payoutsHeaders = ["Дата", "Сумма"];
            const payoutsCsvRows = [
                payoutsHeaders.join(','),
                ...allPayouts.map(payout => [
                    payout.date,
                    payout.amount.toFixed(2)
                ].join(','))
            ];
            const payoutsCsvString = `\uFEFF${payoutsCsvRows.join('\n')}`;
            const payoutsBlob = new Blob([payoutsCsvString], { type: 'text/csv;charset=utf-8;' });
            const payoutsLink = document.createElement("a");
            payoutsLink.href = URL.createObjectURL(payoutsBlob);
            payoutsLink.download = `all_payouts_backup_${formatDateForFilename(new Date())}.csv`;
            document.body.appendChild(payoutsLink);
            payoutsLink.click();
            document.body.removeChild(payoutsLink);
        } else {
            if (allTrips.length > 0) { 
                 alert("Нет данных о выплатах для резервного копирования.");
            }
        }
        closeFileMenu();
    };
    backupAllDataButton.addEventListener('click', exportAllDataForBackup);

    toggleWeeklySummaryButton.addEventListener('click', () => {
        const isExpanded = toggleWeeklySummaryButton.getAttribute('aria-expanded') === 'true';
        weeklySummaryDetailsRegion.style.display = isExpanded ? 'none' : 'block';
        toggleWeeklySummaryButton.setAttribute('aria-expanded', String(!isExpanded));
        const icon = toggleWeeklySummaryButton.querySelector('.toggle-icon');
        if (icon) {
            icon.textContent = isExpanded ? '▼' : '▲';
        }
    });

    // --- Initialization ---
    loadSettings(); 
    resetCalculatorForm(true); 
    showCalculatorView(); 
    calculateResults(); 
    updateTotalActualPayoutsDisplay(); // Initial display without filters (shows all)
    // updateNetBalanceDisplay(); // Called within renderSummaryTable by applyFilters initially
    if (actualPayoutDateInput) {
        actualPayoutDateInput.value = formatDateForStorage(new Date());
    }
});
