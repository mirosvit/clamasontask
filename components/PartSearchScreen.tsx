import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from './LanguageContext';
import AppHeader from './AppHeader';
import TabNavigator from './TabNavigator';
import ProductionEntry from './tabs/ProductionEntry';
import TaskList from './tabs/TaskList';
import QuickActionTab from './tabs/QuickActionTab';
import BOMScreen from './tabs/BOMScreen';
import MissingItemsTab from './tabs/MissingItemsTab';
import InventoryTab from './tabs/InventoryTab';
import LogisticsCenterTab from './tabs/LogisticsCenterTab';
import MapVisualizationTab from './tabs/MapVisualizationTab';
import TransactionLogTab from './tabs/TransactionLogTab';
import ERPBlockageTab from './tabs/ERPBlockageTab';
import AnalyticsTab from './tabs/Analytics/AnalyticsTab';
import SettingsTab from './settings/SettingsTab';
import PermissionsTab from './tabs/PermissionsTab';
import PartCatalogTab from './tabs/PartCatalogTab';
import ScrapWeighingTab from './tabs/ScrapWeighingTab';
import ScrapWarehouseTab from './tabs/ScrapWarehouseTab';
import ScrapArchiveTab from './tabs/ScrapArchiveTab';
import ScrapAnalyticsTab from './tabs/ScrapAnalyticsTab';
import InstructionsTab from './tabs/InstructionsTab';
import { Task, PriorityLevel, DBItem, Role, SystemConfig, MapSector, MapObstacle, BOMComponent, PartRequest, BOMRequest, AdminNote, ERPBlockage, ScrapBin, ScrapMetal, ScrapPrice, ScrapRecord, ScrapBuyer } from '../types/appTypes';

// --- MAIN DASHBOARD COMPONENT ---
interface PartSearchScreenProps {
    tasks: Task[];
    draftTasks: Task[];
    users: any[];
    roles: Role[];
    workplaces: DBItem[];
    parts: { id: string; value: string; description?: string }[];
    missingReasons: DBItem[];
    logisticsOperations: DBItem[];
    mapSectors: MapSector[];
    mapObstacles: MapObstacle[];
    bomMap: Record<string, BOMComponent[]>;
    partRequests: PartRequest[];
    bomRequests: BOMRequest[];
    adminNotes: AdminNote[];
    erpBlockages: ERPBlockage[];
    systemConfig: SystemConfig;
    isBreakActive: boolean;

    // Scrap Data
    scrapBins: ScrapBin[];
    scrapMetals: ScrapMetal[];
    scrapPrices: ScrapPrice[];
    scrapBuyers: ScrapBuyer[];
    actualScrap: ScrapRecord[];
    scrapSanons: any[];
    onAddScrapRecord: (record: ScrapRecord) => Promise<void>;
    onBulkAddScrapRecords: (records: ScrapRecord[]) => Promise<void>;
    onDeleteScrapRecord: (id: string) => Promise<void>;
    onUpdateScrapRecord: (id: string, updates: Partial<ScrapRecord>) => Promise<void>;
    onUpdateArchivedScrapItem: (sanonId: string, itemId: string, updates: Partial<ScrapRecord>) => Promise<void>;
    onUpdateScrapArchive: (sanonId: string, updates: any) => Promise<void>;
    onDeleteArchivedScrapItem: (sanonId: string, itemId: string) => Promise<void>;
    onDeleteScrapArchive: (id: string) => Promise<void>;
    onExpediteScrap: (worker: string, dispatchDate: string, selectedIds?: string[], buyerId?: string) => Promise<string | undefined>;
    onFinalizeScrapArchive: (date: string, worker: string, items: ScrapRecord[]) => Promise<string | undefined>;
    onFetchScrapArchives: (from: string, to: string) => Promise<any[]>;
    onAppendWarehouseItemsToArchive: (sanonId: string, selectedIds: string[]) => Promise<void>;
    onAddManualItemToArchive: (sanonId: string, record: ScrapRecord) => Promise<void>;

