import React, { useState, useMemo } from 'react';
import { Task } from '../App'; // Changed import source for Task
import { useLanguage } from './LanguageContext';

declare var XLSX: any;

interface MissingItemsTabProps {
    tasks: Task[];
    onDeleteMissingItem: (id: string) => void; // Added onDeleteMissingItem
    hasPermission: (perm: string) => boolean;
}

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

const MissingItemsTab: React.FC<MissingItemsTabProps> = ({ tasks, onDeleteMissingItem, hasPermission }) => {
    const { t } = useLanguage();
    const [filterQuery, setFilterQuery] = useState('');
    
    const missingTasks = useMemo(() => {
        return tasks.filter(task => task.isMissing).sort((a, b) => {
            const timeA = a.completedAt || a.createdAt || 0;
            const timeB = b.completedAt || b.createdAt || 0;
            return timeB - timeA; // Newest first
        });
    }, [tasks]);

    const filteredItems = useMemo(() => {
        if (!filterQuery) return missingTasks;
        const q = filterQuery.toLowerCase();
        return missingTasks.filter(task => 
            (task.partNumber && task.partNumber.toLowerCase().includes(q)) ||
            (task.workplace && task.workplace.toLowerCase().includes(q)) ||
            (task.missingReportedBy && task.missingReportedBy.toLowerCase().includes(q)) ||
            (task.missingReason && task.missingReason.toLowerCase().includes(q)) ||
            (task.createdBy && task.createdBy.toLowerCase().includes(q)) // Added search by creator
        );
    }, [missingTasks, filterQuery]);

    const formatTime = (ts?: number) => {
        if (!ts) return '-';
        return new Date(ts).toLocaleString('sk-SK');
    };

    const handleExport = () => {
        if (typeof XLSX === 'undefined') {
            alert('Export library missing.');
            return;
        }
        const data = filteredItems.map(item => ({
            [t('miss_th_created')]: formatTime(item.createdAt),
            [t('miss_th_creator')]: item.createdBy || '-',
            [t('miss_th_part')]: item.partNumber || '-',
            [t('miss_th_wp')]: item.workplace || '-',
            [t('miss_th_reason')]: item.missingReason || '-',
            [t('miss_th_who')]: item.missingReportedBy || '-',
            [t('miss_th_when')]: formatTime(item.completedAt)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('missing_items_sheet_name'));
        XLSX.writeFile(wb, `Missing_Items_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t('miss_delete_confirm'))) {
            onDeleteMissingItem(id);
        }
    }

    return (
        <div className="max-w-6xl mx-auto p-4 bg-gray-900 rounded-xl shadow-lg border border-gray-700 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-red-400">{t('miss_tab_title')}</h1>
                <button 
                    onClick={handleExport}
                    className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                    {t('export_excel')}
                </button>
            </div>

            <div className="mb-4">
                <input 
                    type="text" 
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder={t('task_search_placeholder')}
                    className="w-full max-w-md bg-gray-800 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
            </div>

            <div className="overflow-x-auto custom-scrollbar"> 
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-gray-800 text-gray-300 border-b border-gray-700 text-sm">
                            <th className="py-3 px-4">{t('miss_th_created')}</th>
                            <th className="py-3 px-4">{t('miss_th_creator')}</th>
                            <th className="py-3 px-4">{t('miss_th_part')}</th>
                            <th className="py-3 px-4">{t('miss_th_wp')}</th>
                            <th className="py-3 px-4">{t('miss_th_reason')}</th>
                            <th className="py-3 px-4">{t('miss_th_who')}</th>
                            <th className="py-3 px-4">{t('miss_th_when')}</th>
                            {hasPermission('perm_btn_delete') && <th className="py-3 px-4"></th>}
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filteredItems.length > 0 ? (
                            filteredItems.map(item => (
                                <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50 text-white">
                                    <td className="py-3 px-4 text-gray-400">{formatTime(item.createdAt)}</td>
                                    <td className="py-3 px-4">{item.createdBy || '-'}</td>
                                    <td className="py-3 px-4 font-bold font-mono">{item.partNumber}</td>
                                    <td className="py-3 px-4 text-teal-400">{item.workplace}</td>
                                    <td className="py-3 px-4 text-red-400 font-bold">{item.missingReason}</td>
                                    <td className="py-3 px-4">{item.missingReportedBy}</td>
                                    <td className="py-3 px-4 text-gray-400">{formatTime(item.completedAt)}</td>
                                    {hasPermission('perm_btn_delete') && (
                                        <td className="py-3 px-4 text-center">
                                            <button onClick={() => handleDelete(item.id)} className="text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-gray-700">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={hasPermission('perm_btn_delete') ? 8 : 7} className="py-8 text-center text-gray-500 italic">
                                    {t('no_data')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MissingItemsTab;