import { ScrapRecord, ScrapPrice, ScrapMetal } from '../types/appTypes';

export const processScrapAnalytics = (
    archives: any[],
    prices: ScrapPrice[],
    metals: ScrapMetal[],
    startTime: number,
    endTime: number
) => {
    let totalNetto = 0;
    let totalValue = 0;
    let totalExternalValue = 0;
    const metalWeightMap: Record<string, number> = {};
    const monthlyData: Record<string, { weight: number, value: number, externalValue: number, [key: string]: any }> = {};

    // 1. Získanie zoznamu všetkých mesiacov v rozsahu pre os X
    const start = new Date(startTime);
    const end = new Date(endTime);
    const months: string[] = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    
    while (current <= end) {
        months.push(`${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`);
        current.setMonth(current.getMonth() + 1);
    }

    // Inicializácia mesačných dát aj s cenami (aj keď nebol vývoz)
    months.forEach(m => {
        const [year, month] = m.split('-').map(Number);
        monthlyData[m] = { weight: 0, value: 0, externalValue: 0 };
        
        // Pridanie cien pre každý kov v danom mesiaci
        metals.forEach(metal => {
            const priceObj = prices.find(p => p.metalId === metal.id && p.month === month && p.year === year);
            if (priceObj) {
                monthlyData[m][metal.type] = priceObj.price;
            }
        });
    });

    // 2. Filtrovať archívy podľa času expedície
    const filteredArchives = archives.filter(a => {
        const ts = new Date(a.dispatchDate).getTime();
        return ts >= startTime && ts <= endTime;
    });

    filteredArchives.forEach(archive => {
        const sanonExternalValue = archive.externalValue || 0;
        totalExternalValue += sanonExternalValue;

        const dateObj = new Date(archive.dispatchDate);
        const monthKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (monthlyData[monthKey]) {
            monthlyData[monthKey].externalValue += sanonExternalValue;
        }

        (archive.items || []).forEach((record: ScrapRecord) => {
            totalNetto += record.netto;
            
            // Distribúcia podľa kovu
            const metal = metals.find(m => m.id === record.metalId);
            const metalName = metal?.type || 'Iné';
            metalWeightMap[metalName] = (metalWeightMap[metalName] || 0) + record.netto;

            // Výpočet finančnej hodnoty (interný odhad podľa cenníka)
            const recordDate = new Date(record.timestamp);
            const month = recordDate.getMonth() + 1;
            const year = recordDate.getFullYear();
            
            const priceObj = prices.find(p => p.metalId === record.metalId && p.month === month && p.year === year);
            const price = priceObj?.price || 0;
            const value = record.netto * price;
            totalValue += value;

            // Mesačné trendy hmotnosti a hodnoty
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].weight += record.netto;
                monthlyData[monthKey].value += value;
            }
        });
    });

    const weightDistribution = Object.entries(metalWeightMap).map(([name, weight]) => ({
        name,
        value: Math.round(weight)
    }));

    const trendData = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
            month,
            ...data,
            weight: Math.round(data.weight),
            value: Math.round(data.value),
            externalValue: Math.round(data.externalValue)
        }));

    return {
        totalNetto: Math.round(totalNetto),
        totalValue: Math.round(totalValue),
        totalExternalValue: Math.round(totalExternalValue),
        weightDistribution,
        trendData
    };
};