    currentUser: string;
    currentUserRole: 'ADMIN' | 'USER' | 'LEADER';
    onLogout: () => void;

    // Task Actions
    onAddTask: (partNumber: string, workplace: string | null, quantity: string | null, quantityUnit: string | null, priority: PriorityLevel, isLogistics?: boolean, noteOrPlate?: string, isProduction?: boolean, sourceSectorId?: string | null, targetSectorId?: string | null, startNow?: boolean, isActivity?: boolean, isInventory?: boolean) => Promise<void>;
    onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
    onDeleteTask: (id: string) => Promise<void>;
    onToggleTask: (id: string, sectorId?: string) => Promise<void>;
    onSetInProgress: (id: string) => Promise<void>;
    onToggleBlock: (id: string) => Promise<void>;
    onToggleManualBlock: (id: string) => Promise<void>;
    onExhaustSearch: (id: string) => Promise<void>;
    onMarkAsIncorrect: (id: string) => Promise<void>;
    onAddNote: (id: string, note: string) => Promise<void>;
    onReleaseTask: (id: string) => Promise<void>;
    onStartAudit: (id: string) => Promise<void>;
    onFinishAudit: (id: string, result: 'found' | 'missing', note: string) => Promise<void>;
    onToggleMissing: (id: string, reason?: string) => Promise<void>;
    onDeleteMissingItem: (id: string) => Promise<void>;

    // User & Permission Management
    onUpdatePermission: (permissionName: string, roleName: string, hasPermission: boolean) => Promise<void>;
    onUpdateUserRole: (username: string, newRole: string) => Promise<void>;
    onAddRole: (name: string, parentId?: string, rank?: number) => Promise<void>;
    onDeleteRole: (id: string) => Promise<void>;

    // System Settings
    onUpdateSystemConfig: (config: Partial<SystemConfig>) => Promise<void>;
    onUpdateAdminKey: (oldKey: string, newKey: string) => Promise<void>;
    onToggleAdminLock: (val: boolean) => void;

    // Database Management
    onAddPart: (value: string, description?: string) => Promise<void>;
    onBatchAddParts: (vals: string[]) => Promise<void>;
    onDeletePart: (val: string) => Promise<void>;
    onDeleteAllParts: () => Promise<void>;

    onAddWorkplace: (val: string, time?: number, x?: number, y?: number, additionalMessage?: string) => Promise<void>;
    onUpdateWorkplace: (id: string, updates: Partial<DBItem>) => Promise<void>;
    onBatchAddWorkplaces: (vals: string[]) => Promise<void>;
    onDeleteWorkplace: (id: string) => Promise<void>;
    onDeleteAllWorkplaces: () => Promise<void>;

    onAddLogisticsOperation: (val: string, time?: number, dist?: number, x?: number, y?: number, defaultSource?: string | null, defaultTarget?: string | null) => Promise<void>;
    onUpdateLogisticsOperation: (id: string, updates: Partial<DBItem>) => Promise<void>;
    onDeleteLogisticsOperation: (id: string) => Promise<void>;
    onDeleteAllLogisticsOperations: () => Promise<void>;

    onAddMapSector: (name: string, x: number, y: number, color?: string) => Promise<void>;
    onUpdateMapSector: (id: string, updates: Partial<MapSector>) => Promise<void>;
    onDeleteMapSector: (id: string) => Promise<void>;

    onAddMapObstacle: (obs: Omit<MapObstacle, 'id'>) => Promise<void>;
    onDeleteMapObstacle: (id: string) => Promise<void>;

    onAddBOMItem: (parent: string, child: string, qty: number) => Promise<void>;
    onBatchAddBOMItems: (vals: string[]) => Promise<void>;
    onDeleteBOMItem: (parent: string, child: string) => Promise<void>;
    onDeleteAllBOMItems: () => Promise<void>;

