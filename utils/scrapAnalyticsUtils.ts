import { ScrapRecord, ScrapMetal } from '../types/appTypes';

export const processScrapAnalytics = (
    archives: any[],
    metals: ScrapMetal[],
    startTime: number,
    endTime: number
) => {
    let totalNetto = 0;
    let totalExternalWeight = 0;
    const metalWeightMap: Record<string, number> = {};
    const monthlyData: Record<string, { weight: number, externalWeight: number, [key: string]: any }> = {};

    // 1. Získanie zoznamu všetkých mesiacov v rozsahu pre os X
    const start = new Date(startTime);
    const end = new Date(endTime);
    const months: string[] = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    
    while (current <= end) {
        months.push(`${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`);
        current.setMonth(current.getMonth() + 1);
    }

    // Inicializácia mesačných dát
    months.forEach(m => {
        monthlyData[m] = { weight: 0, externalWeight: 0 };
    });

    // 2. Filtrovať archívy podľa času expedície
    const filteredArchives = archives.filter(a => {
        const ts = new Date(a.dispatchDate).getTime();
        return ts >= startTime && ts <= endTime;
    });

    filteredArchives.forEach(archive => {
        const sanonExternalWeight = archive.externalWeight || 0;
        totalExternalWeight += sanonExternalWeight;

        const dateObj = new Date(archive.dispatchDate);
        const monthKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (monthlyData[monthKey]) {
            monthlyData[monthKey].externalWeight += sanonExternalWeight;
        }

        (archive.items || []).forEach((record: ScrapRecord) => {
            totalNetto += record.netto;
            
            // Distribúcia podľa kovu
            const metal = metals.find(m => m.id === record.metalId);
            const metalName = metal?.type || 'Iné';
            metalWeightMap[metalName] = (metalWeightMap[metalName] || 0) + record.netto;

            // Mesačné trendy hmotnosti
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].weight += record.netto;
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
            externalWeight: Math.round(data.externalWeight)
        }));

    return {
        totalNetto: Math.round(totalNetto),
        totalExternalWeight: Math.round(totalExternalWeight),
        weightDistribution,
        trendData
    };
};