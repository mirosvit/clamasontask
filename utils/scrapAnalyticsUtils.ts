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
    const metalWeightMap: Record<string, number> = {};
    const monthlyData: Record<string, { weight: number, value: number }> = {};

    // 1. Filtrovať archívy podľa času expedície
    const filteredArchives = archives.filter(a => {
        const ts = new Date(a.dispatchDate).getTime();
        return ts >= startTime && ts <= endTime;
    });

    filteredArchives.forEach(archive => {
        (archive.items || []).forEach((record: ScrapRecord) => {
            totalNetto += record.netto;
            
            // Distribúcia podľa kovu
            const metal = metals.find(m => m.id === record.metalId);
            const metalName = metal?.type || 'Iné';
            metalWeightMap[metalName] = (metalWeightMap[metalName] || 0) + record.netto;

            // Výpočet finančnej hodnoty
            const recordDate = new Date(record.timestamp);
            const month = recordDate.getMonth() + 1;
            const year = recordDate.getFullYear();
            
            const priceObj = prices.find(p => p.metalId === record.metalId && p.month === month && p.year === year);
            const price = priceObj?.price || 0;
            const value = record.netto * price;
            totalValue += value;

            // Mesačné trendy
            const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
            if (!monthlyData[monthKey]) monthlyData[monthKey] = { weight: 0, value: 0 };
            monthlyData[monthKey].weight += record.netto;
            monthlyData[monthKey].value += value;
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
            weight: Math.round(data.weight),
            value: Math.round(data.value)
        }));

    return {
        totalNetto: Math.round(totalNetto),
        totalValue: Math.round(totalValue),
        weightDistribution,
        trendData
    };
};