    onAddMissingReason: (val: string) => Promise<void>;
    onDeleteMissingReason: (id: string) => Promise<void>;
    onAddBreakSchedule: (start: string, end: string) => Promise<void>;
    onDeleteBreakSchedule: (id: string) => Promise<void>;

    onAddAdminNote: (text: string, author: string) => Promise<void>;
    onDeleteAdminNote: (id: string) => Promise<void>;
    onClearAdminNotes: () => Promise<void>;

    // Maintenance & Data
    onDailyClosing: () => Promise<{ success: boolean; count: number }>;
    onWeeklyClosing: () => Promise<{ success: boolean; count: number; sanon: string }>;
    onPurgeOldTasks: () => Promise<number>;
    onExportTasksJSON: () => Promise<void>;
    onGetDocCount: () => Promise<number>;
    fetchSanons: () => Promise<any[]>;
    onRequestPart: (part: string) => Promise<boolean>;
    onRequestBOM: (parent: string) => Promise<boolean>;
    onVerifyAdminPassword: (password: string) => boolean;

    installPrompt: any;
    onInstallApp: () => void;
}

const PartSearchScreen: React.FC<PartSearchScreenProps> = (props) => {
    const { t, language, setLanguage } = useLanguage();
    const [activeTab, setActiveTab] = useState('entry');
    const [mode, setMode] = useState<'production' | 'logistics' | 'inventory'>('production');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Form states for adding new tasks
    const [selectedPart, setSelectedPart] = useState<string | null>(null);
    const [selectedWorkplace, setSelectedWorkplace] = useState<string | null>(null);
    const [quantity, setQuantity] = useState('');
    const [quantityUnit, setQuantityUnit] = useState<'pcs' | 'boxes' | 'pallet'>('pcs');
    const [priority, setPriority] = useState<PriorityLevel>('NORMAL');
    const [logisticsRef, setLogisticsRef] = useState('');
    const [logisticsPlate, setLogisticsPlate] = useState('');
    const [logisticsOp, setLogisticsOp] = useState('');
    const [sourceSector, setSourceSector] = useState<string | null>(null);
    const [targetSector, setTargetSector] = useState<string | null>(null);

    // Toast notifications state
    const [toasts, setToasts] = useState<{ id: string; partNumber: string; workplace?: string; priority?: string; createdBy?: string }[]>([]);

    // Žiadosť o povolenie web notifikácií pri načítaní aplikácie
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
            window.Notification.requestPermission();
        }
    }, []);

    // Spracovanie prijatých udalostí pre novú úlohu v systéme
    useEffect(() => {
        const handleNewTask = (e: Event) => {
            const task = (e as CustomEvent).detail as Task;
            if (!task) return;

            const toastId = crypto.randomUUID();
            setToasts(prev => [
                ...prev,
                {
                    id: toastId,
                    partNumber: task.partNumber || '',
                    workplace: task.workplace || undefined,
                    priority: task.priority || undefined,
                    createdBy: task.createdBy || undefined
                }
            ]);

            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toastId));
            }, 6000);

            // Zobrazenie prehliadačovej (systémovej) notifikácie, ak je povolená
            if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
                try {
                    const title = language === 'sk' ? 'Pridaná nová úloha' : 'New Task Added';
                    const body = `${task.partNumber} -> ${task.workplace || '-'}\n${language === 'sk' ? 'Vytvoril' : 'Created by'}: ${task.createdBy}`;
                    new window.Notification(title, {
                        body,
                        icon: '/favicon.ico',
                        silent: true
                    });
                } catch (err) {
                    console.error('Chyba počas odosielania systémovej notifikácie:', err);
                }
            }
        };

        window.addEventListener('new-task-added', handleNewTask);
        return () => {
            window.removeEventListener('new-task-added', handleNewTask);
        };
    }, [language]);

    // --- AUTOMATICKÉ PREDNASTAVENIE JEDNOTKY PODĽA MÓDU ---
    useEffect(() => {
        if (mode === 'logistics') {
            setQuantityUnit('pallet');
        } else {
            setQuantityUnit('pcs');
        }
    }, [mode]);

    // Fullscreen handling
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => console.error(err));
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => setIsFullscreen(false)).catch(err => console.error(err));
            }
        }
    };

    // Permission check memoized for children
    const hasPermission = useCallback((permName: string) => {
        if (props.currentUserRole === 'ADMIN') return true;
        const roleObj = props.roles.find(r => r.name === props.currentUserRole);
        if (!roleObj) return false;
        return roleObj.permissions ? roleObj.permissions.includes(permName) : false;
    }, [props.roles, props.currentUserRole]);

    // Name resolution memoized for performance
    const resolveName = useCallback((username?: string | null) => {
        if (!username) return '-';
        const u = props.users.find(x => x.username === username);
        return (u?.nickname || username).toUpperCase();
    }, [props.users]);

    const resetEntry = () => {
        setSelectedPart(null);
        setSelectedWorkplace(null);
        setQuantity('');
        setQuantityUnit(mode === 'logistics' ? 'pallet' : 'pcs');
        setPriority('NORMAL');
        setLogisticsRef('');
        setLogisticsPlate('');
        setLogisticsOp('');
        setSourceSector(null);
        setTargetSector(null);
    };

    const handleAddTask = async () => {
        if (mode === 'production') {
            if (!selectedPart || !selectedWorkplace || !quantity) {
                alert(t('fill_all_fields'));
                return;
            }
            await props.onAddTask(
                selectedPart,
                selectedWorkplace,
                quantity,
                quantityUnit,
                priority,
                false,
                '',
                true
            );
            resetEntry();
        } else if (mode === 'inventory') {
            if (!selectedWorkplace) {
                alert(language === 'sk' ? 'Prosím vyberte regál / lokáciu pre inventúru.' : 'Please select shelf / location for inventory.');
                return;
            }
            const targetPartName = selectedPart || (() => {
                const locations = (selectedWorkplace || "")
                    .split(/[,\s;]+/)
                    .map(loc => loc.trim())
                    .filter(loc => loc.length > 0);
                return locations.length > 1 ? "INVENTÚRA POZÍCIÍ" : "INVENTÚRA POZÍCIE";
            })();
            await props.onAddTask(
                targetPartName,
                selectedWorkplace,
                "0",
                "pcs",
                priority,
                false,
                '',
                false,
                null,
                null,
                false,
                false,
                true // isInventory
            );
            resetEntry();
        } else {
            if (!logisticsRef || !logisticsOp || !quantity) {
                alert(t('fill_all_fields'));
                return;
            }
            await props.onAddTask(
                logisticsRef,
                logisticsOp,
                quantity,
                quantityUnit,
                priority,
                true,
                logisticsPlate,
                false,
                sourceSector,
                targetSector
            );
            resetEntry();
        }
    };

    const counts = useMemo(() => ({
        tasks: props.tasks.filter(t => !t.isDone).length,
        pendingRequests: props.partRequests.length + props.bomRequests.length,
        erpBlockages: (props.erpBlockages || []).filter(b => b.status !== 'ready').length
    }), [props.tasks, props.partRequests, props.bomRequests, props.erpBlockages]);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-900">
            {/* Top UI Bar */}
            <AppHeader 
                currentUser={props.currentUser}
                currentUserRole={props.currentUserRole}
                users={props.users}
                onLogout={props.onLogout}
                language={language as any}
                setLanguage={setLanguage as any}
                t={t}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
                installPrompt={props.installPrompt}
                onInstallApp={props.onInstallApp}
                hasPermission={hasPermission}
                resolveName={resolveName}
                isBreakActive={props.isBreakActive}
            />

            {/* Application Tab Selector */}
            <TabNavigator 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                hasPermission={hasPermission}
                t={t}
                counts={counts}
                currentUserRole={props.currentUserRole}
                systemConfig={props.systemConfig}
            />

            {/* Main Application Container */}
            <main className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6">
                <div className="max-w-7xl mx-auto h-full">
                    {activeTab === 'entry' && hasPermission('perm_tab_entry') && (
                        <ProductionEntry 
                            mode={mode}
                            setMode={setMode}
                            selectedPart={selectedPart}
                            setSelectedPart={setSelectedPart}
                            selectedWorkplace={selectedWorkplace}
                            setSelectedWorkplace={setSelectedWorkplace}
                            logisticsRef={logisticsRef}
                            setLogisticsRef={setLogisticsRef}
                            logisticsPlate={logisticsPlate}
                            setLogisticsPlate={setLogisticsPlate}
                            logisticsOp={logisticsOp}
                            setLogisticsOp={setLogisticsOp}
                            sourceSector={sourceSector}
                            setSourceSector={setSourceSector}
                            targetSector={targetSector}
                            setTargetSector={setTargetSector}
                            quantity={quantity}
                            setQuantity={setQuantity}
                            quantityUnit={quantityUnit}
                            setQuantityUnit={setQuantityUnit}
                            priority={priority}
                            setPriority={setPriority}
                            parts={props.parts}
                            workplaces={props.workplaces}
                            logisticsOperationsList={props.logisticsOperations}
                            mapSectors={props.mapSectors}
                            t={t}
                            language={language}
                            hasPermission={hasPermission}
                            handleAdd={handleAddTask}
                            onRequestPart={props.onRequestPart}
                        />
                    )}

                    {activeTab === 'tasks' && hasPermission('perm_tab_tasks') && (
                        <TaskList 
                            currentUser={props.currentUserRole as any}
                            currentUserName={props.currentUser}
                            tasks={props.tasks}
                            workplaces={props.workplaces}
                            missingReasons={props.missingReasons}
                            mapSectors={props.mapSectors}
                            onToggleTask={props.onToggleTask}
                            onEditTask={props.onUpdateTask}
                            onDeleteTask={props.onDeleteTask}
                            onToggleMissing={props.onToggleMissing}
                            onSetInProgress={props.onSetInProgress}
                            onToggleBlock={props.onToggleBlock}
                            onToggleManualBlock={props.onToggleManualBlock}
                            onExhaustSearch={props.onExhaustSearch}
                            onMarkAsIncorrect={props.onMarkAsIncorrect}
                            onAddNote={props.onAddNote}
                            onReleaseTask={props.onReleaseTask}
                            onAuditPart={props.onStartAudit}
                            onFinishAudit={props.onFinishAudit}
                            hasPermission={hasPermission}
                            resolveName={resolveName}
                            onSwitchTab={setActiveTab}
                        />
                    )}

                    {activeTab === 'quick_action' && hasPermission('perm_tab_quick_action') && (
                        <QuickActionTab />
                    )}

                    {activeTab === 'bom' && hasPermission('perm_tab_bom') && (
                        <BOMScreen 
                            parts={props.parts}
                            workplaces={props.workplaces}
                            bomMap={props.bomMap}
                            onAddTask={props.onAddTask}
                            onRequestBOM={props.onRequestBOM}
                            t={t}
                            language={language}
                        />
                    )}

                    {activeTab === 'catalog' && hasPermission('perm_tab_catalog') && (
                        <PartCatalogTab 
                            parts={props.parts}
                            onSelectPart={(p) => { setSelectedPart(p.value); setActiveTab('entry'); }}
                        />
                    )}

                    {activeTab === 'missing' && hasPermission('perm_tab_missing') && (
                        <MissingItemsTab 
                            tasks={props.tasks}
                            onDeleteMissingItem={props.onDeleteMissingItem}
                            hasPermission={hasPermission}
                            resolveName={resolveName}
                        />
                    )}

                    {activeTab === 'inventory' && hasPermission('perm_tab_inventory') && (
                        <InventoryTab 
                            currentUser={props.currentUser}
                            tasks={props.tasks}
                            onAddTask={props.onAddTask}
                            onUpdateTask={props.onUpdateTask}
                            onToggleTask={props.onToggleTask}
                            onDeleteTask={props.onDeleteTask}
                            hasPermission={hasPermission}
                            parts={props.parts.map(p => p.value)}
                            onRequestPart={props.onRequestPart}
                            resolveName={resolveName}
                        />
                    )}

                    {activeTab === 'logistics' && hasPermission('perm_tab_logistics_center') && (
                        <LogisticsCenterTab 
                            tasks={props.tasks} 
                            draftTasks={props.draftTasks}
                            users={props.users}
                            fetchSanons={props.fetchSanons}
                            onDeleteTask={props.onDeleteTask} 
                            hasPermission={hasPermission} 
                            resolveName={resolveName} 
                        />
                    )}

                    {activeTab === 'scrap_weighing' && hasPermission('perm_scrap_add') && (
                        <ScrapWeighingTab 
                            currentUser={props.currentUser}
                            bins={props.scrapBins}
                            metals={props.scrapMetals}
                            prices={props.scrapPrices}
                            actualScrap={props.actualScrap}
                            scrapSanons={props.scrapSanons}
                            onAddRecord={props.onAddScrapRecord}
                            onBulkAddScrapRecords={props.onBulkAddScrapRecords}
                            onDeleteRecord={props.onDeleteScrapRecord}
                            onFinalizeArchive={props.onFinalizeScrapArchive}
                            onAddTask={props.onAddTask}
                            onUpdateTask={props.onUpdateTask}
                            onDeleteTask={props.onDeleteTask}
                            tasks={props.tasks}
                            hasPermission={hasPermission}
                            resolveName={resolveName}
                        />
                    )}

                    {activeTab === 'scrap_warehouse' && hasPermission('perm_scrap_list') && (
                        <ScrapWarehouseTab 
                            currentUser={props.currentUser}
                            actualScrap={props.actualScrap}
                            bins={props.scrapBins}
                            metals={props.scrapMetals}
                            prices={props.scrapPrices}
                            buyers={props.scrapBuyers || []}
                            scrapArchives={props.scrapSanons}
                            onDeleteRecord={props.onDeleteScrapRecord}
                            onUpdateRecord={props.onUpdateScrapRecord}
                            onExpedite={props.onExpediteScrap}
                            onAppendWarehouseItemsToArchive={props.onAppendWarehouseItemsToArchive}
                            onFetchArchives={props.onFetchScrapArchives}
                            resolveName={resolveName}
                        />
                    )}

                    {activeTab === 'scrap_archive' && hasPermission('perm_scrap_archive') && (
                        <ScrapArchiveTab 
                            scrapArchives={props.scrapSanons}
                            bins={props.scrapBins}
                            metals={props.scrapMetals}
                            prices={props.scrapPrices}
                            buyers={props.scrapBuyers || []}
                            onUpdateArchivedItem={props.onUpdateArchivedScrapItem}
                            onUpdateScrapArchive={props.onUpdateScrapArchive}
                            onDeleteArchivedItem={props.onDeleteArchivedScrapItem}
                            onDeleteArchive={props.onDeleteScrapArchive}
                            onFetchArchives={props.onFetchScrapArchives}
                            onAddManualItemToArchive={props.onAddManualItemToArchive}
                            resolveName={resolveName}
                            hasPermission={hasPermission}
                        />
                    )}

                    {activeTab === 'scrap_analytics' && hasPermission('perm_tab_scrap_analytics') && (
                        <ScrapAnalyticsTab 
                            scrapSanons={props.scrapSanons}
                            scrapPrices={props.scrapPrices}
                            scrapMetals={props.scrapMetals}
                            onFetchArchives={props.onFetchScrapArchives}
                        />
                    )}

                    {activeTab === 'instructions' && hasPermission('perm_tab_instructions') && (
                        <InstructionsTab />
                    )}

                    {activeTab === 'map' && hasPermission('perm_tab_map') && (
                        <MapVisualizationTab 
                            tasks={props.tasks}
                            draftTasks={props.draftTasks}
                            fetchSanons={props.fetchSanons}
                            users={props.users}
                            mapSectors={props.mapSectors}
                            workplaces={props.workplaces}
                            logisticsOperations={props.logisticsOperations}
                            mapObstacles={props.mapObstacles}
                            systemConfig={props.systemConfig}
                            resolveName={resolveName}
                        />
                    )}

                    {activeTab === 'logs' && hasPermission('perm_tab_logs') && (
                        <TransactionLogTab 
                            tasks={props.tasks}
                            draftTasks={props.draftTasks}
                            fetchSanons={props.fetchSanons}
                            users={props.users}
                            mapSectors={props.mapSectors}
                            resolveName={resolveName}
                        />
                    )}

                    {activeTab === 'erp' && hasPermission('perm_tab_erp') && (
                        <ERPBlockageTab 
                            currentUser={props.currentUser}
                            currentUserRole={props.currentUserRole}
                            parts={props.parts}
                            blockages={props.erpBlockages}
                            resolveName={resolveName}
                            hasPermission={hasPermission}
                        />
                    )}

                    {activeTab === 'analytics' && hasPermission('perm_tab_analytics') && (
                        <AnalyticsTab 
                            systemConfig={props.systemConfig}
                            currentUser={props.currentUser}
                            currentUserRole={props.currentUserRole}
                            hasPermission={hasPermission}
                        />
                    )}

                    {activeTab === 'settings' && hasPermission('perm_tab_settings') && (
                        <SettingsTab 
                            currentUser={props.currentUser}
                            currentUserRole={props.currentUserRole}
                            installPrompt={props.installPrompt}
                            onInstallApp={props.onInstallApp}
                            systemConfig={props.systemConfig}
                            onUpdateSystemConfig={props.onUpdateSystemConfig}
                            onUpdateAdminKey={props.onUpdateAdminKey}
                            onToggleAdminLock={props.onToggleAdminLock}
                        />
                    )}

                    {activeTab === 'permissions' && hasPermission('perm_tab_permissions') && (
                        <PermissionsTab 
                            roles={props.roles}
                            onAddRole={props.onAddRole}
                            onDeleteRole={props.onDeleteRole}
                            onUpdatePermission={props.onUpdatePermission}
                            onVerifyAdminPassword={props.onVerifyAdminPassword}
                        />
                    )}
                </div>
            </main>

            {/* --- SYSTEM TOAST NOTIFICATIONS OVERLAY --- */}
            <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={toast.id} 
                        className="pointer-events-auto bg-slate-900 border-2 border-teal-500/30 backdrop-blur-xl p-4 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex items-start gap-3.5 animate-slide-in relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-2 h-full bg-teal-500" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] uppercase font-black text-teal-400 tracking-wider">
                                {language === 'sk' ? 'Pridaná nová úloha' : 'New Task Added'}
                            </p>
                            <p className="text-base font-mono font-black text-white truncate mt-1">
                                {toast.partNumber}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] uppercase font-bold text-slate-500">
                                    {language === 'sk' ? 'Pozícia:' : 'Location:'}
                                </span>
                                <span className="text-xs font-black text-slate-200">
                                    {toast.workplace || '-'}
                                </span>
                                {toast.priority && toast.priority !== 'NORMAL' && (
                                    <span className="text-[9px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded uppercase">
                                        {toast.priority}
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">
                                {language === 'sk' ? `Vytvoril: ${resolveName(toast.createdBy)}` : `By: ${resolveName(toast.createdBy)}`}
                            </p>
                        </div>
                        <button 
                            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} 
                            className="text-slate-500 hover:text-white transition-colors p-1"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PartSearchScreen;