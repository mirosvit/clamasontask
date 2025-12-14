
import React, { useState, useMemo } from 'react';
import { Task } from '../App';
import { useLanguage } from './LanguageContext';

declare var XLSX: any;

interface LogisticsCenterTabProps {
    tasks: Task[];
    onDeleteTask: (id: string) => void;
    hasPermission: (perm: string) => boolean;
}

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

const LogisticsCenterTab: React.FC<LogisticsCenterTabProps> = ({ tasks, onDeleteTask, hasPermission }) => {
    const { t } = useLanguage();
    const [filterQuery, setFilterQuery] = useState('');
    
    // Filter only LOGISTICS tasks
    const logisticsTasks = useMemo(() => {
        return tasks.filter(task => task.type === 'logistics').sort((a, b) => {
            const timeA = a.createdAt || 0;
            const timeB = b.createdAt || 0;
            return timeB - timeA; // Newest first
        });
    }, [tasks]);

    const filteredItems = useMemo(() => {
        if (!filterQuery) return logisticsTasks;
        const q = filterQuery.toLowerCase();
        return logisticsTasks.filter(task => 
            (task.partNumber && task.partNumber.toLowerCase().includes(q)) || // Reference/Plate
            (task.workplace && task.workplace.toLowerCase().includes(q)) || // Operation
            (task.createdBy && task.createdBy.toLowerCase().includes(q))
        );
    }, [logisticsTasks, filterQuery]);

    const formatTime = (ts?: number) => {
        if (!ts) return '-';
        return new Date(ts).toLocaleString('sk-SK');
    };

    const getQuantityString = (task: Task) => {
        if (!task.quantity) return '-';
        let unitLabel = task.quantityUnit || '';
        // Simple mapping to short codes or use existing translation keys
        if (unitLabel === 'pcs') unitLabel = t('unit_pcs_short');
        if (unitLabel === 'boxes') unitLabel = t('unit_boxes_short');
        if (unitLabel === 'pallet') unitLabel = t('unit_pallet_short');
        return `${task.quantity} ${unitLabel}`;
    };

    const handleExport = () => {
        if (typeof XLSX === 'undefined') {
            alert('Export library missing.');
            return;
        }
        const data = filteredItems.map(item => ({
            [t('miss_th_created')]: formatTime(item.createdAt),
            [t('miss_th_creator')]: item.createdBy || '-',
            [t('log_th_reference')]: item.partNumber || '-', // Used for Ref/Plate
            [t('log_th_operation')]: item.workplace || '-', // Used for Operation
            [t('log_th_quantity')]: getQuantityString(item),
            [t('log_th_priority')]: item.priority || 'NORMAL',
            [t('log_th_status')]: item.isDone ? t('status_completed') : t('status_open'),
            [t('log_th_completed_by')]: item.completedBy || '-',
            [t('miss_th_when')]: formatTime(item.completedAt)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('log_sheet_name'));
        XLSX.writeFile(wb, `Logistics_Center_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t('miss_delete_confirm'))) {
            onDeleteTask(id);
        }
    }

    const getPriorityColor = (p?: string) => {
        switch(p) {
            case 'URGENT': return 'text-red-400 font-bold';
            case 'LOW': return 'text-blue-300';
            default: return 'text-gray-300';
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 bg-gray-900 rounded-xl shadow-lg border border-sky-600 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-sky-400">{t('log_center_title')}</h1>
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
                    className="w-full max-w-md bg-gray-800 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                />
            </div>

            <div className="overflow-x-auto custom-scrollbar"> 
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-gray-800 text-gray-300 border-b border-gray-700 text-sm">
                            <th className="py-3 px-4">{t('miss_th_created')}</th>
                            <th className="py-3 px-4">{t('miss_th_creator')}</th>
                            <th className="py-3 px-4">{t('log_th_reference')}</th>
                            <th className="py-3 px-4">{t('log_th_operation')}</th>
                            <th className="py-3 px-4">{t('log_th_quantity')}</th>
                            <th className="py-3 px-4">{t('log_th_priority')}</th>
                            <th className="py-3 px-4">{t('log_th_status')}</th>
                            <th className="py-3 px-4">{t('log_th_completed_by')}</th>
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
                                    <td className="py-3 px-4 text-sky-400">{item.workplace}</td>
                                    <td className="py-3 px-4 font-bold">{getQuantityString(item)}</td>
                                    <td className={`py-3 px-4 ${getPriorityColor(item.priority)}`}>{t(item.priority === 'URGENT' ? 'prio_urgent' : item.priority === 'LOW' ? 'prio_low' : 'prio_normal')}</td>
                                    <td className="py-3 px-4">
                                        {item.isDone ? <span className="text-green-400">✓ {t('status_completed')}</span> : <span className="text-gray-400">{t('status_open')}</span>}
                                    </td>
                                    <td className="py-3 px-4">{item.completedBy || '-'}</td>
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
                                <td colSpan={hasPermission('perm_btn_delete') ? 10 : 9} className="py-8 text-center text-gray-500 italic">
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

export default LogisticsCenterTab;
